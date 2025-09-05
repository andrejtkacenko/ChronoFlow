
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ScheduleItem } from '@/lib/types';
import { Loader2, Wand2, PlusCircle, ArrowLeft, Bed, Utensils, Coffee, CheckCircle2, Dumbbell, Brain, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule } from '@/lib/actions';
import { addScheduleItem } from '@/lib/client-actions';
import type { GenerateFullScheduleOutput, SuggestedSlot } from '@/ai/flows/schema';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from './ui/card';
import { format } from 'date-fns';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FullScheduleGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const defaultPreferences = {
  mainGoals: '',
  sleepDuration: 8,
  mealsPerDay: 3,
  restTime: 2,
  energyPeaks: [],
  sportEnabled: false,
  sportFrequency: 3,
  sportDuration: 45,
  sportPreferredTime: 'Любое',
  meditationEnabled: false,
  meditationFrequency: 5,
  meditationDuration: 15,
  meditationPreferredTime: 'Любое',
  readingEnabled: false,
  readingFrequency: 4,
  readingDuration: 30,
  readingPreferredTime: 'Любое',
  fixedEventsText: '',
  pastLearnings: '',
};

type GenerationStep = 'idle' | 'routine' | 'tasks' | 'done';

const GenerationProgress = memo(() => {
    const [step, setStep] = useState<GenerationStep>('routine');
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        const routineTimer = setTimeout(() => {
            setStep('tasks');
        }, 3000); 

        const tasksTimer = setTimeout(() => {
            setIsDone(true)
        }, 6000);

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
        <div className="flex flex-col items-center justify-center h-full p-8 bg-background rounded-lg">
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


const Step1_TaskSelection = memo(({
  inboxTasks,
  selectedTasks,
  onTaskSelection
}: {
  inboxTasks: ScheduleItem[];
  selectedTasks: Set<string>;
  onTaskSelection: (taskId: string) => void;
}) => (
  <div>
    <h3 className="text-base font-semibold mb-2">Шаг 1: Выберите задачи из инбокса</h3>
    <Card className="max-h-[150px] flex flex-col">
      <CardContent className="p-2 flex-1 overflow-hidden">
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
                <p className="text-sm text-muted-foreground text-center py-4">Ваш инбокс пуст.</p>
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
    isEnabled,
    frequency,
    duration,
    preferredTime,
    onPrefChange,
}: {
    habitName: string;
    habitKey: string;
    icon: React.ElementType;
    isEnabled: boolean;
    frequency: number;
    duration: number;
    preferredTime: string;
    onPrefChange: (id: string, value: any) => void;
}) => {
    return (
        <div className="p-3 rounded-lg border bg-secondary/50">
            <div className="flex items-center justify-between">
                <Label htmlFor={`habit-switch-${habitKey}`} className="flex items-center gap-2 font-semibold">
                    <Icon className="size-5 text-primary" />
                    {habitName}
                </Label>
                <Switch
                    id={`habit-switch-${habitKey}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => onPrefChange(`${habitKey}Enabled`, checked)}
                />
            </div>
            {isEnabled && (
                <div className="mt-4 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label>Частота (в неделю)</Label>
                          <span className="text-sm font-medium text-primary">{frequency}</span>
                        </div>
                        <Slider
                           value={[frequency]}
                           onValueChange={(value) => onPrefChange(`${habitKey}Frequency`, value[0])}
                           min={1} max={7} step={1}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label>Длительность (минут)</Label>
                          <span className="text-sm font-medium text-primary">{duration}</span>
                        </div>
                        <Slider
                           value={[duration]}
                           onValueChange={(value) => onPrefChange(`${habitKey}Duration`, value[0])}
                           min={15} max={120} step={15}
                        />
                    </div>
                    <div>
                      <Label>Предпочтительное время</Label>
                      <Select
                        value={preferredTime}
                        onValueChange={(value) => onPrefChange(`${habitKey}PreferredTime`, value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Выберите время" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Любое">Любое</SelectItem>
                          <SelectItem value="Утро">Утро</SelectItem>
                          <SelectItem value="День">День</SelectItem>
                          <SelectItem value="Вечер">Вечер</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>
            )}
        </div>
    )
});
HabitBuilder.displayName = 'HabitBuilder';


const LeftColumn = memo(({
    inboxTasks,
    selectedTasks,
    onTaskSelection,
    preferences,
    onPrefChange,
}: {
    inboxTasks: ScheduleItem[];
    selectedTasks: Set<string>;
    onTaskSelection: (taskId: string) => void;
    preferences: Record<string, any>;
    onPrefChange: (id: string, value: any) => void;
}) => (
    <div className="space-y-6">
        <Step1_TaskSelection
            inboxTasks={inboxTasks}
            selectedTasks={selectedTasks}
            onTaskSelection={onTaskSelection}
        />
        <div>
            <h4 className="font-semibold text-base mb-3">Высокоуровневые цели</h4>
            <div className="grid gap-2">
                <Label htmlFor="mainGoals">Каковы ваши основные цели на этот период?</Label>
                <Textarea 
                    id="mainGoals" 
                    placeholder="Пример: Запустить новый проект, подготовиться к марафону, прочитать 3 книги." 
                    value={preferences.mainGoals ?? ''} 
                    onChange={e => onPrefChange('mainGoals', e.target.value)}
                    className="min-h-[100px]"
                 />
            </div>
        </div>
         <div className="grid gap-2 mt-4">
            <Label htmlFor="fixedEventsText">Какие еще у вас есть обязательства с фиксированным временем?</Label>
            <Textarea id="fixedEventsText" placeholder="Пример: Встреча команды каждый Пн в 10:00" value={preferences.fixedEventsText ?? ''} onChange={e => onPrefChange('fixedEventsText', e.target.value)} />
        </div>
    </div>
));
LeftColumn.displayName = 'LeftColumn';

const RightColumn = memo(({
    preferences,
    onPrefChange,
    onEnergyPeakChange,
}: {
    preferences: Record<string, any>;
    onPrefChange: (id: string, value: any) => void;
    onEnergyPeakChange: (peak: string, checked: boolean) => void;
}) => (
    <div className="space-y-6">
        <div>
            <h4 className="font-semibold text-base mb-3">Ежедневные потребности</h4>
            <div className="space-y-4">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <Label>Сон (часов)</Label>
                        <span className="text-sm font-medium text-primary">{preferences.sleepDuration}</span>
                    </div>
                    <Slider
                        value={[preferences.sleepDuration ?? 8]}
                        onValueChange={value => onPrefChange('sleepDuration', value[0])}
                        min={4} max={12} step={1}
                    />
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <Label>Приемы пищи (в день)</Label>
                        <span className="text-sm font-medium text-primary">{preferences.mealsPerDay}</span>
                    </div>
                    <Slider
                        value={[preferences.mealsPerDay ?? 3]}
                        onValueChange={value => onPrefChange('mealsPerDay', value[0])}
                        min={1} max={6} step={1}
                    />
                 </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                        <Label>Отдых (часов, кроме сна)</Label>
                        <span className="text-sm font-medium text-primary">{preferences.restTime}</span>
                    </div>
                    <Slider
                        value={[preferences.restTime ?? 2]}
                        onValueChange={value => onPrefChange('restTime', value[0])}
                        min={1} max={5} step={0.5}
                    />
                 </div>
            </div>
        </div>

        <Separator />
        
        <div>
            <h4 className="font-semibold text-base mb-3">Привычки и хобби</h4>
            <div className="space-y-4">
                <HabitBuilder
                    habitName="Спорт"
                    habitKey="sport"
                    icon={Dumbbell}
                    isEnabled={preferences.sportEnabled}
                    frequency={preferences.sportFrequency}
                    duration={preferences.sportDuration}
                    preferredTime={preferences.sportPreferredTime}
                    onPrefChange={onPrefChange}
                />
                <HabitBuilder
                    habitName="Медитация"
                    habitKey="meditation"
                    icon={Brain}
                    isEnabled={preferences.meditationEnabled}
                    frequency={preferences.meditationFrequency}
                    duration={preferences.meditationDuration}
                    preferredTime={preferences.meditationPreferredTime}
                    onPrefChange={onPrefChange}
                />
                <HabitBuilder
                    habitName="Чтение"
                    habitKey="reading"
                    icon={BookOpen}
                    isEnabled={preferences.readingEnabled}
                    frequency={preferences.readingFrequency}
                    duration={preferences.readingDuration}
                    preferredTime={preferences.readingPreferredTime}
                    onPrefChange={onPrefChange}
                />
            </div>
        </div>

        <Separator />

        <div>
            <h4 className="font-semibold text-base mb-3">Продуктивность и обучение</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
            </div>
            <div className="grid gap-2 mt-4">
                <Label htmlFor="pastLearnings">Прошлые успехи/уроки/препятствия в планировании?</Label>
                <Textarea 
                    id="pastLearnings" 
                    placeholder="Пример: Лучше не ставить больше 2 больших задач в день." 
                    value={preferences.pastLearnings ?? ''} 
                    onChange={e => onPrefChange('pastLearnings', e.target.value)}
                    className="min-h-[100px]"
                />
            </div>
        </div>
    </div>
));
RightColumn.displayName = 'RightColumn';


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
  handleGenerate,
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
}) => {

    if (isPrefLoading) {
        return (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
    }

    return (
        <>
        <div className="flex-1 my-4 min-h-0">
            <ScrollArea className="h-full pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <LeftColumn 
                        inboxTasks={inboxTasks}
                        selectedTasks={selectedTasks}
                        onTaskSelection={handleTaskSelection}
                        preferences={preferences}
                        onPrefChange={handlePrefChange}
                    />
                    <RightColumn 
                         preferences={preferences}
                         onPrefChange={handlePrefChange}
                         onEnergyPeakChange={handleEnergyPeakChange}
                    />
                </div>
            </ScrollArea>
        </div>
        <DialogFooter className="justify-between">
           <div className="flex items-center gap-4">
              <Label htmlFor="numberOfDays" className="whitespace-nowrap">На сколько дней сгенерировать?</Label>
              <Input id="numberOfDays" type="number" value={numberOfDays} onChange={e => handleNumberOfDaysChange(parseInt(e.target.value, 10) || 1)} min="1" max="14" className="w-20" />
            </div>
            <Button onClick={handleGenerate} disabled={selectedTasks.size === 0}>
                <Wand2 className="mr-2 h-4 w-4" />
                Сгенерировать расписание
            </Button>
        </DialogFooter>
        </>
    );
});
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
             if (typeof loadedPrefs.energyPeaks === 'string') {
              loadedPrefs.energyPeaks = loadedPrefs.energyPeaks ? loadedPrefs.energyPeaks.split(',').map((s: string) => s.trim()) : [];
            } else if (!Array.isArray(loadedPrefs.energyPeaks)) {
              loadedPrefs.energyPeaks = [];
            }
            // Populate with defaults if fields are missing
            setPreferences({...defaultPreferences, ...loadedPrefs});
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

    const qTasks = query(
      collection(db, "scheduleItems"),
      where("userId", "==", userId),
      where("date", "==", null)
    );
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const tasks: ScheduleItem[] = [];
      snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() } as ScheduleItem));
      setInboxTasks(tasks);
    });

    return () => {
      unsubscribeTasks();
    }
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

    const allTasks = inboxTasks
      .filter(task => selectedTasks.has(task.id))
      .map(task => task.title);

    try {
      const aiPrefs = { ...preferences };
      if (!aiPrefs.sportEnabled) {
          aiPrefs.sportFrequency = 0;
          aiPrefs.sportDuration = 0;
      }
      if (!aiPrefs.meditationEnabled) {
          aiPrefs.meditationFrequency = 0;
          aiPrefs.meditationDuration = 0;
      }
      if (!aiPrefs.readingEnabled) {
          aiPrefs.readingFrequency = 0;
          aiPrefs.readingDuration = 0;
      }
      
      const result = await generateSchedule({
        tasks: allTasks,
        preferences: {
            ...aiPrefs,
            energyPeaks: Array.isArray(aiPrefs.energyPeaks) ? aiPrefs.energyPeaks.join(', ') : aiPrefs.energyPeaks,
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
    setPreferences(p => ({ ...p, [id]: typeof value === 'function' ? value(p[id]) : value }));
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
            return <div className="h-full"><GenerationProgress /></div>;
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
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0">
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
