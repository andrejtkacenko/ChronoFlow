
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

const defaultPreferences = {
  mainGoals: '',
  priorities: 'Balanced',
  sleepDuration: '8',
  mealsPerDay: '3',
  restTime: '2',
  energyPeaks: [],
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
  const [preferences, setPreferences] = useState<Record<string, any>>(defaultPreferences);
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
            const loadedPrefs = docSnap.data();
            // Ensure energyPeaks is an array, not a string
            if (typeof loadedPrefs.energyPeaks === 'string') {
              loadedPrefs.energyPeaks = loadedPrefs.energyPeaks ? loadedPrefs.energyPeaks.split(',').map((s: string) => s.trim()) : [];
            }
            setPreferences(loadedPrefs);
        } else {
            setPreferences({...defaultPreferences});
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

    const prefsToSave = {
      ...preferences,
      energyPeaks: Array.isArray(preferences.energyPeaks) ? preferences.energyPeaks.join(', ') : preferences.energyPeaks,
    };

    try {
        const prefRef = doc(db, 'userPreferences', userId);
        await setDoc(prefRef, prefsToSave, { merge: true });
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
        preferences: prefsToSave as any, 
        startDate: format(new Date(), 'yyyy-MM-dd'),
        numberOfDays,
      }, userId);

      if (typeof result === 'string') {
        toast({ variant: 'destructive', title: "Ошибка генерации", description: result });
      } else if (result) {
        setSuggestions(result);
        setView('results');
      } else {
        toast({ variant: 'destructive', title: "Ошибка генерации", description: "AI не вернул результат." });
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

  const handleAddAll = () => {
    if (!suggestions) return;
    
    const allEvents = [...suggestions.tasks, ...suggestions.routineEvents];
    allEvents.forEach(slot => {
        const type = suggestions.tasks.includes(slot) ? 'task' : 'routine';
        handleAddEvent(slot, type);
    });
  }
  
  const resetState = useCallback(() => {
    setView('form');
    setSelectedTasks(new Set());
    setSuggestions(null);
    setIsLoading(false);
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        resetState();
    }
    onOpenChange(isOpen);
  }

  const handlePrefChange = (id: string, value: any) => {
    setPreferences(p => ({ ...p, [id]: value }));
  }

  const handleEnergyPeakChange = (peak: string, checked: boolean) => {
      const currentPeaks = preferences.energyPeaks || [];
      const newPeaks = checked ? [...currentPeaks, peak] : currentPeaks.filter((p: string) => p !== peak);
      handlePrefChange('energyPeaks', newPeaks);
  }

  const Step1_TaskSelection = () => (
     <div className="flex h-full flex-col">
        <Card className="flex-1 flex flex-col">
             <CardHeader>
                 <CardTitle className="text-lg">Шаг 1: Выберите задачи</CardTitle>
                 <CardDescription>Отметьте задачи из вашего инбокса, которые вы хотите добавить в расписание.</CardDescription>
             </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full pr-4">
                      <div className="space-y-2">
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
              </CardContent>
        </Card>
    </div>
  )

  const Step2_Preferences = () => (
     <div className="flex h-full flex-col">
        <Card className="flex-1 flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Шаг 2: Укажите предпочтения</CardTitle>
                <CardDescription>Эта информация поможет AI создать для вас наиболее подходящее расписание.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    {isPrefLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-semibold text-base mb-3">Высокоуровневые цели</h4>
                            <div className="grid gap-2">
                                <Label htmlFor="mainGoals">Каковы ваши основные цели на этот период?</Label>
                                <Textarea id="mainGoals" value={preferences.mainGoals ?? ''} onChange={e => handlePrefChange('mainGoals', e.target.value)} />
                            </div>
                        </div>

                        <Separator/>
                        
                        <div>
                            <h4 className="font-semibold text-base mb-3">Ежедневные потребности</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                  <Label>Продолжительность сна</Label>
                                  <Select value={preferences.sleepDuration ?? '8'} onValueChange={value => handlePrefChange('sleepDuration', value)}>
                                      <SelectTrigger><SelectValue/></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="4">4 часа</SelectItem>
                                          <SelectItem value="5">5 часов</SelectItem>
                                          <SelectItem value="6">6 часов</SelectItem>
                                          <SelectItem value="7">7 часов</SelectItem>
                                          <SelectItem value="8">8 часов</SelectItem>
                                          <SelectItem value="9">9 часов</SelectItem>
                                          <SelectItem value="10">10 часов</SelectItem>
                                      </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Количество приемов пищи</Label>
                                   <Select value={preferences.mealsPerDay ?? '3'} onValueChange={value => handlePrefChange('mealsPerDay', value)}>
                                      <SelectTrigger><SelectValue/></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="1">1</SelectItem>
                                          <SelectItem value="2">2</SelectItem>
                                          <SelectItem value="3">3</SelectItem>
                                          <SelectItem value="4">4</SelectItem>
                                          <SelectItem value="5">5</SelectItem>
                                      </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Время на отдых (кроме сна)</Label>
                                  <Select value={preferences.restTime ?? '2'} onValueChange={value => handlePrefChange('restTime', value)}>
                                      <SelectTrigger><SelectValue/></SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="1">1 час</SelectItem>
                                          <SelectItem value="2">2 часа</SelectItem>
                                          <SelectItem value="3">3 часа</SelectItem>
                                          <SelectItem value="4">4 часа</SelectItem>
                                      </SelectContent>
                                  </Select>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Общее время на короткие перерывы, прогулки и т.д. в течение дня.</p>

                            <div className="grid gap-2 mt-4">
                                <Label htmlFor="selfCareTime">Что вы делаете для самоухода/обучения/развлечений и сколько времени это занимает?</Label>
                                <Textarea id="selfCareTime" placeholder="Пример: Чтение - 1 час, Прогулка - 30 минут" value={preferences.selfCareTime ?? ''} onChange={e => handlePrefChange('selfCareTime', e.target.value)} />
                            </div>
                        </div>

                        <Separator/>

                        <div>
                            <h4 className="font-semibold text-base mb-3">Продуктивность и ограничения</h4>
                             <div className="grid gap-2">
                                  <Label>Когда у вас пики энергии?</Label>
                                  <div className="flex items-center space-x-4">
                                    {['Morning', 'Afternoon', 'Evening'].map(peak => (
                                        <div key={peak} className="flex items-center space-x-2">
                                            <Checkbox id={`peak-${peak}`} checked={(preferences.energyPeaks || []).includes(peak)} onCheckedChange={(checked) => handleEnergyPeakChange(peak, !!checked)} />
                                            <Label htmlFor={`peak-${peak}`}>{peak === 'Morning' ? 'Утро' : peak === 'Afternoon' ? 'День' : 'Вечер'}</Label>
                                        </div>
                                    ))}
                                  </div>
                              </div>
                              <div className="grid gap-2 mt-4">
                                <Label htmlFor="fixedEvents">Какие у вас есть обязательства/привычки с фиксированным временем?</Label>
                                <Textarea id="fixedEvents" placeholder="Пример: Встреча команды каждый Пн в 10:00" value={preferences.fixedEvents ?? ''} onChange={e => handlePrefChange('fixedEvents', e.target.value)} />
                              </div>
                        </div>
                        
                        <Separator/>

                         <div>
                            <h4 className="font-semibold text-base mb-3">Анализ и обучение</h4>
                             <div className="grid gap-2">
                                <Label htmlFor="pastLearnings">Прошлые успехи/уроки/препятствия в планировании?</Label>
                                <Textarea id="pastLearnings" placeholder="Пример: Лучше не ставить больше 2 больших задач в день" value={preferences.pastLearnings ?? ''} onChange={e => handlePrefChange('pastLearnings', e.target.value)} />
                             </div>
                        </div>

                        <Separator/>

                        <div className="grid gap-2">
                            <Label htmlFor="numberOfDays">На сколько дней сгенерировать расписание?</Label>
                            <Input id="numberOfDays" type="number" value={numberOfDays} onChange={e => setNumberOfDays(parseInt(e.target.value, 10) || 1)} min="1" max="14" />
                        </div>
                    </div>
                    )}
                 </ScrollArea>
            </CardContent>
        </Card>
    </div>
  )

  const FormView = () => (
    <>
      <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg">
        <ResizablePanel defaultSize={35} minSize={25}>
           <Step1_TaskSelection/>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} minSize={40}>
           <Step2_Preferences />
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
             <div className="space-y-2">
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
             <Button variant="ghost" onClick={() => setView('form')} className="self-start mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад к редактированию
            </Button>
            <h3 className="font-semibold mb-4 text-lg">Ваше новое расписание</h3>
             <ScrollArea className="flex-1 pr-4">
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
        <DialogFooter className="justify-between pt-4 border-t">
            <div>
                 {(suggestions?.tasks?.length || 0) + (suggestions?.routineEvents?.length || 0) > 0 && (
                    <Button variant="outline" onClick={handleAddAll}>Добавить все</Button>
                 )}
            </div>
            <div>
                <Button variant="ghost" onClick={resetState}>Начать заново</Button>
                <Button onClick={() => handleOpenChange(false)}>Закрыть</Button>
            </div>
        </DialogFooter>
    </>
  );


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Генератор расписания
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
