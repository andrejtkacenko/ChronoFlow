"use client";

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

interface QuickCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickCapture({ open, onOpenChange }: QuickCaptureProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="submit" className="w-full">Add to Inbox</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
