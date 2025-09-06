
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
import { Loader2, Sparkles, PlusCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { SuggestedSlot } from "@/ai/flows/schema";
import { Card, CardContent } from "@/components/ui/card";
import { addScheduleItem } from "@/lib/client-actions";
import { useAuth } from "@/hooks/use-auth";

interface SmartSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SmartScheduler({ open, onOpenChange }: SmartSchedulerProps) {
  const [tasks, setTasks] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFindTime = async () => {
    if (!tasks.trim() || !user) return;
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await getSuggestedTimeSlots(tasks, user.uid);
      if (typeof result === 'string') {
         toast({
          variant: "destructive",
          title: "Suggestion Error",
          description: result,
        });
        setSuggestions([]);
      } else {
        setSuggestions(result);
      }
    } catch (error) {
       toast({
        variant: "destructive",
        title: "An unexpected error occurred.",
        description: "Please try again later.",
      });
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset state on close
        setTasks("");
        setSuggestions([]);
        setIsLoading(false);
    }
    onOpenChange(isOpen);
  }

  const handleAddEvent = async (slot: SuggestedSlot) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
    }
    try {
        await addScheduleItem({
            userId: user.uid,
            title: slot.task,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            type: 'event',
            icon: 'BrainCircuit', // Default icon for AI-scheduled tasks
            color: 'hsl(262.1 83.3% 57.8%)', // Default color
        });
        toast({
            title: 'Event Added',
            description: `"${slot.task}" has been added to your calendar.`
        });
        
        // Remove the suggestion from the list
        setSuggestions(prev => prev.filter(s => s !== slot));

    } catch (error) {
        console.error(error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to add event to calendar.'
        });
    }
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
            List new tasks and their estimated durations. The assistant will find the best time slots in your schedule.
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
              disabled={isLoading || suggestions.length > 0}
            />
          </div>

          {isLoading && (
            <div className="flex items-center justify-center rounded-md border border-dashed p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {suggestions.length > 0 && !isLoading && (
            <div className="grid gap-2">
              <Label>Suggested Times</Label>
              <ScrollArea className="h-48 w-full">
                <div className="space-y-2 pr-4">
                    {suggestions.map((slot, index) => (
                        <Card key={index} className="bg-secondary/50">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{slot.task}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(slot.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => handleAddEvent(slot)}>
                                    <PlusCircle className="h-5 w-5 text-primary" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleFindTime} disabled={isLoading || !tasks.trim() || suggestions.length > 0} className="w-full">
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
