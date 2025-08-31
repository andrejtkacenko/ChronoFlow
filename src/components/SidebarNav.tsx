import {
  Calendar,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import ChronoFlowLogo from "./ChronoFlowLogo";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SidebarNav() {
  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <ChronoFlowLogo className="size-8 text-primary" />
          <span className="text-lg font-semibold">ChronoFlow</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Dashboard" isActive>
              <LayoutDashboard />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Calendar">
              <Calendar />
              <span>Calendar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Inbox">
              <Inbox />
              <span>Inbox</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Projects">
              <FolderKanban />
              <span>Projects</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://picsum.photos/100/100" data-ai-hint="person avatar" alt="User Avatar" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-semibold">User Name</p>
            <p className="truncate text-xs text-muted-foreground">user@chronoflow.app</p>
          </div>
          <Settings className="size-5 text-muted-foreground transition-colors hover:text-foreground" />
        </div>
      </SidebarFooter>
    </>
  );
}
