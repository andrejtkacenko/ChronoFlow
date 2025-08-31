"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getSuggestedTimeSlots } from "@/lib/actions";
import { Loader2, Sparkles } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface SmartSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SmartScheduler({ open, onOpenChange }: SmartSchedulerProps) {
  const [tasks, setTasks] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFindTime = async () => {
    if (!tasks.trim()) return;
    setIsLoading(true);
    setSuggestions("");
    try {
      const result = await getSuggestedTimeSlots(tasks);
      if (result.startsWith("Sorry")) {
         toast({
          variant: "destructive",
          title: "AI Suggestion Error",
          description: result,
        });
        setSuggestions("");
      } else {
        setSuggestions(result);
      }
    } catch (error) {
       toast({
        variant: "destructive",
        title: "An unexpected error occurred.",
        description: "Please try again later.",
      });
      setSuggestions("");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset state on close
        setTasks("");
        setSuggestions("");
        setIsLoading(false);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Scheduler
          </DialogTitle>
          <DialogDescription>
            List new tasks and their estimated durations. I'll find the best time slots in your schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tasks-input">New Tasks</Label>
            <Textarea
              id="tasks-input"
              value={tasks}
              onChange={(e) => setTasks(e.target.value)}
              placeholder="- Design new logo (2 hours)&#10;- Prepare presentation for Friday (1.5 hours)"
              rows={4}
            />
          </div>

          {isLoading && (
            <div className="flex items-center justify-center rounded-md border border-dashed p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {suggestions && !isLoading && (
            <div className="grid gap-2">
              <Label>Suggested Times</Label>
              <ScrollArea className="h-40 w-full rounded-md border bg-secondary/50 p-4">
                <pre className="whitespace-pre-wrap text-sm text-foreground">
                  <code>{suggestions}</code>
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleFindTime} disabled={isLoading || !tasks.trim()} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finding time...
              </>
            ) : (
              "Find Time"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
