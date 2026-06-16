export interface ActivityLogEntry {
  icon: string;
  message: string;
  detail?: string;
  elapsed: number;
}

export interface ActivityLogStreamEvent {
  type: "log" | "result" | "error";
  entry?: ActivityLogEntry;
  data?: unknown;
  error?: string;
}
