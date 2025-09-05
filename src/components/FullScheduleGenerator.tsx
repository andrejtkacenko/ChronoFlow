
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
import { Loader2, Wand2, PlusCircle, ArrowLeft, Bed, Utensils, Coffee, CheckCircle2, Dumbbell, Brain, BookOpen, Briefcase, Target, Smile, Zap, Edit2 } from 'lucide-react';
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

// Main Component
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
  energyPeaks: [] as string[],
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

type GenerationStep = 'routine' | 'tasks' | 'done';
type ViewType = 'form' | 'results' | 'loading';
type EditingSection = 'daily' | 'habits' | 'work' | 'productivity' | null;


const GenerationProgress = memo(() => {
    const [step, setStep] = useState<GenerationStep>('routine');
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

const ResultsView = memo(({ suggestions, onSetView, onAddEvent, onAddAll, onResetState, onOpenChange }: { suggestions: GenerateFullScheduleOutput | null; onSetView: (view: ViewType) => void; onAddEvent: (slot: SuggestedSlot, type: 'task' | 'routine') => void; onAddAll: () => void; onResetState: () => void; onOpenChange: (open: boolean) => void; }) => (
  <>
    <div className="my-4 flex-1 flex flex-col min-h-0">
      <Button variant="ghost" onClick={() => onSetView('form')} className="self-start mb-2"><ArrowLeft className="mr-2 h-4 w-4" />Back to editor</Button>
      <h3 className="font-semibold mb-4 text-lg">Your new schedule</h3>
      <ScrollArea className="flex-1 pr-4">
        {!suggestions || (suggestions.tasks.length === 0 && suggestions.routineEvents.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center pt-10">All suggested events have been added to your calendar.</p>
        ) : (
          <>
            <SuggestionList title="Tasks" items={suggestions.tasks} type="task" onAddEvent={onAddEvent} />
            <SuggestionList title="Routine" items={suggestions.routineEvents} type="routine" onAddEvent={onAddEvent} />
          </>
        )}
      </ScrollArea>
    </div>
    <DialogFooter className="justify-between pt-4 border-t">
      <div>{(suggestions?.tasks?.length || 0) + (suggestions?.routineEvents?.length || 0) > 0 && (<Button variant="outline" onClick={onAddAll}>Add All</Button>)}</div>
      <div>
        <Button variant="ghost" onClick={onResetState}>Start Over</Button>
        <Button onClick={() => onOpenChange(false)}>Close</Button>
      </div>
    </DialogFooter>
  </>
));
ResultsView.displayName = 'ResultsView';


// --- Editing Components ---

const EditSectionHeader = ({ title, onBack }: { title: string; onBack: () => void; }) => (
    <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" onClick={onBack}><ArrowLeft /></Button>
        <h4 className="font-semibold text-lg">{title}</h4>
    </div>
);

const EditDailyNeeds = memo(({ preferences, handlePrefChange, onBack } : { preferences: any, handlePrefChange: (id: string, val: any) => void, onBack: () => void}) => (
    <div>
        <EditSectionHeader title="Daily Needs" onBack={onBack} />
        <div className="space-y-6">
            <div>
                <div className="flex justify-between items-center mb-1"><Label>Sleep (hours)</Label><span className="text-sm font-medium text-primary">{preferences.sleepDuration}</span></div>
                <Slider value={[preferences.sleepDuration ?? 8]} onValueChange={value => handlePrefChange('sleepDuration', value[0])} min={4} max={12} step={1} />
            </div>
            <div>
                <div className="flex justify-between items-center mb-1"><Label>Meals (per day)</Label><span className="text-sm font-medium text-primary">{preferences.mealsPerDay}</span></div>
                <Slider value={[preferences.mealsPerDay ?? 3]} onValueChange={value => handlePrefChange('mealsPerDay', value[0])} min={1} max={6} step={1} />
            </div>
            <div>
                <div className="flex justify-between items-center mb-1"><Label>Rest (hours, besides sleep)</Label><span className="text-sm font-medium text-primary">{preferences.restTime}</span></div>
                <Slider value={[preferences.restTime ?? 2]} onValueChange={value => handlePrefChange('restTime', value[0])} min={1} max={5} step={0.5} />
            </div>
        </div>
    </div>
));
EditDailyNeeds.displayName = 'EditDailyNeeds';

const HabitBuilder = memo(({ habitName, habitKey, icon: Icon, isEnabled, frequency, duration, preferredTime, onPrefChange }: { habitName: string; habitKey: string; icon: React.ElementType; isEnabled: boolean; frequency: number; duration: number; preferredTime: string; onPrefChange: (id: string, value: any) => void; }) => (
    <div className="p-3 rounded-lg border bg-secondary/50">
        <div className="flex items-center justify-between">
            <Label htmlFor={`habit-switch-${habitKey}`} className="flex items-center gap-2 font-semibold"><Icon className="size-5 text-primary" />{habitName}</Label>
            <Switch id={`habit-switch-${habitKey}`} checked={isEnabled} onCheckedChange={(checked) => onPrefChange(`${habitKey}Enabled`, checked)} />
        </div>
        {isEnabled && (
            <div className="mt-4 space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1"><Label>Frequency (per week)</Label><span className="text-sm font-medium text-primary">{frequency}</span></div>
                    <Slider value={[frequency]} onValueChange={(value) => onPrefChange(`${habitKey}Frequency`, value[0])} min={1} max={7} step={1} />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1"><Label>Duration (minutes)</Label><span className="text-sm font-medium text-primary">{duration}</span></div>
                    <Slider value={[duration]} onValueChange={(value) => onPrefChange(`${habitKey}Duration`, value[0])} min={15} max={120} step={15} />
                </div>
                <div>
                    <Label>Preferred Time</Label>
                    <Select value={preferredTime} onValueChange={(value) => onPrefChange(`${habitKey}PreferredTime`, value)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select time" /></SelectTrigger>
                        <SelectContent><SelectItem value="Любое">Any</SelectItem><SelectItem value="Утро">Morning</SelectItem><SelectItem value="День">Afternoon</SelectItem><SelectItem value="Вечер">Evening</SelectItem></SelectContent>
                    </Select>
                </div>
            </div>
        )}
    </div>
));
HabitBuilder.displayName = 'HabitBuilder';

const EditHabits = memo(({ preferences, handlePrefChange, onBack }: { preferences: any, handlePrefChange: (id: string, val: any) => void, onBack: () => void}) => (
    <div>
        <EditSectionHeader title="Habits & Hobbies" onBack={onBack} />
        <div className="space-y-4">
            <HabitBuilder habitName="Sport" habitKey="sport" icon={Dumbbell} {...preferences} onPrefChange={handlePrefChange} />
            <HabitBuilder habitName="Meditation" habitKey="meditation" icon={Brain} {...preferences} onPrefChange={handlePrefChange} />
            <HabitBuilder habitName="Reading" habitKey="reading" icon={BookOpen} {...preferences} onPrefChange={handlePrefChange} />
        </div>
    </div>
));
EditHabits.displayName = 'EditHabits';

const EditWorkSchedule = memo(({ preferences, handlePrefChange, handleWorkDayToggle, onBack }: { preferences: any, handlePrefChange: (id: string, val: any) => void, handleWorkDayToggle: (day: number) => void, onBack: () => void}) => {
    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    return (
        <div>
            <EditSectionHeader title="Work/Study Schedule" onBack={onBack} />
            <div className="space-y-4">
                <div>
                    <Label>Work days</Label>
                    <div className="flex items-center gap-1.5 mt-2">
                        {weekDays.map((day, index) => (
                            <Button key={day} variant={preferences.workDays?.includes(index) ? 'primary' : 'outline'} size="icon" className="h-9 w-9 rounded-full" onClick={() => handleWorkDayToggle(index)}>{day}</Button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div><Label htmlFor="workStartTime">Start</Label><Input id="workStartTime" type="time" value={preferences.workStartTime} onChange={e => handlePrefChange('workStartTime', e.target.value)} className="mt-1"/></div>
                    <div><Label htmlFor="workEndTime">End</Label><Input id="workEndTime" type="time" value={preferences.workEndTime} onChange={e => handlePrefChange('workEndTime', e.target.value)} className="mt-1"/></div>
                </div>
            </div>
        </div>
    )
});
EditWorkSchedule.displayName = 'EditWorkSchedule';

const EditProductivity = memo(({ preferences, handlePrefChange, handleEnergyPeakChange, onBack }: { preferences: any, handlePrefChange: (id: string, val: any) => void, handleEnergyPeakChange: (peak: string, checked: boolean) => void, onBack: () => void}) => (
    <div>
        <EditSectionHeader title="Productivity & Learning" onBack={onBack} />
        <div className="space-y-4">
            <div className="grid gap-2">
                <Label>When are your energy peaks?</Label>
                <div className="flex items-center space-x-4">
                    {['Morning', 'Afternoon', 'Evening'].map(peak => (
                        <div key={peak} className="flex items-center space-x-2">
                            <Checkbox id={`peak-${peak}`} checked={(preferences.energyPeaks || []).includes(peak)} onCheckedChange={(checked) => handleEnergyPeakChange(peak, !!checked)} />
                            <Label htmlFor={`peak-${peak}`}>{peak}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="fixedEventsText">Other fixed commitments?</Label>
                <Textarea id="fixedEventsText" placeholder="e.g., Team meeting every Mon at 10:00" value={preferences.fixedEventsText ?? ''} onChange={e => handlePrefChange('fixedEventsText', e.target.value)} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="pastLearnings">Past planning learnings/obstacles?</Label>
                <Textarea id="pastLearnings" placeholder="e.g., Better not to set more than 2 large tasks per day." value={preferences.pastLearnings ?? ''} onChange={e => handlePrefChange('pastLearnings', e.target.value)} />
            </div>
        </div>
    </div>
));
EditProductivity.displayName = 'EditProductivity';

const InteractiveSummary = memo(({ preferences, setEditingSection }: { preferences: any, setEditingSection: (section: EditingSection) => void }) => {
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activeHabits = [
        preferences.sportEnabled && "sport",
        preferences.meditationEnabled && "meditation",
        preferences.readingEnabled && "reading"
    ].filter(Boolean).join(", ");
    const workDaysString = preferences.workDays?.map((d: number) => weekDays[d]).join(', ') || 'no';

    const SummaryButton = ({ children }: { children: React.ReactNode }) => (
        <Button variant="link" className="p-0 h-auto text-base font-semibold text-primary">{children}</Button>
    );

    return (
        <div className="space-y-4 text-base text-muted-foreground p-1">
            <p>
                Each day includes <Button variant="link" className="p-0 h-auto text-base" onClick={() => setEditingSection('daily')}><span className="font-semibold text-primary">{preferences.sleepDuration} hours</span> of sleep</Button>, <Button variant="link" className="p-0 h-auto text-base" onClick={() => setEditingSection('daily')}><span className="font-semibold text-primary">{preferences.mealsPerDay} meals</span></Button>, and <Button variant="link" className="p-0 h-auto text-base" onClick={() => setEditingSection('daily')}><span className="font-semibold text-primary">{preferences.restTime} hours</span> of rest</Button>.
            </p>
             <p>
                Work is scheduled on <Button variant="link" className="p-0 h-auto text-base" onClick={() => setEditingSection('work')}><span className="font-semibold text-primary">{workDaysString}</span> days</Button> from <Button variant="link" className="p-0 h-auto text-base" onClick={() => setEditingSection('work')}><span className="font-semibold text-primary">{preferences.workStartTime}</span> to <span className="font-semibold text-primary">{preferences.workEndTime}</span></Button>.
            </p>
            <p>
                Your energy peaks are in the <Button variant="link" className="p-0 h-auto text-base" onClick={() => setEditingSection('productivity')}><span className="font-semibold text-primary">{preferences.energyPeaks?.join(', ') || 'not set'}</span></Button>.
            </p>
            <p>
                Your habits are: <Button variant="link" className="p-0 h-auto text-base" onClick={() => setEditingSection('habits')}><span className="font-semibold text-primary">{activeHabits || "none"}</span></Button>.
            </p>
             <p className="text-sm pt-4">
                To adjust any of these settings, click on the highlighted text. You can also edit your fixed events or past learnings in the <Button variant="link" className="p-0 h-auto text-sm" onClick={() => setEditingSection('productivity')}>Productivity</Button> section.
            </p>
        </div>
    );
});
InteractiveSummary.displayName = 'InteractiveSummary';


const FormView = memo(({ inboxTasks, selectedTasks, onTaskSelection, preferences, isPrefLoading, numberOfDays, onPrefChange, onEnergyPeakChange, onWorkDayToggle, onNumberOfDaysChange, onGenerate }: { inboxTasks: ScheduleItem[]; selectedTasks: Set<string>; onTaskSelection: (taskId: string) => void; preferences: Record<string, any>; isPrefLoading: boolean; numberOfDays: number; onPrefChange: (id: string, value: any) => void; onEnergyPeakChange: (peak: string, checked: boolean) => void; onWorkDayToggle: (day: number) => void; onNumberOfDaysChange: (days: number) => void; onGenerate: () => void; }) => {
    const [editingSection, setEditingSection] = useState<EditingSection>(null);

    const renderRightPane = () => {
        if (isPrefLoading) {
            return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
        }

        switch (editingSection) {
            case 'daily': return <EditDailyNeeds preferences={preferences} handlePrefChange={onPrefChange} onBack={() => setEditingSection(null)} />;
            case 'habits': return <EditHabits preferences={preferences} handlePrefChange={onPrefChange} onBack={() => setEditingSection(null)} />;
            case 'work': return <EditWorkSchedule preferences={preferences} handlePrefChange={onPrefChange} handleWorkDayToggle={onWorkDayToggle} onBack={() => setEditingSection(null)} />;
            case 'productivity': return <EditProductivity preferences={preferences} handlePrefChange={onPrefChange} handleEnergyPeakChange={onEnergyPeakChange} onBack={() => setEditingSection(null)} />;
            default: return <InteractiveSummary preferences={preferences} setEditingSection={setEditingSection} />;
        }
    }

    return (
        <>
            <div className="grid md:grid-cols-2 gap-8 my-4 flex-1 min-h-0">
                {/* Left Pane */}
                <div className="flex flex-col gap-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Target /> What are we doing?</h3>
                        <div className="space-y-4">
                            <div>
                                <Label className="font-semibold">Select tasks from inbox</Label>
                                <Card className="mt-2 max-h-[150px] flex flex-col"><CardContent className="p-2 flex-1 overflow-hidden"><ScrollArea className="h-full pr-4"><div className="space-y-2">
                                    {inboxTasks.length > 0 ? (inboxTasks.map(task => (<div key={task.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted"><Checkbox id={`task-${task.id}`} onCheckedChange={() => onTaskSelection(task.id)} checked={selectedTasks.has(task.id)} /><Label htmlFor={`task-${task.id}`} className="flex-1 truncate cursor-pointer">{task.title}</Label></div>))) 
                                    : (<p className="text-sm text-muted-foreground text-center py-4">Your inbox is empty.</p>)}
                                </div></ScrollArea></CardContent></Card>
                            </div>
                             <div>
                                <Label htmlFor="mainGoals" className="font-semibold">What are your main goals for this period?</Label>
                                <Textarea id="mainGoals" placeholder="e.g., Launch new project, prepare for marathon, read 3 books." value={preferences.mainGoals ?? ''} onChange={e => onPrefChange('mainGoals', e.target.value)} className="mt-2 min-h-[100px]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Pane */}
                <div className="bg-secondary/50 p-4 rounded-lg">
                    <ScrollArea className="h-full pr-4">
                        {renderRightPane()}
                    </ScrollArea>
                </div>
            </div>
            <DialogFooter className="justify-between pt-4 border-t">
                <div className="flex items-center gap-4">
                    <Label htmlFor="numberOfDays" className="whitespace-nowrap">Generate for</Label>
                    <Input id="numberOfDays" type="number" value={numberOfDays} onChange={e => onNumberOfDaysChange(parseInt(e.target.value, 10) || 1)} min="1" max="14" className="w-20" />
                    <Label htmlFor="numberOfDays" className="whitespace-nowrap">days</Label>
                </div>
                <Button onClick={onGenerate} disabled={selectedTasks.size === 0}><Wand2 className="mr-2 h-4 w-4" />Generate Schedule</Button>
            </DialogFooter>
        </>
    );
});
FormView.displayName = 'FormView';


export default function FullScheduleGenerator({ open, onOpenChange, userId }: FullScheduleGeneratorProps) {
  const { toast } = useToast();
  const [view, setView] = useState<ViewType>('form');
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
    if (selectedTasks.size === 0) {
      toast({ variant: 'destructive', title: 'Please select at least one task' });
      return;
    }
    setView('loading');
    setSuggestions(null);

    const prefsToSave = { ...preferences, energyPeaks: Array.isArray(preferences.energyPeaks) ? preferences.energyPeaks.join(', ') : preferences.energyPeaks };
    
    try {
        await setDoc(doc(db, 'userPreferences', userId), prefsToSave, { merge: true });
    } catch (error) {
        console.error("Error saving preferences:", error);
        toast({ variant: 'destructive', title: 'Could not save your preferences.' });
    }

    const allTasks = inboxTasks.filter(task => selectedTasks.has(task.id)).map(task => task.title);

    try {
      const aiPrefs = { ...preferences };
      if (!aiPrefs.sportEnabled) { aiPrefs.sportFrequency = 0; aiPrefs.sportDuration = 0; }
      if (!aiPrefs.meditationEnabled) { aiPrefs.meditationFrequency = 0; aiPrefs.meditationDuration = 0; }
      if (!aiPrefs.readingEnabled) { aiPrefs.readingFrequency = 0; aiPrefs.readingDuration = 0; }
      
      const result = await generateSchedule({ tasks: allTasks, preferences: { ...aiPrefs, energyPeaks: Array.isArray(aiPrefs.energyPeaks) ? aiPrefs.energyPeaks.join(', ') : aiPrefs.energyPeaks }, startDate: format(new Date(), 'yyyy-MM-dd'), numberOfDays }, userId);

      if (typeof result === 'string') {
        toast({ variant: 'destructive', title: "Generation Error", description: result });
        setView('form');
      } else if (result) {
        setSuggestions(result);
        setView('results');
      } else {
        toast({ variant: 'destructive', title: "Generation Error", description: "The AI did not return a result." });
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
    fetchUserPreferences();
  }, [fetchUserPreferences]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  }, [resetState, onOpenChange]);

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
  
  const renderContent = () => {
    switch (view) {
        case 'loading': return <div className="h-full"><GenerationProgress /></div>;
        case 'results': return <ResultsView suggestions={suggestions} onSetView={setView} onAddEvent={handleAddEvent} onAddAll={handleAddAll} onResetState={resetState} onOpenChange={handleOpenChange} />;
        case 'form':
        default: return <FormView inboxTasks={inboxTasks} selectedTasks={selectedTasks} onTaskSelection={handleTaskSelection} preferences={preferences} isPrefLoading={isPrefLoading} numberOfDays={numberOfDays} onPrefChange={handlePrefChange} onEnergyPeakChange={handleEnergyPeakChange} onWorkDayToggle={handleWorkDayToggle} onNumberOfDaysChange={setNumberOfDays} onGenerate={handleGenerate} />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" />Schedule Generator</DialogTitle>
          <DialogDescription>The AI assistant will help you create the perfect schedule. Select tasks and adjust your preferences.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}

    