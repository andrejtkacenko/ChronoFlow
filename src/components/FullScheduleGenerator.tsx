
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
import type { SuggestedSlot } from '@/ai/flows/schema';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
  const [step, setStep] = useState(1);
  const [inboxTasks, setInboxTasks] = useState<ScheduleItem[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<Record<string, string>>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrefLoading, setIsPrefLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);
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

  const handleSavePreferencesAndGenerate = async () => {
    if (selectedTasks.size === 0) {
      toast({ variant: 'destructive', title: 'Выберите хотя бы одну задачу' });
      return;
    }
    setIsLoading(true);
    setSuggestions([]);

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
        setStep(3);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Произошла непредвиденная ошибка' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async (slot: SuggestedSlot) => {
    try {
        await addScheduleItem({
            userId: userId,
            title: slot.task,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            type: 'event',
            icon: 'BrainCircuit',
            color: 'hsl(262.1 83.3% 57.8%)',
        });
        toast({
            title: 'Событие добавлено',
            description: `"${slot.task}" было добавлено в ваш календарь.`
        });
        setSuggestions(prev => prev.filter(s => s !== slot));
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Ошибка',
            description: 'Не удалось добавить событие в календарь.'
        });
    }
  }
  
  const resetState = useCallback(() => {
    setStep(1);
    setSelectedTasks(new Set());
    setSuggestions([]);
    setIsLoading(false);
    // Don't reset preferences, as they are now loaded from DB
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        resetState();
    }
    onOpenChange(isOpen);
  }

  const Step1_TaskSelection = () => (
    <>
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Шаг 1: Выберите задачи для планирования</CardTitle>
                <CardDescription>Отметьте задачи из вашего инбокса, которые вы хотите добавить в расписание.</CardDescription>
            </CardHeader>
             <CardContent className="flex-1 overflow-hidden">
                 <ScrollArea className="h-full pr-4">
                    {inboxTasks.length > 0 ? (
                    <div className="space-y-2">
                        {inboxTasks.map(task => (
                        <div key={task.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                            <Checkbox
                            id={`task-${task.id}`}
                            onCheckedChange={() => handleTaskSelection(task.id)}
                            checked={selectedTasks.has(task.id)}
                            />
                            <Label htmlFor={`task-${task.id}`} className="flex-1 truncate cursor-pointer">{task.title}</Label>
                        </div>
                        ))}
                    </div>
                    ) : (
                    <p className="text-sm text-muted-foreground text-center pt-10">Ваш инбокс пуст. Добавьте задачи, чтобы их запланировать.</p>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
        <DialogFooter>
            <Button onClick={() => setStep(2)} disabled={selectedTasks.size === 0}>
                Далее
            </Button>
        </DialogFooter>
    </>
  );

  const Step2_Preferences = () => (
    <>
        <Card className="h-full flex flex-col">
            <CardHeader>
               <CardTitle className="text-lg">Шаг 2: Расскажите о своих предпочтениях</CardTitle>
               <CardDescription>Эта информация поможет AI создать для вас наиболее подходящее расписание. Ваши ответы будут сохранены.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
                {isPrefLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                 <div className="space-y-4 pr-2">
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
            </CardContent>
        </Card>
        <DialogFooter>
            <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
            </Button>
            <Button onClick={handleSavePreferencesAndGenerate} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Сгенерировать
            </Button>
        </DialogFooter>
    </>
  );

  const Step3_Results = () => (
    <>
        <div className="my-4">
            <h3 className="font-semibold mb-2">Ваше новое расписание</h3>
             <ScrollArea className="h-96 w-full">
                {suggestions.length > 0 ? (
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
                 ) : (
                    <p className="text-sm text-muted-foreground text-center pt-10">Все предложенные события добавлены в ваш календарь.</p>
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
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Сгенерировать расписание
          </DialogTitle>
          <DialogDescription>
            AI-ассистент поможет вам составить идеальное расписание. Выполните несколько простых шагов.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
            {step === 1 && <Step1_TaskSelection />}
            {step === 2 && <Step2_Preferences />}
            {step === 3 && <Step3_Results />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
