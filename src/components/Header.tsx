"use client";

import { ChevronLeft, ChevronRight, PlusCircle, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import QuickCapture from "./QuickCapture";
import SmartScheduler from "./SmartScheduler";
import { useState } from "react";
import { format } from 'date-fns';

interface HeaderProps {
  currentDate?: Date;
  onPrevious?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  showTodayButton?: boolean;
}

export default function Header({ 
  currentDate = new Date(), 
  onPrevious, 
  onNext,
  onToday,
  showTodayButton = false,
}: HeaderProps) {
  const [isQuickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [isSmartSchedulerOpen, setSmartSchedulerOpen] = useState(false);
  
  const formattedDate = format(currentDate, "MMMM d, yyyy");

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <SidebarTrigger className="md:hidden" />
        <div className="flex items-center gap-2">
           {showTodayButton && (
             <Button variant="outline" size="sm" onClick={onToday}>
              Today
            </Button>
           )}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrevious} aria-label="Previous Day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-md w-36 text-center font-semibold">{formattedDate}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext} aria-label="Next Day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSmartSchedulerOpen(true)}
            aria-label="Smart Scheduler"
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </Button>
          <Button onClick={() => setQuickCaptureOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Quick Capture
          </Button>
        </div>
      </header>
      <QuickCapture open={isQuickCaptureOpen} onOpenChange={setQuickCaptureOpen} />
      <SmartScheduler open={isSmartSchedulerOpen} onOpenChange={setSmartSchedulerOpen} />
    </>
  );
}
