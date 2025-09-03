
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ScheduleItem } from '@/lib/types';
import { Loader2, Wand2, PlusCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule } from '@/lib/actions';
import { addScheduleItem } from '@/lib/client-actions';
import type { GenerateFullScheduleOutput, SuggestedSlot } from '@/ai/flows/schema';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

interface FullScheduleGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const questionnaire = [
  { id: 'mainGoals', label: 'Каковы ваши основные цели на неделю/квартал?', type: 'textarea' },
  { id: 'priorities', label: 'Какие у вас приоритеты?', type: 'select', options: [{value: 'Work', label: 'Работа'}, {value: 'Study', label: 'Учеба'}, {value: 'Personal', label: 'Личные дела'}, {value: 'Balanced', label: 'Сбалансированно'}] },
  { id: 'sleepDuration', label: 'Продолжительность сна', type: 'select', options: [{value: '7', label: '7 часов'}, {value: '8', label: '8 часов'}, {value: '9', label: '9 часов'}] },
  { id: 'mealsPerDay', label: 'Количество приемов пищи', type: 'select', options: [{value: '2', label: '2'}, {value: '3', label: '3'}, {value: '4', label: '4'}] },
  { id: 'restTime', label: 'Время на отдых (кроме сна)', type: 'select', options: [{value: '1', label: '1 час'}, {value: '2', label: '2 часа'}, {value: '3', label: '3 часа'}] },
  { id: 'energyPeaks', label: 'Когда у вас пики энергии?', type: 'select', options: [{value: 'Morning', label: 'Утро'}, {value: 'Afternoon', label: 'День'}, {value: 'Evening', label: 'Вечер'}] },
  { id: 'fixedEvents', label: 'Какие у вас есть обязательства/привычки с фиксированным временем?', type: 'textarea' },
  { id: 'delegationOpportunities', label: 'Что из задач можно было бы делегировать/автоматизировать/удалить?', type: 'textarea' },
  { id: 'selfCareTime', label: 'Что вы делаете для самоухода/обучения/развлечений и сколько времени это занимает?', type: 'textarea' },
  { id: 'pastLearnings', label: 'Прошлые успехи/уроки/препятствия в планировании?', type: 'textarea' },
];

const defaultPreferences = {
  mainGoals: '',
  priorities: 'Balanced',
  sleepDuration: '8',
  mealsPerDay: '3',
  restTime: '2',
  energyPeaks: 'Morning',
  fixedEvents: '',
delegationOpportunities: '',
  selfCareTime: '',
  pastLearnings: '',
};

export default function FullScheduleGenerator({ open, onOpenChange, userId }: FullScheduleGeneratorProps) {
  const { toast } = useToast();
  const [view, setView] = useState<'form' | 'results'>('form');
  const [inboxTasks, setInboxTasks] = useState<ScheduleItem[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<Record<string, string>>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrefLoading, setIsPrefLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<GenerateFullScheduleOutput | null>(null);
  const [numberOfDays, setNumberOfDays] = useState(7);

  const fetchUserPreferences = useCallback(async () => {
    if (!userId) return;
    setIsPrefLoading(true);
    try {
        const prefRef = doc(db, 'userPreferences', userId);
        const docSnap = await getDoc(prefRef);
        if (docSnap.exists()) {
            setPreferences(docSnap.data() as Record<string, string>);
        } else {
            setPreferences(defaultPreferences);
        }
    } catch (error) {
        console.error("Error fetching preferences:", error);
        toast({ variant: 'destructive', title: 'Не удалось загрузить ваши предпочтения.' });
    } finally {
        setIsPrefLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    if (!open || !userId) return;
    
    fetchUserPreferences();

    const q = query(
      collection(db, "scheduleItems"),
      where("userId", "==", userId),
      where("date", "==", null)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: ScheduleItem[] = [];
      snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() } as ScheduleItem));
      setInboxTasks(tasks);
    });
    return () => unsubscribe();
  }, [open, userId, fetchUserPreferences]);

  const handleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleGenerate = async () => {
    if (selectedTasks.size === 0) {
      toast({ variant: 'destructive', title: 'Выберите хотя бы одну задачу' });
      return;
    }
    setIsLoading(true);
    setSuggestions(null);

    // Save preferences to Firestore
    try {
        const prefRef = doc(db, 'userPreferences', userId);
        await setDoc(prefRef, preferences, { merge: true });
    } catch (error) {
        console.error("Error saving preferences:", error);
        toast({ variant: 'destructive', title: 'Не удалось сохранить ваши предпочтения.' });
    }

    const tasksToSchedule = inboxTasks
      .filter(task => selectedTasks.has(task.id))
      .map(task => task.title);

    try {
      const result = await generateSchedule({
        tasks: tasksToSchedule,
        preferences: preferences as any, 
        startDate: format(new Date(), 'yyyy-MM-dd'),
        numberOfDays,
      }, userId);

      if (typeof result === 'string') {
        toast({ variant: 'destructive', title: "Ошибка генерации", description: result });
      } else {
        setSuggestions(result);
        setView('results');
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Произошла непредвиденная ошибка' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async (slot: SuggestedSlot, type: 'task' | 'routine') => {
    try {
        await addScheduleItem({
            userId: userId,
            title: slot.task,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            type: 'event',
            icon: type === 'task' ? 'BrainCircuit' : 'Coffee',
            color: type === 'task' ? 'hsl(262.1 83.3% 57.8%)' : 'hsl(204, 70%, 53%)',
        });
        toast({
            title: 'Событие добавлено',
            description: `"${slot.task}" было добавлено в ваш календарь.`
        });
        
        setSuggestions(prev => {
            if (!prev) return null;
            if (type === 'task') {
                return {...prev, tasks: prev.tasks.filter(s => s !== slot)};
            } else {
                return {...prev, routineEvents: prev.routineEvents.filter(s => s !== slot)};
            }
        });

    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Ошибка',
            description: 'Не удалось добавить событие в календарь.'
        });
    }
  }
  
  const resetState = useCallback(() => {
    setView('form');
    setSelectedTasks(new Set());
    setSuggestions(null);
    setIsLoading(false);
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        resetState();
    }
    onOpenChange(isOpen);
  }

  const FormView = () => (
    <>
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border">
        <ResizablePanel defaultSize={40}>
           <div className="flex h-full flex-col p-4">
              <h3 className="text-lg font-semibold mb-2">1. Выберите задачи</h3>
              <p className="text-sm text-muted-foreground mb-4">Отметьте задачи из вашего инбокса, которые вы хотите добавить в расписание.</p>
              <Separator className="mb-4" />
              <ScrollArea className="flex-1">
                  <div className="space-y-2 pr-4">
                    {inboxTasks.length > 0 ? (
                      inboxTasks.map(task => (
                      <div key={task.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                          <Checkbox
                          id={`task-${task.id}`}
                          onCheckedChange={() => handleTaskSelection(task.id)}
                          checked={selectedTasks.has(task.id)}
                          />
                          <Label htmlFor={`task-${task.id}`} className="flex-1 truncate cursor-pointer">{task.title}</Label>
                      </div>
                      ))
                  ) : (
                      <p className="text-sm text-muted-foreground text-center pt-10">Ваш инбокс пуст.</p>
                  )}
                  </div>
              </ScrollArea>
           </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
            <div className="flex h-full flex-col p-4">
                 <h3 className="text-lg font-semibold mb-2">2. Укажите предпочтения</h3>
                 <p className="text-sm text-muted-foreground mb-4">Эта информация поможет AI создать для вас наиболее подходящее расписание.</p>
                 <Separator className="mb-4" />
                 <ScrollArea className="flex-1">
                    {isPrefLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                    <div className="space-y-4 pr-4">
                        {questionnaire.map(q => (
                            <div key={q.id} className="grid gap-2">
                            <Label htmlFor={q.id}>{q.label}</Label>
                            {q.type === 'textarea' ? (
                                <Textarea id={q.id} value={preferences[q.id] ?? ''} onChange={e => setPreferences(p => ({ ...p, [q.id]: e.target.value }))} />
                            ) : q.type === 'select' ? (
                                <Select value={preferences[q.id] ?? ''} onValueChange={value => setPreferences(p => ({ ...p, [q.id]: value }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {q.options?.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input id={q.id} value={preferences[q.id] ?? ''} onChange={e => setPreferences(p => ({ ...p, [q.id]: e.target.value }))} />
                            )}
                            </div>
                        ))}
                        <div className="grid gap-2">
                            <Label htmlFor="numberOfDays">На сколько дней сгенерировать расписание?</Label>
                            <Input id="numberOfDays" type="number" value={numberOfDays} onChange={e => setNumberOfDays(parseInt(e.target.value, 10))} />
                        </div>
                    </div>
                    )}
                 </ScrollArea>
            </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      <DialogFooter className="mt-4">
            <Button onClick={handleGenerate} disabled={isLoading || selectedTasks.size === 0}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Сгенерировать расписание
            </Button>
      </DialogFooter>
    </>
  );

  const SuggestionList = ({ title, items, type }: { title: string, items: SuggestedSlot[], type: 'task' | 'routine' }) => {
    if (items.length === 0) return null;
    return (
        <div className="mb-4">
            <h4 className="font-semibold text-md mb-2">{title}</h4>
             <div className="space-y-2 pr-4">
                {items.map((slot, index) => (
                    <Card key={index} className="bg-secondary/50">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{slot.task}</p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(slot.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                                <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => handleAddEvent(slot, type)}>
                                <PlusCircle className="h-5 w-5 text-primary" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
  }

  const ResultsView = () => (
    <>
        <div className="my-4 flex-1 flex flex-col min-h-0">
            <h3 className="font-semibold mb-4 text-lg">Ваше новое расписание</h3>
             <ScrollArea className="flex-1">
                {!suggestions || (suggestions.tasks.length === 0 && suggestions.routineEvents.length === 0) ? (
                     <p className="text-sm text-muted-foreground text-center pt-10">Все предложенные события добавлены в ваш календарь.</p>
                ) : (
                    <>
                        <SuggestionList title="Задачи" items={suggestions.tasks} type="task" />
                        <SuggestionList title="Рутина" items={suggestions.routineEvents} type="routine" />
                    </>
                )}
            </ScrollArea>
        </div>
        <DialogFooter>
            <Button variant="ghost" onClick={resetState}>Начать заново</Button>
            <Button onClick={() => handleOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
    </>
  );


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Сгенерировать расписание
          </DialogTitle>
          <DialogDescription>
            AI-ассистент поможет вам составить идеальное расписание. Выберите задачи и настройте предпочтения.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
            {view === 'form' ? <FormView /> : <ResultsView />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
