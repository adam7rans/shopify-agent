import type { AgentUiResponse } from "@/types/agentUi";

export type ShellMode = "user" | "diagnostics";

export interface StarterPromptGroup {
  id: string;
  label: string;
  description: string;
  prompts: string[];
  accent: "sales" | "inventory" | "operations" | "help";
}

export interface ConversationTurn {
  id: string;
  prompt: string;
  result: AgentUiResponse | null;
  error: string | null;
  isLoading: boolean;
}
