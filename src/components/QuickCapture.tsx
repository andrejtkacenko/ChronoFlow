"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addTask } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface QuickCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickCapture({ open, onOpenChange }: QuickCaptureProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddTask = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      await addTask(input);
      toast({
        title: "Task Added",
        description: "The new task has been added to your inbox.",
      });
      setInput("");
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add the task.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        setInput("");
        setIsLoading(false);
    }
    onOpenChange(isOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Quick Capture</SheetTitle>
          <SheetDescription>
            Jot down a task, event, or note. We'll sort it out later.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="capture-input">What's on your mind?</Label>
            <Textarea
              id="capture-input"
              placeholder="e.g. Schedule a dentist appointment for next week"
              rows={5}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={handleAddTask} disabled={isLoading || !input.trim()} className="w-full">
            {isLoading ? <Loader2 className="animate-spin" /> : "Add to Inbox"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
