
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
import { Loader2, AlignLeft, Users, MapPin, Clock, Video, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface NewEventDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  eventData: {
    date: Date;
    startTime: string;
  } | null;
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
  const [duration, setDuration] = useState(60);
  const [icon, setIcon] = useState('Default');
  const [color, setColor] = useState(eventColors[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);

  const [startTime, setStartTime] = useState(eventData?.startTime ?? '00:00');
  const [endTime, setEndTime] = useState(calculateEndTime(startTime, duration));

  useEffect(() => {
    if (isOpen && eventData) {
      // Reset form state every time the dialog opens
      setTitle('');
      setDescription('');
      setDuration(60);
      setIcon('Default');
      setColor(eventColors[0]);
      setIsLoading(false);
      setIsAllDay(false);
      setStartTime(eventData.startTime);
    }
  }, [isOpen, eventData]);

  useEffect(() => {
    if (!isAllDay) {
        setEndTime(calculateEndTime(startTime, duration));
    } else {
        setEndTime('23:59');
    }
  }, [startTime, duration, isAllDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventData) {
      toast({
        variant: 'destructive',
        title: 'Title is required',
      });
      return;
    }
    setIsLoading(true);

    const finalStartTime = isAllDay ? '00:00' : startTime;
    const finalDuration = isAllDay ? 24 * 60 - 1 : duration;
    const finalEndTime = isAllDay ? '23:59' : calculateEndTime(startTime, duration);

    const newEvent: Omit<ScheduleItem, 'id'> = {
      title,
      description,
      date: format(eventData.date, 'yyyy-MM-dd'),
      startTime: finalStartTime,
      endTime: finalEndTime,
      duration: finalDuration,
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
      // The isLoading state will be reset by the useEffect when the dialog is re-opened
    }
  };
  
  if (!eventData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="sr-only">New Event</DialogTitle>
           <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Добавьте название"
                className="text-2xl border-none shadow-none focus-visible:ring-0 h-auto"
                disabled={isLoading}
            />
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6">
            <div className="pl-2">
                 <Tabs defaultValue="event" className="w-full">
                    <TabsList>
                        <TabsTrigger value="event">Мероприятие</TabsTrigger>
                        <TabsTrigger value="task" disabled>Задача</TabsTrigger>
                        <TabsTrigger value="appointment" disabled>Расписание встреч</TabsTrigger>
                    </TabsList>
                 </Tabs>
            </div>
          </div>
          <div className="px-6 pb-6 space-y-4 pt-4">
            <div className="flex items-center gap-4">
                <Clock className="size-5 text-muted-foreground" />
                <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">{format(eventData.date, 'eeee, d MMMM')}</span>
                    {!isAllDay && (
                        <>
                            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-28" />
                            <span>-</span>
                            <Input type="time" value={endTime} disabled className="w-28" />
                            <Select value={String(duration)} onValueChange={(value) => setDuration(Number(value))}>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Duration" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="45">45 min</SelectItem>
                                <SelectItem value="60">1 hour</SelectItem>
                                <SelectItem value="90">1.5 hours</SelectItem>
                                <SelectItem value="120">2 hours</SelectItem>
                              </SelectContent>
                            </Select>
                        </>
                    )}
                     <div className="flex-1"></div>
                    <div className="flex items-center space-x-2">
                        <Switch id="all-day" checked={isAllDay} onCheckedChange={setIsAllDay} />
                        <Label htmlFor="all-day">Весь день</Label>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Users className="size-5 text-muted-foreground" />
                <Input placeholder="Добавьте гостей" className="border-none shadow-none focus-visible:ring-0" />
            </div>
            <div className="flex items-center gap-4">
                <Video className="size-5 text-muted-foreground" />
                <Button variant="outline" type="button" className="text-blue-500 border-blue-200 hover:bg-blue-50">Добавить видеоконференцию Google Meet</Button>
            </div>
            <div className="flex items-center gap-4">
                <MapPin className="size-5 text-muted-foreground" />
                <Input placeholder="Добавить местоположение" className="border-none shadow-none focus-visible:ring-0" />
            </div>
            <div className="flex items-start gap-4">
                <AlignLeft className="size-5 text-muted-foreground mt-2" />
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Добавить описание или файл с Google Диска"
                    className="border-none shadow-none focus-visible:ring-0 min-h-[60px]"
                    disabled={isLoading}
                />
            </div>
            <div className="flex items-center gap-4">
                <Bell className="size-5 text-muted-foreground" />
                 <Select defaultValue="30">
                    <SelectTrigger className="w-[180px] border-none shadow-none focus-visible:ring-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">За 10 минут</SelectItem>
                        <SelectItem value="30">За 30 минут</SelectItem>
                        <SelectItem value="60">За 1 час</SelectItem>
                    </SelectContent>
                </Select>
                 <Button variant="link" type="button" className="p-0 h-auto">Добавить уведомление</Button>
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
             <div className="space-y-2">
              <Label>Icon</Label>
                <Select value={icon} onValueChange={setIcon}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Icon" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(iconMap).map((iconName) => (
                            <SelectItem key={iconName} value={iconName}>
                                {iconName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter className="bg-muted p-4 flex justify-between w-full">
            <Button type="button" variant="ghost" disabled={isLoading}>
                Другие параметры
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
