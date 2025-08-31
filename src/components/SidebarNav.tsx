
'use client';

import {
  Calendar,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Settings,
  Clock,
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
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";

export default function SidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

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
            <Link href="/" passHref>
              <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === '/'}>
                <div>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </div>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/schedule" passHref>
              <SidebarMenuButton asChild tooltip="Schedule" isActive={pathname === '/schedule'}>
                <div>
                  <Clock />
                  <span>Schedule</span>
                </div>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/calendar" passHref>
              <SidebarMenuButton asChild tooltip="Calendar" isActive={pathname === '/calendar'}>
                <div>
                  <Calendar />
                  <span>Calendar</span>
                </div>
              </SidebarMenuButton>
            </Link>
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
        {user ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.photoURL ?? "https://picsum.photos/100/100"} data-ai-hint="person avatar" alt="User Avatar" />
              <AvatarFallback>{user.email?.[0].toUpperCase() ?? 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold">{user.displayName ?? 'User Name'}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
              <LogOut className="size-5 text-muted-foreground transition-colors hover:text-foreground" />
            </Button>
          </div>
        ) : (
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
        )}
      </SidebarFooter>
    </>
  );
}
