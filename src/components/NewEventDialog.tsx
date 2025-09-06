
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { addScheduleItem, updateScheduleItem, deleteScheduleItem, getSuggestedTimeSlotsForTask } from '@/lib/client-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlignLeft, Users, MapPin, Clock, Video, Bell, Palette, Aperture, Trash2, Sparkles, Wand2, ArrowLeft, PersonStanding, BookOpen, BrainCircuit, Dumbbell, Timer } from 'lucide-react';
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
import type { SuggestedSlot } from '@/ai/flows/schema';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';


// --- Task Template Components ---
type Template = 'running' | 'reading' | 'meditation' | 'gym';

const templates: { id: Template; name: string; icon: React.ElementType }[] = [
  { id: 'running', name: 'Пробежка', icon: PersonStanding },
  { id: 'reading', name: 'Чтение', icon: BookOpen },
  { id: 'meditation', name: 'Медитация', icon: BrainCircuit },
  { id: 'gym', name: 'Тренировка', icon: Dumbbell },
];

const TaskTemplateSelector = ({ onSelectTemplate }: { onSelectTemplate: (templateId: Template) => void }) => (
  <div className='p-4 border-t'>
    <p className="text-sm font-medium mb-2 text-muted-foreground">Или используйте шаблон:</p>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {templates.map((template) => (
        <Button key={template.id} variant="outline" size="sm" className="h-auto flex-col gap-1 py-2" onClick={() => onSelectTemplate(template.id)}>
          <template.icon className="size-5 mb-1 text-primary" />
          <span className="text-xs">{template.name}</span>
        </Button>
      ))}
    </div>
  </div>
);

const RunningTemplate = ({ onSubmit }: { onSubmit: (title: string, icon: string, duration: number) => void }) => {
    const [distance, setDistance] = useState('');
    const [duration, setDuration] = useState('');
  
    const handleApply = () => {
      let title = 'Пробежка';
      const parts = [];
      if (distance) parts.push(`${distance} км`);
      if (duration) parts.push(`${duration} минут`);
      if (parts.length > 0) {
        title += `: ${parts.join(', ')}`;
      }
      onSubmit(title, 'PersonStanding', parseInt(duration) || 0);
    };
  
    return (
      <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="run-distance">Дистанция (км)</Label>
            <Input id="run-distance" type="number" placeholder="например, 5" value={distance} onChange={(e) => setDistance(e.target.value)} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="run-duration">Длительность (минут)</Label>
            <Input id="run-duration" type="number" placeholder="например, 30" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <Button onClick={handleApply} className="w-full" disabled={!distance && !duration}>Применить</Button>
      </div>
    );
};

const ReadingTemplate = ({ onSubmit }: { onSubmit: (title: string, icon: string, duration: number) => void }) => {
    const [bookTitle, setBookTitle] = useState('');
    const [readGoal, setReadGoal] = useState('');
    const [duration, setDuration] = useState(30);

    return (
      <div className="space-y-4">
        <Input id="book-title" placeholder="Название книги, например: Мастер и Маргарита" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} required />
        <Input id="read-goal" placeholder="Что прочесть, например: 50 страниц или 3 главы" value={readGoal} onChange={(e) => setReadGoal(e.target.value)} required />
        <div className="space-y-2">
            <Label htmlFor="read-duration">Длительность (минут)</Label>
            <Input id="read-duration" type="number" placeholder="например, 30" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)} />
        </div>
        <Button onClick={() => bookTitle && readGoal && onSubmit(`Чтение: ${bookTitle} (${readGoal})`, 'BookOpen', duration)} className="w-full">Применить</Button>
      </div>
    )
};

const MeditationTemplate = ({ onSubmit }: { onSubmit: (title: string, icon: string, duration: number) => void }) => {
  const [duration, setDuration] = useState('20');
  return (
    <div className="space-y-2">
      <Label htmlFor="meditation-duration">Длительность (минут)</Label>
      <Input id="meditation-duration" type="number" placeholder="например, 20" value={duration} onChange={(e) => setDuration(e.target.value)} required />
      <Button onClick={() => duration && onSubmit(`Медитация: ${duration} минут`, 'BrainCircuit', parseInt(duration))} className="w-full">Применить</Button>
    </div>
  );
};

const GymTemplate = ({ onSubmit }: { onSubmit: (title: string, icon: string, duration: number) => void }) => {
  const [type, setType] = useState('');
  const [duration, setDuration] = useState(60);

  return (
    <div className="space-y-4">
        <div className='space-y-2'>
            <Label htmlFor="gym-type">Тип тренировки</Label>
            <Input id="gym-type" placeholder="например, Ноги" value={type} onChange={(e) => setType(e.target.value)} required />
        </div>
        <div className='space-y-2'>
            <Label htmlFor="gym-duration">Длительность (минут)</Label>
            <Input id="gym-duration" type="number" placeholder="например, 60" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} />
        </div>
      <Button onClick={() => type && onSubmit(`Тренировка в зале: ${type}`, 'Dumbbell', duration)} className="w-full">Применить</Button>
    </div>
  )
};

const TemplateConfigurator = ({ template, onBack, onApply }: { template: Template, onBack: () => void, onApply: (title: string, icon: string, duration: number) => void }) => {
  const selectedTemplate = useMemo(() => templates.find(t => t.id === template), [template]);

  return (
    <div className="p-4 border-t">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7"><ArrowLeft className="size-4" /></Button>
        <div className="flex items-center gap-2">
          {selectedTemplate && <selectedTemplate.icon className="size-5 text-primary" />}
          <h4 className="font-semibold text-sm">{selectedTemplate?.name}</h4>
        </div>
      </div>
      <div>
        {template === 'running' && <RunningTemplate onSubmit={onApply} />}
        {template === 'reading' && <ReadingTemplate onSubmit={onApply} />}
        {template === 'meditation' && <MeditationTemplate onSubmit={onApply} />}
        {template === 'gym' && <GymTemplate onSubmit={onApply} />}
      </div>
    </div>
  );
};



// --- Main Dialog Component ---

interface NewEventDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  newEventTime: { date: Date; startTime: string; } | null;
  existingEvent: ScheduleItem | null;
  isNewTask: boolean;
  userId: string;
}

const calculateEndTime = (startTime: string, duration: number): string => {
  if (!startTime || !duration) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return '';
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
  const [template, setTemplate] = useState<Template | null>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);

  const isEditing = !!existingEvent;
  const endTime = useMemo(() => calculateEndTime(startTime, duration), [startTime, duration]);

  const resetForm = useCallback(() => {
      setTitle('');
      setDescription('');
      setDuration(60);
      setIcon('Default');
      setColor(eventColors[0]);
      setIsAllDay(false);
      setItemType('event');
      setDate(new Date());
      setStartTime('09:00');
      setIsLoading(false);
      setSuggestions([]);
      setIsAISuggesting(false);
      setTemplate(null);
  }, []);

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
        resetForm();
        setItemType('event');
        setDate(newEventTime.date);
        setStartTime(newEventTime.startTime);
      } else if (isNewTask) { // Create task from Inbox
        resetForm();
        setItemType('task');
        setIcon('BrainCircuit');
        setColor(eventColors[1]);
        setDate(undefined); // Unscheduled by default
      }
    } else {
        resetForm();
    }
  }, [isOpen, existingEvent, newEventTime, isNewTask, resetForm]);

  const fetchSuggestions = async () => {
      if (!existingEvent || !existingEvent.title) return;
      setIsAISuggesting(true);
      setSuggestions([]);
      const result = await getSuggestedTimeSlotsForTask(existingEvent, userId);
      if (typeof result !== 'string') {
          setSuggestions(result);
      } else {
          toast({ variant: 'destructive', title: 'Ошибка предложений', description: result });
      }
      setIsAISuggesting(false);
  };

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

    if (itemType === 'task' && !date) {
      finalStartTime = null;
      finalEndTime = null;
      finalDate = null;
      finalDuration = duration;
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

  const handleApplySuggestion = (slot: SuggestedSlot) => {
      setDate(parse(slot.date, 'yyyy-MM-dd', new Date()));
      setStartTime(slot.startTime);
      setDuration(slot.duration);
      setItemType('event');
      setSuggestions([]);
  };

  const handleDateSelect = (selectedDate?: Date) => {
    setDate(selectedDate);
    if (selectedDate) {
        setItemType('event');
    }
  }

  const handleTemplateApply = (templateTitle: string, templateIcon: string, templateDuration: number) => {
    setTitle(templateTitle);
    setIcon(templateIcon);
    if (templateDuration > 0) {
      setDuration(templateDuration);
    }
    setTemplate(null);
  }
  
  if (!isOpen) return null;

  const inputStyles = "border-0 border-b border-transparent focus-visible:border-primary focus-visible:ring-0 shadow-none rounded-none px-0";
  const isScheduled = itemType === 'event' && !!date;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
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
            <div className="px-6 space-y-4">
                 <Tabs 
                    value={itemType} 
                    onValueChange={(value) => {
                        const newType = value as 'event' | 'task';
                        setItemType(newType);
                        if (newType === 'task' && !isEditing) {
                            setDate(undefined);
                        } else if (newType === 'event' && !date) {
                            setDate(new Date());
                        }
                    }}
                    className="w-full"
                  >
                    <TabsList>
                        <TabsTrigger value="event">Мероприятие</TabsTrigger>
                        <TabsTrigger value="task">Задача</TabsTrigger>
                    </TabsList>
                 </Tabs>

                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-4">
                        <Clock className="size-5 text-muted-foreground" />
                        {isScheduled ? (
                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" className="px-2 py-1 h-auto text-sm font-medium">{date ? format(date, 'eeee, d MMMM') : 'Select Date'}</Button>
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
                                <Button variant="outline" type="button" onClick={() => handleDateSelect(new Date())}>Назначить дату</Button>
                                {(isEditing && existingEvent?.title) && <Button variant="outline" type="button" onClick={fetchSuggestions}>Найти время</Button>}
                            </div>
                        )}
                    </div>
                    
                    {/* DURATION INPUT */}
                    <div className="flex items-center gap-4">
                        <Timer className="size-5 text-muted-foreground" />
                        {isScheduled && !isAllDay ? (
                            <div className="flex items-center gap-2">
                                <Input 
                                    id="duration" 
                                    type="number" 
                                    value={duration}
                                    onChange={e => setDuration(parseInt(e.target.value, 10) || 0)}
                                    className="w-24"
                                    min="0"
                                />
                                <Label htmlFor="duration" className='text-muted-foreground'>минут</Label>
                            </div>
                        ) : isAllDay ? (
                            <p className="text-sm text-muted-foreground">Это событие запланировано на весь день.</p>
                        ) : (
                             <div className="flex items-center gap-2">
                                <Input 
                                    id="duration-task" 
                                    type="number" 
                                    value={duration}
                                    onChange={e => setDuration(parseInt(e.target.value, 10) || 0)}
                                    className="w-24"
                                    min="0"
                                    placeholder='60'
                                />
                                <Label htmlFor="duration-task" className='text-muted-foreground'>минут</Label>
                            </div>
                        )}
                    </div>

                    {isAISuggesting && (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Ищем свободные слоты...</span>
                        </div>
                    )}
                    {suggestions.length > 0 && (
                        <div className='space-y-2'>
                            <Label>Рекомендации:</Label>
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map((slot, i) => (
                                    <Button key={i} variant="outline" size="sm" onClick={() => handleApplySuggestion(slot)}>
                                        {format(parse(slot.date, 'yyyy-MM-dd', new Date()), 'd MMM')}, {slot.startTime}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Separator />
                    
                    <div className="flex items-start gap-4">
                        <AlignLeft className="size-5 text-muted-foreground mt-2" />
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Добавить описание" className={cn(inputStyles, "min-h-[60px]")} disabled={isLoading} />
                    </div>

                    {itemType === 'event' && isScheduled && (
                      <>
                        <Separator />
                        <div className="flex items-center gap-4"><Users className="size-5 text-muted-foreground" /><Input placeholder="Добавьте гостей" className={inputStyles} /></div>
                        <div className="flex items-center gap-4"><MapPin className="size-5 text-muted-foreground" /><Input placeholder="Добавить местоположение" className={inputStyles} /></div>
                        <div className="flex items-center gap-4"><Video className="size-5 text-muted-foreground" /><Button variant="outline" type="button">Добавить видеоконференцию</Button></div>
                      </>
                    )}
                    
                    <Separator />

                    <div className="flex items-center gap-4">
                        <Bell className="size-5 text-muted-foreground" />
                        <Select defaultValue="30" disabled={!isScheduled}>
                            <SelectTrigger className="w-auto border-none shadow-none focus:ring-0 px-0 disabled:opacity-100 disabled:cursor-not-allowed"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="10">За 10 минут</SelectItem><SelectItem value="30">За 30 минут</SelectItem><SelectItem value="60">За 1 час</SelectItem></SelectContent>
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
                                {eventColors.map((c) => ( <Button key={c} type="button" variant="outline" className={cn('size-8 rounded-full p-0 border-2', color === c && 'border-primary ring-2 ring-primary/50')} style={{ backgroundColor: c }} onClick={() => setColor(c)} disabled={isLoading} /> ))}
                              </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Aperture className="size-5 text-muted-foreground" />
                            <div className="flex flex-col gap-2">
                                <Label className="text-sm font-medium">Иконка</Label>
                                <Select value={icon} onValueChange={setIcon}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Icon" /></SelectTrigger>
                                    <SelectContent>{Object.keys(iconMap).map((iconName) => ( <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem> ))}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

             {/* Template section, only shows for new, unscheduled tasks */}
            {!isEditing && itemType === 'task' && !date && (
                !template ? (
                    <TaskTemplateSelector onSelectTemplate={setTemplate} />
                ) : (
                    <TemplateConfigurator template={template} onBack={() => setTemplate(null)} onApply={handleTemplateApply} />
                )
            )}

            <DialogFooter className="bg-muted p-4 flex justify-between mt-6">
                {isEditing ? (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button" disabled={isLoading}><Trash2 className="mr-2 h-4 w-4" />Удалить</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                        <AlertDialogDescription>Это действие нельзя будет отменить. Событие будет навсегда удалено с серверов.</AlertDialogDescription>
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

    