

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
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ScheduleItem } from '@/lib/types';
import { Loader2, Wand2, PlusCircle, CheckCircle2, Bed, Utensils, Save, Dumbbell, Brain, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule } from '@/lib/actions';
import { addScheduleItem } from '@/lib/client-actions';
import type { GenerateFullScheduleOutput, SuggestedSlot } from '@/ai/flows/schema';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from './ui/card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// --- Components ---

const HabitBuilder = memo(({ habitName, habitKey, icon: Icon, preferences, onPrefChange }: { habitName: string; habitKey: string; icon: React.ElementType; preferences: Record<string, any>; onPrefChange: (id: string, value: any) => void; }) => {
    const isEnabled = preferences[`${habitKey}Enabled`];
    return (
        <div className="p-4 rounded-lg border bg-card/50">
            <div className="flex items-center justify-between">
                <Label htmlFor={`habit-switch-${habitKey}`} className="flex items-center gap-3 font-semibold"><Icon className="size-5 text-primary" />{habitName}</Label>
                <Switch id={`habit-switch-${habitKey}`} checked={isEnabled} onCheckedChange={(checked) => onPrefChange(`${habitKey}Enabled`, checked)} />
            </div>
            {isEnabled && (
                <div className="mt-4 space-y-4 pt-4 border-t">
                    <div>
                        <div className="flex justify-between items-center mb-1"><Label>Frequency (per week)</Label><span className="text-sm font-medium text-primary">{preferences[`${habitKey}Frequency`]}</span></div>
                        <Slider value={[preferences[`${habitKey}Frequency`]]} onValueChange={(value) => onPrefChange(`${habitKey}Frequency`, value[0])} min={1} max={7} step={1} />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1"><Label>Duration (minutes)</Label><span className="text-sm font-medium text-primary">{preferences[`${habitKey}Duration`]}</span></div>
                        <Slider value={[preferences[`${habitKey}Duration`]]} onValueChange={(value) => onPrefChange(`${habitKey}Duration`, value[0])} min={15} max={120} step={15} />
                    </div>
                    <div>
                        <Label>Preferred Time</Label>
                        <Select value={preferences[`${habitKey}PreferredTime`]} onValueChange={(value) => onPrefChange(`${habitKey}PreferredTime`, value)}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select time" /></SelectTrigger>
                            <SelectContent><SelectItem value="Любое">Any</SelectItem><SelectItem value="Утро">Morning</SelectItem><SelectItem value="День">Afternoon</SelectItem><SelectItem value="Вечер">Evening</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </div>
    )
});
HabitBuilder.displayName = 'HabitBuilder';


const GenerationProgress = memo(() => {
    const [step, setStep] = useState<'routine' | 'tasks'>('routine');
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        const routineTimer = setTimeout(() => setStep('tasks'), 3000); 
        const tasksTimer = setTimeout(() => setIsDone(true), 6000);
        return () => { clearTimeout(routineTimer); clearTimeout(tasksTimer); };
    }, []);

    const ProgressItem = ({ title, icon, active, done }: { title: string, icon: React.ReactNode, active: boolean, done: boolean }) => (
        <div className={cn("flex items-center gap-4 transition-opacity duration-500", active ? "opacity-100" : "opacity-40")}>
            <div className="flex items-center justify-center size-10 rounded-full bg-secondary shrink-0">
                {done ? <CheckCircle2 className="size-6 text-primary animate-fade-in" /> : (active ? <Loader2 className="size-6 animate-spin text-primary" /> : icon)}
            </div>
            <div>
                <p className={cn("font-semibold", active && !done && "text-primary")}>{title}</p>
                <p className="text-sm text-muted-foreground">
                    {done ? "Completed" : (active ? "In progress..." : "Pending")}
                </p>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-background rounded-lg">
            <h3 className="text-xl font-semibold mb-6">Generating your schedule...</h3>
            <div className="space-y-6 w-full max-w-sm">
                <ProgressItem title="Creating routine events" icon={<Bed className="size-6 text-muted-foreground" />} active={step === 'routine' || step === 'tasks'} done={step === 'tasks' || isDone} />
                <ProgressItem title="Scheduling your tasks" icon={<Utensils className="size-6 text-muted-foreground" />} active={step === 'tasks'} done={isDone} />
            </div>
        </div>
    );
});
GenerationProgress.displayName = 'GenerationProgress';

const SuggestionList = memo(({ title, items, type, onAddEvent }: { title: string; items: SuggestedSlot[]; type: 'task' | 'routine'; onAddEvent: (slot: SuggestedSlot, type: 'task' | 'routine') => void; }) => {
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
                <p className="text-sm text-muted-foreground">{new Date(slot.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => onAddEvent(slot, type)}><PlusCircle className="h-5 w-5 text-primary" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});
SuggestionList.displayName = 'SuggestionList';

const defaultPreferences = {
  mainGoals: '',
  sleepTimeRange: [22, 8],
  mealsPerDay: 3,
  restTime: 2,
  energyPeaks: 'Morning',
  workDays: [1, 2, 3, 4, 5],
  workStartTime: '09:00',
  workEndTime: '18:00',
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

// --- Main Component ---
export default function FullScheduleGenerator({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (open: boolean) => void; userId: string; }) {
  const { toast } = useToast();
  const [view, setView] = useState<'form' | 'loading' | 'results'>('form');
  const [inboxTasks, setInboxTasks] = useState<ScheduleItem[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<Record<string, any>>(defaultPreferences);
  const [isPrefLoading, setIsPrefLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
            if (!Array.isArray(loadedPrefs.workDays)) {
              loadedPrefs.workDays = defaultPreferences.workDays;
            }
            setPreferences({...defaultPreferences, ...loadedPrefs});
        } else {
            setPreferences(defaultPreferences);
        }
    } catch (error) {
        console.error("Error fetching preferences:", error);
        toast({ variant: 'destructive', title: 'Could not load your preferences.' });
    } finally {
        setIsPrefLoading(false);
    }
  }, [userId, toast]);
  
  const handlePrefChange = useCallback((id: string, value: any) => {
    setPreferences(p => ({ ...p, [id]: typeof value === 'function' ? value(p[id]) : value }));
  }, []);

  const handleEnergyPeakChange = useCallback((peak: string, checked: boolean) => {
    setPreferences(p => {
        const currentPeaks = p.energyPeaks || [];
        const newPeaks = checked ? [...currentPeaks, peak] : currentPeaks.filter((pk: string) => pk !== peak);
        return { ...p, energyPeaks: newPeaks };
    });
  }, []);

  const handleWorkDayToggle = useCallback((day: number) => {
    setPreferences(p => {
        const currentWorkDays = new Set(p.workDays || []);
        currentWorkDays.has(day) ? currentWorkDays.delete(day) : currentWorkDays.add(day);
        return { ...p, workDays: Array.from(currentWorkDays).sort() };
    });
  }, []);

  const handleSavePrefs = async () => {
    setIsSaving(true);
    const prefsToSave = { 
        ...preferences, 
        energyPeaks: Array.isArray(preferences.energyPeaks) ? preferences.energyPeaks.join(', ') : preferences.energyPeaks 
    };

    try {
        await setDoc(doc(db, 'userPreferences', userId), prefsToSave, { merge: true });
        toast({ title: 'Preferences Saved', description: 'Your settings have been updated for future use.' });
    } catch (error) {
        console.error("Error saving preferences:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your preferences.' });
    } finally {
        setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!open || !userId) return;
    
    fetchUserPreferences();

    const qTasks = query(collection(db, "scheduleItems"), where("userId", "==", userId), where("date", "==", null));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setInboxTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem)));
    });

    return () => unsubscribeTasks();
  }, [open, userId, fetchUserPreferences]);

  const handleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      newSet.has(taskId) ? newSet.delete(taskId) : newSet.add(taskId);
      return newSet;
    });
  }, []);

  const handleGenerate = async () => {
     if (!preferences) {
      toast({ variant: 'destructive', title: 'Preferences not loaded', description: "Could not generate a schedule without user preferences." });
      return;
    }
    setView('loading');
    setSuggestions(null);

    const allTasks = inboxTasks.filter(task => selectedTasks.has(task.id)).map(task => task.title);

    try {
      const aiPrefs = { ...preferences };
      if (!aiPrefs.sportEnabled) { aiPrefs.sportFrequency = 0; aiPrefs.sportDuration = 0; }
      if (!aiPrefs.meditationEnabled) { aiPrefs.meditationFrequency = 0; aiPrefs.meditationDuration = 0; }
      if (!aiPrefs.readingEnabled) { aiPrefs.readingFrequency = 0; aiPrefs.readingDuration = 0; }
      
      const result = await generateSchedule({ tasks: allTasks, preferences: { ...aiPrefs, energyPeaks: Array.isArray(aiPrefs.energyPeaks) ? aiPrefs.energyPeaks.join(', ') : aiPrefs.energyPeaks } as any, startDate: format(new Date(), 'yyyy-MM-dd'), numberOfDays }, userId);

      if (typeof result === 'string') {
        toast({ variant: 'destructive', title: "Generation Error", description: result });
        setView('form');
      } else if (result) {
        setSuggestions(result);
        setView('results');
      } else {
        toast({ variant: 'destructive', title: "Generation Error", description: "The service did not return a result." });
        setView('form');
      }
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'An unexpected error occurred' });
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
            color: type === 'task' ? 'hsl(var(--primary))' : 'hsl(204, 70%, 53%)',
        });
        toast({ title: 'Event Added', description: `"${slot.task}" was added to your calendar.` });
        
        setSuggestions(prev => {
            if (!prev) return null;
            if (type === 'task') return {...prev, tasks: prev.tasks.filter(s => s !== slot)};
            return {...prev, routineEvents: prev.routineEvents.filter(s => s !== slot)};
        });

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add event to calendar.' });
    }
  }, [userId, toast]);

  const handleAddAll = useCallback(() => {
    if (!suggestions) return;
    const allEvents = [...suggestions.tasks, ...suggestions.routineEvents];
    allEvents.forEach(slot => handleAddEvent(slot, suggestions.tasks.includes(slot) ? 'task' : 'routine'));
  }, [suggestions, handleAddEvent]);
  
  const resetState = useCallback(() => {
    setView('form');
    setSelectedTasks(new Set());
    setSuggestions(null);
  }, []);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  }, [resetState, onOpenChange]);

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const renderContent = () => {
    switch (view) {
        case 'loading': return <div className="h-[70vh]"><GenerationProgress /></div>;
        case 'results': return (
            <>
                <div className="my-4 flex-1 flex flex-col min-h-0 h-[70vh]">
                    <h3 className="font-semibold mb-4 text-lg">Your new schedule</h3>
                    <ScrollArea className="flex-1 pr-4">
                        {!suggestions || (suggestions.tasks.length === 0 && suggestions.routineEvents.length === 0) ? (
                        <p className="text-sm text-muted-foreground text-center pt-10">All suggested events have been added to your calendar.</p>
                        ) : (
                        <>
                            <SuggestionList title="Tasks" items={suggestions.tasks} type="task" onAddEvent={handleAddEvent} />
                            <SuggestionList title="Routine" items={suggestions.routineEvents} type="routine" onAddEvent={handleAddEvent} />
                        </>
                        )}
                    </ScrollArea>
                </div>
                 <DialogFooter className="justify-between pt-4 border-t">
                    <div>{(suggestions?.tasks?.length || 0) + (suggestions?.routineEvents?.length || 0) > 0 && (<Button variant="outline" onClick={handleAddAll}>Add All</Button>)}</div>
                    <div>
                        <Button variant="ghost" onClick={resetState}>Start Over</Button>
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
                </DialogFooter>
            </>
        );
        case 'form':
        default: 
            return (
                <>
                <ScrollArea className="h-[70vh] pr-6 -mr-6">
                    <div className="space-y-4 my-4">
                        <div>
                            <Label className="font-semibold">1. Select tasks from inbox</Label>
                            <Card className="mt-2 max-h-[200px] flex flex-col"><CardContent className="p-2 flex-1 overflow-hidden"><ScrollArea className="h-full pr-4"><div className="space-y-2">
                                {inboxTasks.length > 0 ? (inboxTasks.map(task => (<div key={task.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted"><Checkbox id={`task-${task.id}`} onCheckedChange={() => handleTaskSelection(task.id)} checked={selectedTasks.has(task.id)} /><Label htmlFor={`task-${task.id}`} className="flex-1 truncate cursor-pointer">{task.title}</Label></div>))) 
                                : (<p className="text-sm text-muted-foreground text-center py-4">Your inbox is empty.</p>)}
                            </div></ScrollArea></CardContent></Card>
                        </div>
                        
                        <div>
                            <div className='flex items-center justify-between'>
                                <Label className="font-semibold">2. Adjust preferences for this generation</Label>
                                <Button variant="ghost" size="sm" onClick={handleSavePrefs} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Save className="mr-2 size-4" />}
                                    Save for later
                                </Button>
                            </div>
                            <div className='space-y-4 mt-2'>
                                <div className="p-4 rounded-lg border bg-card/50 space-y-4">
                                     <div>
                                        <Label htmlFor="mainGoals" className="font-semibold">Main goals for this period?</Label>
                                        <Textarea id="mainGoals" placeholder="e.g., Launch new project, prepare for marathon, read 3 books." value={preferences.mainGoals ?? ''} onChange={e => handlePrefChange('mainGoals', e.target.value)} className="mt-2" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1"><Label>Sleep Time Range</Label><span className="text-sm font-medium text-primary">{preferences.sleepTimeRange?.[0]}:00 - {preferences.sleepTimeRange?.[1]}:00</span></div>
                                        <Slider value={preferences.sleepTimeRange} onValueChange={(value) => handlePrefChange('sleepTimeRange', value)} min={0} max={24} step={1} />
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-center"><Label>Meals per day</Label><span className="text-sm font-medium text-primary">{preferences.mealsPerDay}</span></div>
                                            <Slider value={[preferences.mealsPerDay]} onValueChange={(value) => handlePrefChange('mealsPerDay', value[0])} min={1} max={5} step={1} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-center"><Label>Rest time (hours)</Label><span className="text-sm font-medium text-primary">{preferences.restTime}</span></div>
                                            <Slider value={[preferences.restTime]} onValueChange={(value) => handlePrefChange('restTime', value[0])} min={0} max={8} step={0.5} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Work days</Label>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            {weekDays.map((day, index) => (
                                                <Button key={day} variant={preferences.workDays?.includes(index) ? 'default' : 'outline'} size="icon" className="h-8 w-8 rounded-full text-xs" onClick={() => handleWorkDayToggle(index)}>{day}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className='flex-1'><Label htmlFor="workStartTime">Work Start</Label><Input id="workStartTime" type="time" value={preferences.workStartTime} onChange={e => handlePrefChange('workStartTime', e.target.value)} className="mt-1"/></div>
                                        <div className='flex-1'><Label htmlFor="workEndTime">Work End</Label><Input id="workEndTime" type="time" value={preferences.workEndTime} onChange={e => handlePrefChange('workEndTime', e.target.value)} className="mt-1"/></div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>When are your energy peaks?</Label>
                                        <div className="flex items-center space-x-4">
                                            {['Morning', 'Afternoon', 'Evening'].map(peak => (
                                                <div key={peak} className="flex items-center space-x-2">
                                                    <Checkbox id={`gen-peak-${peak}`} checked={(preferences.energyPeaks || []).includes(peak)} onCheckedChange={(checked) => handleEnergyPeakChange(peak, !!checked)} />
                                                    <Label htmlFor={`gen-peak-${peak}`}>{peak}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <HabitBuilder habitName="Sport" habitKey="sport" icon={Dumbbell} preferences={preferences} onPrefChange={handlePrefChange} />
                                <HabitBuilder habitName="Meditation" habitKey="meditation" icon={Brain} preferences={preferences} onPrefChange={handlePrefChange} />
                                <HabitBuilder habitName="Reading" habitKey="reading" icon={BookOpen} preferences={preferences} onPrefChange={handlePrefChange} />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                  <DialogFooter className="justify-between pt-4 border-t">
                      <div className="flex items-center gap-4">
                          <Label htmlFor="numberOfDays" className="whitespace-nowrap">Generate for</Label>
                          <Input id="numberOfDays" type="number" value={numberOfDays} onChange={e => setNumberOfDays(parseInt(e.target.value, 10) || 1)} min="1" max="14" className="w-20" />
                          <Label htmlFor="numberOfDays" className="whitespace-nowrap">days</Label>
                      </div>
                      <Button onClick={handleGenerate} disabled={isPrefLoading}>
                        {isPrefLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Generate Schedule
                      </Button>
                  </DialogFooter>
                </>
            );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-full flex flex-col p-0 h-[90vh]">
        <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />Schedule Generator</DialogTitle>
            <DialogDescription>The planning assistant will help you create the perfect schedule based on your tasks and saved preferences.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}
