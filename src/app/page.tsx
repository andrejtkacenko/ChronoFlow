import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import SidebarNav from "@/components/SidebarNav";
import Header from "@/components/Header";
import DailyOverview from "@/components/DailyOverview";

export default function Home() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <div className="flex h-svh flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <DailyOverview />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
