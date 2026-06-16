import { runAgentLoop } from "@/lib/agent/agentLoop";
import { hasAgentConfig } from "@/lib/agent/config";
import type { ActivityLogEntry, ActivityLogStreamEvent } from "@/types/activityLog";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() ?? "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(event: ActivityLogStreamEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      function onLog(entry: ActivityLogEntry) {
        sendEvent({ type: "log", entry });
      }

      try {
        if (!prompt) {
          sendEvent({
            type: "error",
            error:
              "Ask Kandwii a store question to start the agent loop.",
          });
          return;
        }

        if (!hasAgentConfig()) {
          sendEvent({
            type: "error",
            error:
              "Kandwii needs OPENAI_API_KEY configured because this build now runs fully through the agent loop.",
          });
          return;
        }

        const result = await runAgentLoop(prompt, onLog);
        sendEvent({ type: "result", data: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Agent loop failed";
        sendEvent({
          type: "log",
          entry: {
            icon: "⚠️",
            message: "Agent loop failed before completing the response",
            detail: message,
            elapsed: 0,
          },
        });
        sendEvent({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
