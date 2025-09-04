
'use client';

import { useState, useEffect, useCallback, memo } from 'react';
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
import { Loader2, Wand2, PlusCircle, ArrowLeft, Bed, Utensils, Coffee, CheckCircle2, Dumbbell, CalendarClock, Brain, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule } from '@/lib/actions';
import { addScheduleItem } from '@/lib/client-actions';
import type { GenerateFullScheduleOutput, SuggestedSlot } from '@/ai/flows/schema';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

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

type GenerationStep = 'idle' | 'routine' | 'tasks' | 'done';

const GenerationProgress = memo(() => {
    const [step, setStep] = useState<GenerationStep>('routine');
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        const routineTimer = setTimeout(() => {
            setStep('tasks');
        }, 3000); // Simulate time for routine generation

        const tasksTimer = setTimeout(() => {
            setIsDone(true)
        }, 6000); // Simulate time for task scheduling

        return () => {
            clearTimeout(routineTimer);
            clearTimeout(tasksTimer);
        }
    }, []);

    const ProgressItem = ({ title, icon, active, done }: { title: string, icon: React.ReactNode, active: boolean, done: boolean }) => (
        <div className={cn("flex items-center gap-4 transition-opacity duration-500", active ? "opacity-100" : "opacity-40")}>
            <div className="flex items-center justify-center size-10 rounded-full bg-secondary shrink-0">
                {done ? <CheckCircle2 className="size-6 text-primary animate-fade-in" /> : (active ? <Loader2 className="size-6 animate-spin text-primary" /> : icon)}
            </div>
            <div className="flex flex-col">
                <p className={cn("font-semibold", active && !done && "text-primary")}>{title}</p>
                <p className="text-sm text-muted-foreground">
                    {done ? "Completed" : (active ? "In progress..." : "Pending")}
                </p>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-8 bg-background rounded-lg">
            <h3 className="text-xl font-semibold">Generating your schedule...</h3>
            <div className="space-y-6 w-full max-w-sm">
                <ProgressItem 
                    title="Creating routine events" 
                    icon={<Bed className="size-6 text-muted-foreground" />} 
                    active={step === 'routine' || step === 'tasks'}
                    done={step === 'tasks' || isDone}
                />
                 <ProgressItem 
                    title="Scheduling your tasks" 
                    icon={<Utensils className="size-6 text-muted-foreground" />}
                    active={step === 'tasks'}
                    done={isDone}
                />
            </div>
        </div>
    );
});
GenerationProgress.displayName = 'GenerationProgress';


const Step1_TaskSelection = memo(({ inboxTasks, selectedTasks, onTaskSelection }: {
  inboxTasks: ScheduleItem[];
  selectedTasks: Set<string>;
  onTaskSelection: (taskId: string) => void;
}) => (
  <div className="flex h-full flex-col">
    <Card className="flex-1 flex flex-col border-none rounded-none">
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
                    onCheckedChange={() => onTaskSelection(task.id)}
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
));
Step1_TaskSelection.displayName = 'Step1_TaskSelection';

const HabitBuilder = memo(({
    habitName,
    habitKey,
    icon: Icon,
    onHabitChange,
    initialValue
}: {
    habitName: string;
    habitKey: string;
    icon: React.ElementType;
    onHabitChange: (key: string, value: string) => void;
    initialValue?: string;
}) => {
    const [isActive, setIsActive] = useState(false);
    const [freq, setFreq] = useState('');
    const [dur, setDur] = useState('');

    const handleReset = () => {
        setIsActive(false);
        setFreq('');
        setDur('');
        onHabitChange(habitKey, ''); // Clear the value
    }

    const handleUpdate = useCallback((newFreq: string, newDur: string) => {
        if (newFreq && newDur) {
            onHabitChange(habitKey, `${habitName}: ${newFreq}, ${newDur}`);
        } else {
            onHabitChange(habitKey, '');
        }
    }, [habitName, habitKey, onHabitChange]);

    const handleFreqChange = (newFreq: string) => {
        setFreq(newFreq);
        handleUpdate(newFreq, dur);
    }
    
    const handleDurChange = (newDur: string) => {
        setDur(newDur);
        handleUpdate(freq, newDur);
    }

    if (!isActive) {
        return (
            <Button variant="outline" className="w-full justify-start" onClick={() => setIsActive(true)}>
                <PlusCircle className="mr-2 size-4" />
                Добавить {habitName.toLowerCase()}
            </Button>
        )
    }

    return (
        <div className="p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Icon className="size-5 text-primary" />
                    <h5 className="font-semibold text-base">{habitName}</h5>
                </div>
                <Button variant="ghost" size="icon" className="size-7" onClick={handleReset}>
                    <X className="size-4" />
                </Button>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <Select onValueChange={handleFreqChange} value={freq}>
                    <SelectTrigger><SelectValue placeholder="Частота" /></SelectTrigger>
                    <SelectContent>
                        {habitKey === 'sport' ? (
                            <>
                                <SelectItem value="1 раз в неделю">1 раз в неделю</SelectItem>
                                <SelectItem value="2 раза в неделю">2 раза в неделю</SelectItem>
                                <SelectItem value="3 раза в неделю">3 раза в неделю</SelectItem>
                                <SelectItem value="каждый день">Каждый день</SelectItem>
                            </>
                        ) : (
                             <>
                                <SelectItem value="1 раз в день">1 раз в день</SelectItem>
                                <SelectItem value="2 раза в день">2 раза в день</SelectItem>
                                <SelectItem value="несколько раз в неделю">Несколько раз в неделю</SelectItem>
                             </>
                        )}
                    </SelectContent>
                </Select>
                <Select onValueChange={handleDurChange} value={dur}>
                    <SelectTrigger><SelectValue placeholder="Длительность" /></SelectTrigger>
                    <SelectContent>
                         {habitKey === 'sport' ? (
                            <>
                                <SelectItem value="по 30 минут">30 минут</SelectItem>
                                <SelectItem value="по 1 часу">1 час</SelectItem>
                                <SelectItem value="по 1.5 часа">1.5 часа</SelectItem>
                            </>
                         ) : (
                            <>
                                <SelectItem value="по 10 минут">10 минут</SelectItem>
                                <SelectItem value="по 15 минут">15 минут</SelectItem>
                                <SelectItem value="по 20 минут">20 минут</SelectItem>
                            </>
                         )}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
});
HabitBuilder.displayName = 'HabitBuilder';

const Step2_Preferences = memo(({
  preferences,
  isPrefLoading,
  numberOfDays,
  onPrefChange,
  onEnergyPeakChange,
  onNumberOfDaysChange
}: {
  preferences: Record<string, any>;
  isPrefLoading: boolean;
  numberOfDays: number;
  onPrefChange: (id: string, value: any) => void;
  onEnergyPeakChange: (peak: string, checked: boolean) => void;
  onNumberOfDaysChange: (days: number) => void;
}) => {
  
  const handleHabitChange = useCallback((key: string, value: string) => {
    onPrefChange('fixedEvents', (prevFixedEvents: Record<string, string> | undefined) => ({
      ...(prevFixedEvents || {}),
      [key]: value
    }));
  }, [onPrefChange]);

  useEffect(() => {
    // This effect combines various text-based habits into a single string for the AI
    const fixedEventsObject = (preferences.fixedEvents || {}) as Record<string, string>;
    const combinedString = Object.values(fixedEventsObject).filter(Boolean).join('. ');
    
    // We use a different key to avoid re-triggering this effect
    onPrefChange('combinedFixedEvents', combinedString);

  }, [preferences.fixedEvents, onPrefChange]);


  return (
      <div className="flex h-full flex-col">
        <Card className="flex-1 flex flex-col border-none rounded-none overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Шаг 2: Укажите предпочтения</CardTitle>
            <CardDescription>Эта информация поможет AI создать для вас наиболее подходящее расписание.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
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
                      <Textarea id="mainGoals" placeholder="Пример: Запустить новый проект, подготовиться к марафону, прочитать 3 книги." value={preferences.mainGoals ?? ''} onChange={e => onPrefChange('mainGoals', e.target.value)} />
                    </div>
                  </div>
    
                  <Separator />
    
                  <div>
                    <h4 className="font-semibold text-base mb-3">Ежедневные потребности</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Продолжительность сна</Label>
                        <Select value={preferences.sleepDuration ?? '8'} onValueChange={value => onPrefChange('sleepDuration', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[...Array(7)].map((_, i) => <SelectItem key={i} value={String(i + 4)}>{i + 4} часов</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Количество приемов пищи</Label>
                        <Select value={preferences.mealsPerDay ?? '3'} onValueChange={value => onPrefChange('mealsPerDay', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[...Array(5)].map((_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Время на отдых (кроме сна)</Label>
                         <Select value={preferences.restTime ?? '2'} onValueChange={value => onPrefChange('restTime', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                             {[...Array(4)].map((_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1} час(а)</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                     <h4 className="font-semibold text-base mb-3">Привычки и хобби</h4>
                     <div className="space-y-2">
                        <HabitBuilder
                            habitName="Спорт"
                            habitKey="sport"
                            icon={Dumbbell}
                            onHabitChange={handleHabitChange}
                        />
                         <HabitBuilder
                            habitName="Медитация"
                            habitKey="meditation"
                            icon={Brain}
                            onHabitChange={handleHabitChange}
                        />
                        
                        <div className="grid gap-2 pt-2">
                           <Label htmlFor="selfCareTime">Другие занятия (чтение, курсы, хобби)?</Label>
                           <Textarea id="selfCareTime" placeholder="Пример: Чтение - 1 час в день, Курс по React - 2 часа по вт и чт." value={preferences.selfCareTime ?? ''} onChange={e => onPrefChange('selfCareTime', e.target.value)} />
                        </div>
                     </div>
                  </div>
    
                  <Separator />
    
                  <div>
                    <h4 className="font-semibold text-base mb-3">Продуктивность и ограничения</h4>
                    <div className="grid gap-2">
                      <Label>Когда у вас пики энергии?</Label>
                      <div className="flex items-center space-x-4">
                        {['Morning', 'Afternoon', 'Evening'].map(peak => (
                          <div key={peak} className="flex items-center space-x-2">
                            <Checkbox id={`peak-${peak}`} checked={(preferences.energyPeaks || []).includes(peak)} onCheckedChange={(checked) => onEnergyPeakChange(peak, !!checked)} />
                            <Label htmlFor={`peak-${peak}`}>{peak === 'Morning' ? 'Утро' : peak === 'Afternoon' ? 'День' : 'Вечер'}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 mt-4">
                      <Label htmlFor="fixedEventsText">Какие еще у вас есть обязательства/привычки с фиксированным временем?</Label>
                      <Textarea id="fixedEventsText" placeholder="Пример: Встреча команды каждый Пн в 10:00" value={preferences.fixedEventsText ?? ''} onChange={e => onPrefChange('fixedEventsText', e.target.value)} />
                    </div>
                  </div>
    
                  <Separator />
    
                  <div>
                    <h4 className="font-semibold text-base mb-3">Анализ и обучение</h4>
                    <div className="grid gap-2">
                      <Label htmlFor="pastLearnings">Прошлые успехи/уроки/препятствия в планировании?</Label>
                      <Textarea id="pastLearnings" placeholder="Пример: Лучше не ставить больше 2 больших задач в день. Утренние тренировки дают больше энергии." value={preferences.pastLearnings ?? ''} onChange={e => onPrefChange('pastLearnings', e.target.value)} />
                    </div>
                  </div>
    
                  <Separator />
    
                  <div className="grid gap-2">
                    <Label htmlFor="numberOfDays">На сколько дней сгенерировать расписание?</Label>
                    <Input id="numberOfDays" type="number" value={numberOfDays} onChange={e => onNumberOfDaysChange(parseInt(e.target.value, 10) || 1)} min="1" max="14" />
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
  )
});
Step2_Preferences.displayName = 'Step2_Preferences';

const SuggestionList = memo(({ title, items, type, onAddEvent }: {
  title: string;
  items: SuggestedSlot[];
  type: 'task' | 'routine';
  onAddEvent: (slot: SuggestedSlot, type: 'task' | 'routine') => void;
}) => {
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
              <Button size="icon" variant="ghost" onClick={() => onAddEvent(slot, type)}>
                <PlusCircle className="h-5 w-5 text-primary" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});
SuggestionList.displayName = 'SuggestionList';

const ResultsView = memo(({
  suggestions,
  onSetView,
  onAddEvent,
  onAddAll,
  onResetState,
  onOpenChange,
}: {
  suggestions: GenerateFullScheduleOutput | null;
  onSetView: (view: 'form' | 'results' | 'loading') => void;
  onAddEvent: (slot: SuggestedSlot, type: 'task' | 'routine') => void;
  onAddAll: () => void;
  onResetState: () => void;
  onOpenChange: (open: boolean) => void;
}) => (
  <>
    <div className="my-4 flex-1 flex flex-col min-h-0">
      <Button variant="ghost" onClick={() => onSetView('form')} className="self-start mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к редактированию
      </Button>
      <h3 className="font-semibold mb-4 text-lg">Ваше новое расписание</h3>
      <ScrollArea className="flex-1 pr-4">
        {!suggestions || (suggestions.tasks.length === 0 && suggestions.routineEvents.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center pt-10">Все предложенные события добавлены в ваш календарь.</p>
        ) : (
          <>
            <SuggestionList title="Задачи" items={suggestions.tasks} type="task" onAddEvent={onAddEvent} />
            <SuggestionList title="Рутина" items={suggestions.routineEvents} type="routine" onAddEvent={onAddEvent} />
          </>
        )}
      </ScrollArea>
    </div>
    <DialogFooter className="justify-between pt-4 border-t">
      <div>
        {(suggestions?.tasks?.length || 0) + (suggestions?.routineEvents?.length || 0) > 0 && (
          <Button variant="outline" onClick={onAddAll}>Добавить все</Button>
        )}
      </div>
      <div>
        <Button variant="ghost" onClick={onResetState}>Начать заново</Button>
        <Button onClick={() => onOpenChange(false)}>Закрыть</Button>
      </div>
    </DialogFooter>
  </>
));
ResultsView.displayName = 'ResultsView';


const FormView = memo(({
  inboxTasks,
  selectedTasks,
  handleTaskSelection,
  preferences,
  isPrefLoading,
  numberOfDays,
  handlePrefChange,
  handleEnergyPeakChange,
  handleNumberOfDaysChange,
  handleGenerate
}: {
  inboxTasks: ScheduleItem[];
  selectedTasks: Set<string>;
  handleTaskSelection: (taskId: string) => void;
  preferences: Record<string, any>;
  isPrefLoading: boolean;
  numberOfDays: number;
  handlePrefChange: (id: string, value: any) => void;
  handleEnergyPeakChange: (peak: string, checked: boolean) => void;
  handleNumberOfDaysChange: (days: number) => void;
  handleGenerate: () => void;
}) => (
  <>
    <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-lg border my-4 min-h-0">
      <ResizablePanel defaultSize={35} minSize={25}>
        <Step1_TaskSelection inboxTasks={inboxTasks} selectedTasks={selectedTasks} onTaskSelection={handleTaskSelection} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={65} minSize={40}>
        <Step2_Preferences
          preferences={preferences}
          isPrefLoading={isPrefLoading}
          numberOfDays={numberOfDays}
          onPrefChange={handlePrefChange}
          onEnergyPeakChange={handleEnergyPeakChange}
          onNumberOfDaysChange={handleNumberOfDaysChange}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
    <DialogFooter>
      <Button onClick={handleGenerate} disabled={selectedTasks.size === 0}>
        <Wand2 className="mr-2 h-4 w-4" />
        Сгенерировать расписание
      </Button>
    </DialogFooter>
  </>
));
FormView.displayName = 'FormView';


export default function FullScheduleGenerator({ open, onOpenChange, userId }: FullScheduleGeneratorProps) {
  const { toast } = useToast();
  const [view, setView] = useState<'form' | 'results' | 'loading'>('form');
  const [inboxTasks, setInboxTasks] = useState<ScheduleItem[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<Record<string, any>>(defaultPreferences);
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
             // Ensure energyPeaks is an array
            if (typeof loadedPrefs.energyPeaks === 'string') {
              loadedPrefs.energyPeaks = loadedPrefs.energyPeaks ? loadedPrefs.energyPeaks.split(',').map((s: string) => s.trim()) : [];
            } else if (!Array.isArray(loadedPrefs.energyPeaks)) {
              loadedPrefs.energyPeaks = [];
            }
            if (!loadedPrefs.fixedEvents) {
              loadedPrefs.fixedEvents = {};
            }
            setPreferences(loadedPrefs);
        } else {
            setPreferences({...defaultPreferences, fixedEvents: {}});
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

  const handleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleGenerate = async () => {
    if (selectedTasks.size === 0) {
      toast({ variant: 'destructive', title: 'Выберите хотя бы одну задачу' });
      return;
    }
    setView('loading');
    setSuggestions(null);

    // Combine different fixed events fields into one string for the AI
    const combinedFixedEvents = [
        preferences.combinedFixedEvents,
        preferences.fixedEventsText,
        preferences.selfCareTime
    ].filter(Boolean).join('. ');

    const prefsToSave = {
      ...preferences,
      fixedEvents: combinedFixedEvents,
      energyPeaks: Array.isArray(preferences.energyPeaks) ? preferences.energyPeaks.join(', ') : preferences.energyPeaks,
    };
    
    // Clean up temporary fields before saving
    delete prefsToSave.combinedFixedEvents;
    delete prefsToSave.fixedEventsText;

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
        preferences: {
            ...prefsToSave,
            // Pass the combined string to the AI
            fixedEvents: combinedFixedEvents
        }, 
        startDate: format(new Date(), 'yyyy-MM-dd'),
        numberOfDays,
      }, userId);

      if (typeof result === 'string') {
        toast({ variant: 'destructive', title: "Ошибка генерации", description: result });
        setView('form');
      } else if (result) {
        setSuggestions(result);
        setView('results');
      } else {
        toast({ variant: 'destructive', title: "Ошибка генерации", description: "AI не вернул результат." });
        setView('form');
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Произошла непредвиденная ошибка' });
      setView('form');
    }
  };

  const handleAddEvent = useCallback(async (slot: SuggestedSlot, type: 'task' | 'routine') => {
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
  }, [userId, toast]);

  const handleAddAll = useCallback(() => {
    if (!suggestions) return;
    
    const allEvents = [...suggestions.tasks, ...suggestions.routineEvents];
    allEvents.forEach(slot => {
        const type = suggestions.tasks.includes(slot) ? 'task' : 'routine';
        handleAddEvent(slot, type);
    });
  }, [suggestions, handleAddEvent]);
  
  const resetState = useCallback(() => {
    setView('form');
    setSelectedTasks(new Set());
    setSuggestions(null);
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
        resetState();
    }
    onOpenChange(isOpen);
  }, [resetState, onOpenChange]);

  const handlePrefChange = useCallback((id: string, value: any) => {
    setPreferences(p => ({ ...p, [id]: value }));
  }, []);

  const handleEnergyPeakChange = useCallback((peak: string, checked: boolean) => {
      setPreferences(p => {
          const currentPeaks = p.energyPeaks || [];
          const newPeaks = checked 
              ? [...currentPeaks, peak] 
              : currentPeaks.filter((pk: string) => pk !== peak);
          return { ...p, energyPeaks: newPeaks };
      });
  }, []);

  const handleNumberOfDaysChange = useCallback((days: number) => {
      setNumberOfDays(days);
  }, []);

  const renderContent = () => {
    switch (view) {
        case 'loading':
            return <GenerationProgress />;
        case 'results':
            return <ResultsView 
                suggestions={suggestions}
                onSetView={setView}
                onAddEvent={handleAddEvent}
                onAddAll={handleAddAll}
                onResetState={resetState}
                onOpenChange={handleOpenChange}
            />;
        case 'form':
        default:
            return <FormView 
                inboxTasks={inboxTasks}
                selectedTasks={selectedTasks}
                handleTaskSelection={handleTaskSelection}
                preferences={preferences}
                isPrefLoading={isPrefLoading}
                numberOfDays={numberOfDays}
                handlePrefChange={handlePrefChange}
                handleEnergyPeakChange={handleEnergyPeakChange}
                handleNumberOfDaysChange={handleNumberOfDaysChange}
                handleGenerate={handleGenerate}
            />;
    }
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Генератор расписания
          </DialogTitle>
          <DialogDescription>
            AI-ассистент поможет вам составить идеальное расписание. Выберите задачи и настройте предпочтения.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

    