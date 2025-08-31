"use client";

import { ChevronLeft, ChevronRight, PlusCircle, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import QuickCapture from "./QuickCapture";
import SmartScheduler from "./SmartScheduler";
import { useState, useEffect } from "react";

export default function Header() {
  const [isQuickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [isSmartSchedulerOpen, setSmartSchedulerOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-xl font-semibold">Today</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            {currentDate}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
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
