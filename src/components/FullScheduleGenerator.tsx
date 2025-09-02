
'use client';

import { useState, useEffect } from 'react';
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
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ScheduleItem } from '@/lib/types';
import { Loader2, Wand2, ArrowRight, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule } from '@/lib/actions';
import { addScheduleItem } from '@/lib/client-actions';
import type { SuggestedSlot } from '@/ai/flows/schema';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from './ui/card';
import { format, addDays } from 'date-fns';

interface FullScheduleGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const questionnaire = [
  { id: 'mainGoals', label: 'Каковы ваши основные цели на неделю/квартал?', type: 'textarea' },
  { id: 'priorities', label: 'Какие у вас приоритеты (работа, учеба, личные дела)?', type: 'text' },
  { id: 'sleepHours', label: 'Сколько часов сна/питания/отдыха вам нужно ежедневно?', type: 'text' },
  { id: 'energyPeaks', label: 'Когда у вас пики энергии (утро/день/вечер)?', type: 'text' },
  { id: 'fixedEvents', label: 'Какие у вас есть обязательства/привычки с фиксированным временем?', type: 'textarea' },
  { id: 'delegationOpportunities', label: 'Что из задач можно было бы делегировать/автоматизировать/удалить?', type: 'textarea' },
  { id: 'selfCareTime', label: 'Что вы делаете для самоухода/обучения/развлечений и сколько времени это занимает?', type: 'textarea' },
  { id: 'pastLearnings', label: 'Прошлые успехи/уроки/препятствия в планировании?', type: 'textarea' },
];

export default function FullScheduleGenerator({ open, onOpenChange, userId }: FullScheduleGeneratorProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [inboxTasks, setInboxTasks] = useState<ScheduleItem[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);
  const [numberOfDays, setNumberOfDays] = useState(7);

  useEffect(() => {
    if (!open || !userId) return;

    const q = query(
      collection(db, "scheduleItems"),
      where("userId", "==", userId),
      where("date", "==", undefined)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: ScheduleItem[] = [];
      snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() } as ScheduleItem));
      setInboxTasks(tasks);
    });
    return () => unsubscribe();
  }, [open, userId]);

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
    setSuggestions([]);

    const tasksToSchedule = inboxTasks
      .filter(task => selectedTasks.has(task.id))
      .map(task => task.title);

    try {
      const result = await generateSchedule({
        tasks: tasksToSchedule,
        preferences: preferences as any, // Cast because we know the shape
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
  
  const resetState = () => {
    setStep(1);
    setSelectedTasks(new Set());
    setPreferences({});
    setSuggestions([]);
    setIsLoading(false);
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        resetState();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Сгенерировать расписание
          </DialogTitle>
          <DialogDescription>
            AI-ассистент поможет вам составить идеальное расписание на ближайшие дни.
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 && (
          <div>
            <div className="my-4">
              <h3 className="font-semibold mb-2">Шаг 1: Выберите задачи из Инбокса</h3>
              <ScrollArea className="h-60 border rounded-md p-4">
                {inboxTasks.length > 0 ? (
                  <div className="space-y-2">
                    {inboxTasks.map(task => (
                      <div key={task.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`task-${task.id}`}
                          onCheckedChange={() => handleTaskSelection(task.id)}
                          checked={selectedTasks.has(task.id)}
                        />
                        <Label htmlFor={`task-${task.id}`}>{task.title}</Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">Ваш инбокс пуст.</p>
                )}
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button onClick={() => setStep(2)} disabled={selectedTasks.size === 0}>
                Далее <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="my-4">
                <h3 className="font-semibold mb-2">Шаг 2: Расскажите о своих предпочтениях</h3>
                <ScrollArea className="h-[50vh] pr-4">
                    <div className="space-y-4">
                        {questionnaire.map(q => (
                            <div key={q.id} className="grid gap-2">
                            <Label htmlFor={q.id}>{q.label}</Label>
                            {q.type === 'textarea' ? (
                                <Textarea id={q.id} value={preferences[q.id] ?? ''} onChange={e => setPreferences(p => ({ ...p, [q.id]: e.target.value }))} />
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
                </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)}>Назад</Button>
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Сгенерировать
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
            <div>
                <div className="my-4">
                    <h3 className="font-semibold mb-2">Шаг 3: Ваше новое расписание</h3>
                     <ScrollArea className="h-96 w-full">
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
                    </ScrollArea>
                </div>
                 <DialogFooter>
                    <Button variant="ghost" onClick={resetState}>Начать заново</Button>
                    <Button onClick={() => handleOpenChange(false)}>Закрыть</Button>
                </DialogFooter>
            </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
