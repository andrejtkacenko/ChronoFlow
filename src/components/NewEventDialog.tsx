
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
import { format, addMinutes, parse } from 'date-fns';
import { addScheduleItem, updateScheduleItem, deleteScheduleItem } from '@/lib/client-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlignLeft, Users, MapPin, Clock, Video, Bell, Palette, Aperture, Trash2, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import SmartScheduler from './SmartScheduler';

interface NewEventDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  newEventTime: { date: Date; startTime: string; } | null;
  existingEvent: ScheduleItem | null;
  isNewTask: boolean;
  userId: string;
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
  newEventTime,
  existingEvent,
  isNewTask,
  userId,
}: NewEventDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [icon, setIcon] = useState('Default');
  const [color, setColor] = useState(eventColors[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [itemType, setItemType] = useState<'event' | 'task'>('event');

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isSmartSchedulerOpen, setIsSmartSchedulerOpen] = useState(false);

  const isEditing = !!existingEvent;

  useEffect(() => {
    if (isOpen) {
      if (existingEvent) { // Edit mode
        setItemType(existingEvent.type);
        setTitle(existingEvent.title);
        setDescription(existingEvent.description ?? '');
        setDuration(existingEvent.duration ?? 60);
        setIcon(existingEvent.icon ?? 'Default');
        setColor(existingEvent.color ?? eventColors[0]);
        setDate(existingEvent.date ? parse(existingEvent.date, 'yyyy-MM-dd', new Date()) : undefined);
        setStartTime(existingEvent.startTime ?? '09:00');
        if (existingEvent.startTime === '00:00' && existingEvent.endTime === '23:59') {
          setIsAllDay(true);
        } else {
          setIsAllDay(false);
        }
      } else if (newEventTime) { // Create event from grid
        setItemType('event');
        setTitle('');
        setDescription('');
        setDuration(60);
        setIcon('Default');
        setColor(eventColors[0]);
        setDate(newEventTime.date);
        setStartTime(newEventTime.startTime);
        setIsAllDay(false);
      } else if (isNewTask) { // Create task from Inbox
        setItemType('task');
        setTitle('');
        setDescription('');
        setDuration(60);
        setIcon('BrainCircuit');
        setColor(eventColors[1]);
        setDate(undefined);
        setStartTime('09:00');
        setIsAllDay(false);
      }
      setIsLoading(false);
    }
  }, [isOpen, existingEvent, newEventTime, isNewTask]);

  useEffect(() => {
    if (!date) {
        setEndTime('');
        return;
    }
    if (!isAllDay) {
        setEndTime(calculateEndTime(startTime, duration));
    } else {
        setEndTime('23:59');
    }
  }, [startTime, duration, isAllDay, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    setIsLoading(true);

    let finalStartTime: string | null = startTime;
    let finalDuration: number | null = duration;
    let finalEndTime: string | null = endTime;
    let finalDate: string | null = date ? format(date, 'yyyy-MM-dd') : null;

    if (!date) { // Unscheduled task
      finalStartTime = null;
      finalEndTime = null;
      finalDuration = null;
      finalDate = null;
    } else if (isAllDay) {
        finalStartTime = '00:00';
        finalDuration = 24 * 60 -1;
        finalEndTime = '23:59';
    }


    const eventData = {
      title,
      description,
      date: finalDate,
      startTime: finalStartTime,
      endTime: finalEndTime,
      duration: finalDuration,
      icon,
      color,
      type: itemType,
      completed: existingEvent?.completed ?? false,
    };

    try {
      if (isEditing) {
        await updateScheduleItem(existingEvent.id, eventData);
        toast({ title: 'Item Updated', description: `"${title}" has been updated.` });
      } else {
        await addScheduleItem({ ...eventData, userId });
        toast({ title: 'Item Created', description: `"${title}" has been added.` });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save item:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save item.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEvent) return;
    setIsLoading(true);
    try {
      await deleteScheduleItem(existingEvent.id);
      toast({ title: 'Item Deleted', description: `"${existingEvent.title}" has been removed.` });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete item.' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleScheduleWithAI = () => {
    // This will just close the current dialog and open the smart scheduler
    // We pass the task title to the smart scheduler
    onOpenChange(false); // Close current dialog
    // A bit of a hack: use a timeout to ensure the main smart scheduler opens
    setTimeout(() => {
        document.getElementById('smart-scheduler-trigger')?.click();
        // And maybe populate the textarea
        const textarea = document.getElementById('tasks-input') as HTMLTextAreaElement;
        if (textarea) {
            textarea.value = `${title} (${duration/60} hours)`;
        }
    }, 100);
  }

  const handleDateSelect = (selectedDate?: Date) => {
    setDate(selectedDate);
    if (selectedDate && !isEditing) { // If it's a new item, set a default time
        setStartTime('09:00');
    }
  }
  
  if (!isOpen) return null;

  const inputStyles = "border-0 border-b border-transparent focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-none px-0";
  const isScheduled = !!date;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !isSmartSchedulerOpen && onOpenChange(open)}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-2">
           <DialogTitle className="sr-only">{isEditing ? `Edit ${itemType}` : `Create ${itemType}`}</DialogTitle>
           <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Добавьте название"
                className="text-2xl font-semibold border-none shadow-none focus-visible:ring-0 h-auto p-0"
                disabled={isLoading}
            />
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-6 space-y-4">
            <div className="pl-0">
                 <Tabs 
                    value={itemType} 
                    onValueChange={(value) => setItemType(value as 'event' | 'task')}
                    className="w-full"
                  >
                    <TabsList>
                        <TabsTrigger value="event">Мероприятие</TabsTrigger>
                        <TabsTrigger value="task">Задача</TabsTrigger>
                    </TabsList>
                 </Tabs>
            </div>

            <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                    <Clock className="size-5 text-muted-foreground" />
                    {isScheduled ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="px-2 py-1 h-auto text-sm font-medium">{format(date!, 'eeee, d MMMM')}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                                </PopoverContent>
                            </Popover>
                            {!isAllDay && (
                                <div className='flex items-center gap-2'>
                                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-28" />
                                    <span>-</span>
                                    <Input type="time" value={endTime} disabled className="w-28 bg-transparent" />
                                </div>
                            )}
                            <div className="flex-1 min-w-[20px]"></div>
                            <div className="flex items-center space-x-2">
                                <Switch id="all-day" checked={isAllDay} onCheckedChange={setIsAllDay} />
                                <Label htmlFor="all-day">Весь день</Label>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 flex-1">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">Назначить дату</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" onClick={handleScheduleWithAI}>
                                <Wand2 className="mr-2 h-4 w-4"/>
                                Найти время
                            </Button>
                        </div>
                    )}
                </div>

                <Separator />
                
                <div className="flex items-start gap-4">
                    <AlignLeft className="size-5 text-muted-foreground mt-2" />
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Добавить описание или файл с Google Диска"
                        className={cn(inputStyles, "min-h-[60px]")}
                        disabled={isLoading}
                    />
                </div>

                {itemType === 'event' && isScheduled && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-4">
                        <Users className="size-5 text-muted-foreground" />
                        <Input placeholder="Добавьте гостей" className={inputStyles} />
                    </div>
                    <div className="flex items-center gap-4">
                        <MapPin className="size-5 text-muted-foreground" />
                        <Input placeholder="Добавить местоположение" className={inputStyles} />
                    </div>
                    <div className="flex items-center gap-4">
                        <Video className="size-5 text-muted-foreground" />
                        <Button variant="outline" type="button">Добавить видеоконференцию Google Meet</Button>
                    </div>
                  </>
                )}
                
                <Separator />

                <div className="flex items-center gap-4">
                    <Bell className="size-5 text-muted-foreground" />
                    <Select defaultValue="30" disabled={!isScheduled}>
                        <SelectTrigger className="w-auto border-none shadow-none focus:ring-0 px-0 disabled:opacity-100 disabled:cursor-not-allowed">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">За 10 минут</SelectItem>
                            <SelectItem value="30">За 30 минут</SelectItem>
                            <SelectItem value="60">За 1 час</SelectItem>
                        </SelectContent>
                    </Select>
                     <Button variant="link" type="button" className="p-0 h-auto text-muted-foreground" disabled={!isScheduled}>Добавить уведомление</Button>
                </div>

                <Separator />

                <div className="space-y-4 pt-2">
                     <div className="flex items-start gap-4">
                        <Palette className="size-5 text-muted-foreground mt-1" />
                        <div className="flex flex-col gap-2 w-full">
                           <Label className="text-sm font-medium">Цвет события</Label>
                           <div className="flex flex-wrap gap-2">
                            {eventColors.map((c) => (
                              <Button
                                key={c}
                                type="button"
                                variant="outline"
                                className={cn(
                                  'size-8 rounded-full p-0 border-2',
                                  color === c && 'border-primary ring-2 ring-primary/50'
                                )}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                                disabled={isLoading}
                              />
                            ))}
                          </div>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <Aperture className="size-5 text-muted-foreground" />
                        <div className="flex flex-col gap-2">
                            <Label className="text-sm font-medium">Иконка</Label>
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
                </div>
            </div>
          </div>
          <DialogFooter className="bg-muted p-4 flex justify-between">
            {isEditing ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button" disabled={isLoading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие нельзя будет отменить. Событие будет навсегда удалено с серверов.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : <div></div>}
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

    