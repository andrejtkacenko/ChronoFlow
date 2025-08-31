
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { iconMap } from '@/lib/types';
import { Hexagon } from 'lucide-react';

interface Task {
  id: string;
  label: string;
  completed: boolean;
}

interface NewEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  startTime: string;
  onSubmit: (duration: number, icon: string, color: string) => void;
}

const durationOptions = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const colorOptions = [
    { value: 'hsl(var(--primary))', label: 'Primary' },
    { value: 'hsl(210 40% 96.1%)', label: 'Accent' },
    { value: 'hsl(0 84.2% 60.2%)', label: 'Destructive' },
    { value: 'hsl(var(--chart-1))', label: 'Chart 1' },
    { value: 'hsl(var(--chart-2))', label: 'Chart 2' },
]

export default function NewEventDialog({
  isOpen,
  onClose,
  task,
  startTime,
  onSubmit,
}: NewEventDialogProps) {
  const [duration, setDuration] = useState(60);
  const [icon, setIcon] = useState('Default');
  const [color, setColor] = useState(colorOptions[0].value);

  const handleSubmit = () => {
    onSubmit(duration, icon, color);
    onClose();
  };

  const IconKeys = Object.keys(iconMap);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule New Event</DialogTitle>
          <DialogDescription>
            You are scheduling the task: <strong>{task.label}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start Time
            </Label>
            <Input id="startTime" value={startTime} className="col-span-3" disabled />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              Duration
            </Label>
            <Select onValueChange={(value) => setDuration(Number(value))} defaultValue={String(duration)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="icon" className="text-right">
              Icon
            </Label>
            <Select onValueChange={setIcon} defaultValue={icon}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select icon" />
              </SelectTrigger>
              <SelectContent>
                {IconKeys.map((iconKey) => {
                    const IconComponent = iconMap[iconKey];
                    return(
                        <SelectItem key={iconKey} value={iconKey}>
                            <div className='flex items-center gap-2'>
                                <IconComponent className='size-4' />
                                <span>{iconKey}</span>
                            </div>
                        </SelectItem>
                    )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <Select onValueChange={setColor} defaultValue={color}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                         <div className='flex items-center gap-2'>
                            <Hexagon className='size-4' style={{color: option.value}} />
                            <span>{option.label}</span>
                        </div>
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
