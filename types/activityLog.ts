export interface ActivityLogEntry {
  icon: string;
  message: string;
  detail?: string;
  elapsed: number;
  data?: Record<string, unknown>;
}

export interface ActivityLogStreamEvent {
  type: "log" | "result" | "error";
  entry?: ActivityLogEntry;
  data?: unknown;
  error?: string;
}
