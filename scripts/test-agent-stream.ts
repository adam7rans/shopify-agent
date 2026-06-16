export {};

const baseUrl = process.env.AGENT_TEST_BASE_URL ?? "http://localhost:3000";

interface StreamEvent {
  type?: "log" | "result" | "error";
  entry?: {
    message?: string;
  };
  data?: {
    answer?: {
      title?: string;
      body?: string;
    };
    toolTrace?: unknown[];
  };
  error?: string;
}

async function run() {
  const response = await fetch(`${baseUrl}/api/agent/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: "Which candy is performing best?" }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming route failed with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: StreamEvent[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith("data: ")) continue;
      events.push(JSON.parse(line.slice(6)) as StreamEvent);
    }
  }

  const firstResultIndex = events.findIndex((event) => event.type === "result");
  const logCountBeforeResult =
    firstResultIndex >= 0
      ? events.slice(0, firstResultIndex).filter((event) => event.type === "log").length
      : 0;
  const result = events.find((event) => event.type === "result")?.data;
  const error = events.find((event) => event.type === "error")?.error;

  if (error) {
    throw new Error(`Streaming route emitted error: ${error}`);
  }

  const hasAnswer = Boolean(result?.answer?.title && result?.answer?.body);
  const hasTrace = Boolean(result?.toolTrace && result.toolTrace.length > 0);

  if (firstResultIndex < 0 || logCountBeforeResult === 0 || !hasAnswer || !hasTrace) {
    throw new Error(
      `Unexpected stream shape: resultIndex=${firstResultIndex} logsBeforeResult=${logCountBeforeResult} answer=${hasAnswer} trace=${hasTrace}`,
    );
  }

  console.log(
    `PASS stream route: ${logCountBeforeResult} log event(s) arrived before the final result.`,
  );
}

void run().catch((error) => {
  console.error(
    `Agent stream smoke test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
  process.exit(1);
});
