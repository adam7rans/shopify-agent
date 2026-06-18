import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AppShell conversationId={id} />;
}
