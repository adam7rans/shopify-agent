import { BestSellersShell } from "@/components/layout/best-sellers-shell";
import { getHybridOpsBadge, getShopifyModeBadge } from "@/lib/shopify";

interface AppShellProps {
  conversationId?: string;
}

export function AppShell({ conversationId }: AppShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden p-4 md:p-6">
      <BestSellersShell
        storeModeLabel={getShopifyModeBadge()}
        opsModeLabel={getHybridOpsBadge()}
        conversationId={conversationId}
      />
    </main>
  );
}
