
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
import { Loader2, AlignLeft, Users, MapPin, Clock, Video, Bell, Palette, Aperture, Trash2 } from 'lucide-react';
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

interface NewEventDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  newEventTime: { date: Date; startTime: string; } | null;
  existingEvent: ScheduleItem | null;
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

  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('00:00');

  const isEditing = !!existingEvent;

  useEffect(() => {
    if (isOpen) {
      if (existingEvent) {
        // Edit mode
        setTitle(existingEvent.title);
        setDescription(existingEvent.description ?? '');
        setDuration(existingEvent.duration);
        setIcon(existingEvent.icon);
        setColor(existingEvent.color);
        setStartTime(existingEvent.startTime);
        setDate(parse(existingEvent.date, 'yyyy-MM-dd', new Date()));
        setIsAllDay(existingEvent.startTime === '00:00' && existingEvent.endTime === '23:59');
        setItemType(existingEvent.type);
      } else if (newEventTime) {
        // Create mode
        setTitle('');
        setDescription('');
        setDuration(60);
        setIcon('Default');
        setColor(eventColors[0]);
        setStartTime(newEventTime.startTime);
        setDate(newEventTime.date);
        setIsAllDay(false);
        setItemType('event');
      }
      setIsLoading(false);
    }
  }, [isOpen, existingEvent, newEventTime]);

  useEffect(() => {
    if (!isAllDay) {
        setEndTime(calculateEndTime(startTime, duration));
    } else {
        setEndTime('23:59');
    }
  }, [startTime, duration, isAllDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    setIsLoading(true);

    const finalStartTime = isAllDay ? '00:00' : startTime;
    const finalDuration = isAllDay ? 24 * 60 - 1 : duration;
    const finalEndTime = isAllDay ? '23:59' : calculateEndTime(startTime, duration);

    const eventData: Omit<ScheduleItem, 'id' | 'userId'> = {
      title,
      description,
      date: format(date, 'yyyy-MM-dd'),
      startTime: finalStartTime,
      endTime: finalEndTime,
      duration: finalDuration,
      icon,
      color,
      type: itemType,
    };

    try {
      if (isEditing) {
        await updateScheduleItem(existingEvent.id, { ...eventData });
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
  
  if (!isOpen) return null;

  const inputStyles = "border-0 border-b border-transparent focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-none px-0";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-2">
           <DialogTitle className="sr-only">{isEditing ? 'Edit item' : 'Create item'}</DialogTitle>
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
                        <TabsTrigger value="appointment" disabled>Расписание встреч</TabsTrigger>
                    </TabsList>
                 </Tabs>
            </div>

            <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                    <Clock className="size-5 text-muted-foreground" />
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <span className="text-sm font-medium">{format(date, 'eeee, d MMMM')}</span>
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

                {itemType === 'event' && (
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
                    <Select defaultValue="30">
                        <SelectTrigger className="w-auto border-none shadow-none focus:ring-0 px-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">За 10 минут</SelectItem>
                            <SelectItem value="30">За 30 минут</SelectItem>
                            <SelectItem value="60">За 1 час</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="link" type="button" className="p-0 h-auto text-muted-foreground">Добавить уведомление</Button>
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
  );
}
