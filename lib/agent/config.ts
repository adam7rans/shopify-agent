export function hasAgentConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}
