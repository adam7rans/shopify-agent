const baseUrl = process.env.AGENT_TEST_BASE_URL ?? "http://localhost:3000";

const flowExpectations = [
  {
    prompt: "What were our best-selling candies last month?",
    expectedKind: "best_sellers",
  },
  {
    prompt: "Do we need to reorder sour candy?",
    expectedKind: "sour_reorder",
  },
  {
    prompt: "Show me warehouse issues globally.",
    expectedKind: "warehouse_health",
  },
  {
    prompt: "Can you design a new homepage?",
    expectedKind: "unsupported",
  },
] as const;

interface AgentResponse {
  kind?: string;
  answer?: {
    title?: string;
    body?: string;
  };
  toolTrace?: Array<{
    toolName?: string;
  }>;
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
    const passed = response.ok && kindMatches && hasAnswer && hasTrace;

    if (!passed) {
      failureCount += 1;
      console.error(
        `FAIL ${expectation.expectedKind}: status=${response.status} kind=${payload?.kind ?? "missing"} answer=${hasAnswer} trace=${hasTrace}`,
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
