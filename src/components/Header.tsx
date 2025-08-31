
"use client";

import { ChevronLeft, ChevronRight, Sparkles, LogOut, Menu, X, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartScheduler from "./SmartScheduler";
import { useState } from "react";
import { format } from 'date-fns';
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ChronoFlowLogo from "./ChronoFlowLogo";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils";


const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/schedule', label: 'Schedule' },
    { href: '/calendar', label: 'Calendar' },
    { href: '#', label: 'Inbox' },
    { href: '#', label: 'Projects' },
]

interface HeaderProps {
  currentDate?: Date;
  onPrevious?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  showDateNav?: boolean;
  isRightSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
}

export default function Header({ 
  currentDate = new Date(), 
  onPrevious, 
  onNext,
  onToday,
  showDateNav = false,
  isRightSidebarOpen,
  onToggleRightSidebar,
}: HeaderProps) {
  const [isSmartSchedulerOpen, setSmartSchedulerOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, logout } = useAuth();
  const pathname = usePathname();
  
  const formattedDate = format(currentDate, "MMMM d, yyyy");

  const NavLinks = ({isMobile = false}: {isMobile?: boolean}) => (
    <nav className={cn("items-center gap-2", isMobile ? "flex flex-col space-y-2 mt-4" : "hidden md:flex")}>
        {navLinks.map(link => (
            <Button 
              key={`${link.href}-${link.label}`}
              asChild
              variant={pathname === link.href ? "secondary" : "ghost"}
              className={cn(isMobile && "w-full")}
              onClick={() => isMobile && setMobileMenuOpen(false)}
            >
                <Link href={link.href}>{link.label}</Link>
            </Button>
        ))}
    </nav>
  )

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/" className="flex items-center gap-2 mr-4">
            <ChronoFlowLogo className="size-8 text-primary" />
            <span className="text-lg font-semibold hidden sm:inline-block">ChronoFlow</span>
        </Link>
        
        <NavLinks />

        {showDateNav && (
            <div className="flex items-center gap-4 mx-auto">
                <Button variant="outline" size="sm" onClick={onToday}>
                Today
                </Button>
                <span className="text-md w-36 text-center font-semibold">{formattedDate}</span>
            </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSmartSchedulerOpen(true)}
            aria-label="Smart Scheduler"
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </Button>
          {showDateNav && onToggleRightSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleRightSidebar}
              aria-label="Toggle Right Sidebar"
            >
              <PanelRightOpen className={cn("h-5 w-5", isRightSidebarOpen && "text-primary")} />
            </Button>
          )}
           {user && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL ?? "https://picsum.photos/100/100"} data-ai-hint="person avatar" alt="User Avatar" />
                            <AvatarFallback>{user.email?.[0].toUpperCase() ?? 'U'}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.displayName ?? "User Name"}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
           )}
            <Button 
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            >
                {isMobileMenuOpen ? <X/> : <Menu />}
                <span className="sr-only">Toggle menu</span>
            </Button>
        </div>
        {isMobileMenuOpen && (
            <div className="absolute top-16 left-0 w-full bg-background/95 backdrop-blur-sm p-4 border-b md:hidden">
                <NavLinks isMobile />
            </div>
        )}
      </header>
      <SmartScheduler open={isSmartSchedulerOpen} onOpenChange={setSmartSchedulerOpen} />
    </>
  );
}
