export {};

const baseUrl = process.env.AGENT_TEST_BASE_URL ?? "http://localhost:3000";

interface FlowExpectation {
  prompt: string;
  expectedKind: string;
  requiredTableType?: string;
  requiresSuggestions?: boolean;
  requiresStructuredDetail?: boolean;
}

const flowExpectations: FlowExpectation[] = [
  {
    prompt: "What were our best-selling candies last month?",
    expectedKind: "best_sellers",
    requiredTableType: "product_table",
  },
  {
    prompt: "What does our inventory look like?",
    expectedKind: "inventory_overview",
    requiredTableType: "inventory_table",
  },
  {
    prompt: "Do we need to reorder sour candy?",
    expectedKind: "sour_reorder",
    requiresStructuredDetail: true,
  },
  {
    prompt: "Show me warehouse issues globally.",
    expectedKind: "warehouse_health",
    requiresStructuredDetail: true,
  },
  {
    prompt: "What is this app for?",
    expectedKind: "general",
    requiresSuggestions: true,
  },
  {
    prompt: "Can you design a new homepage?",
    expectedKind: "unsupported",
    requiresSuggestions: true,
  },
];

interface AgentResponse {
  kind?: string;
  answer?: {
    title?: string;
    body?: string;
  };
  toolTrace?: Array<{
    toolName?: string;
  }>;
  primaryCards?: Array<{
    type?: string;
  }>;
  secondaryCards?: Array<{
    type?: string;
  }>;
  tables?: Array<{
    type?: string;
  }>;
  suggestedPrompts?: string[];
}

async function run() {
  let failureCount = 0;

  for (const expectation of flowExpectations) {
    const response = await fetch(`${baseUrl}/api/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: expectation.prompt }),
    });

    let payload: AgentResponse | null;
    try {
      payload = (await response.json()) as AgentResponse;
    } catch {
      payload = null;
    }

    const hasAnswer = Boolean(payload?.answer?.title && payload?.answer?.body);
    const hasTrace = Boolean(payload?.toolTrace && payload.toolTrace.length > 0);
    const kindMatches = payload?.kind === expectation.expectedKind;
    const hasRequiredTable = expectation.requiredTableType
      ? Boolean(payload?.tables?.some((table) => table.type === expectation.requiredTableType))
      : true;
    const hasSuggestions = expectation.requiresSuggestions
      ? Boolean(payload?.suggestedPrompts && payload.suggestedPrompts.length > 0)
      : true;
    const hasStructuredDetail = expectation.requiresStructuredDetail
      ? Boolean(
          (payload?.tables && payload.tables.length > 0) ||
            (payload?.primaryCards && payload.primaryCards.length > 0) ||
            (payload?.secondaryCards && payload.secondaryCards.length > 0),
        )
      : true;
    const passed =
      response.ok &&
      kindMatches &&
      hasAnswer &&
      hasTrace &&
      hasRequiredTable &&
      hasSuggestions &&
      hasStructuredDetail;

    if (!passed) {
      failureCount += 1;
      console.error(
        `FAIL ${expectation.expectedKind}: status=${response.status} kind=${payload?.kind ?? "missing"} answer=${hasAnswer} trace=${hasTrace} table=${hasRequiredTable} suggestions=${hasSuggestions} detail=${hasStructuredDetail}`,
      );
      continue;
    }

    console.log(`PASS ${expectation.expectedKind}`);
  }

  if (failureCount > 0) {
    process.exit(1);
  }

  console.log(`All ${flowExpectations.length} agent flow checks passed.`);
}

void run().catch((error) => {
  console.error(
    `Agent flow smoke test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
  process.exit(1);
});
