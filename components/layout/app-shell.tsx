import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { BestSellersShell } from "@/components/layout/best-sellers-shell";

export function AppShell() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1820px] gap-4 lg:gap-6">
        <DashboardSidebar />
        <section className="min-w-0 flex-1">
          <BestSellersShell />
        </section>
      </div>
    </main>
  );
}
