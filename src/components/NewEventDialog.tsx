
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { iconMap, eventColors, ScheduleItem } from '@/lib/types';
import { format, addMinutes } from 'date-fns';
import { addScheduleItem } from '@/lib/client-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewEventDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  eventData: {
    date: Date;
    startTime: string;
  };
}

const calculateEndTime = (startTime: string, duration: number): string => {
  if (!startTime) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  const endDate = addMinutes(startDate, duration);
  return format(endDate, 'HH:mm');
};

export default function NewEventDialog({
  isOpen,
  onOpenChange,
  eventData,
}: NewEventDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60); // Default duration 60 minutes
  const [icon, setIcon] = useState('Default');
  const [color, setColor] = useState(eventColors[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form on open
      setTitle('');
      setDescription('');
      setDuration(60);
      setIcon('Default');
      setColor(eventColors[0]);
      setIsLoading(false);
    }
  }, [isOpen]);
  
  const IconKeys = Object.keys(iconMap).filter(key => key !== 'Default');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title is required',
      });
      return;
    }
    setIsLoading(true);

    const newEvent: Omit<ScheduleItem, 'id'> = {
      title,
      description,
      date: format(eventData.date, 'yyyy-MM-dd'),
      startTime: eventData.startTime,
      duration,
      endTime: calculateEndTime(eventData.startTime, duration),
      icon,
      color,
      type: 'event',
    };

    try {
      await addScheduleItem(newEvent);
      toast({
        title: 'Event Created',
        description: `"${title}" has been added to your schedule.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create event:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create event. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Meeting"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Discuss project milestones"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input value={format(eventData.date, 'PPP')} disabled />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input value={eventData.startTime} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10) || 0)}
                  min="15"
                  step="15"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select value={icon} onValueChange={setIcon} disabled={isLoading}>
                  <SelectTrigger id="icon">
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {IconKeys.map((key) => {
                      const IconComponent = iconMap[key];
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="size-4" />
                            {key}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {eventColors.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant="outline"
                    className={cn(
                      'size-8 rounded-full p-0 border-2',
                      color === c && 'border-ring'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
