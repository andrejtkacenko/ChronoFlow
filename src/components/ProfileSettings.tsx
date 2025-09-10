
'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Bed, Utensils, Coffee, Dumbbell, Brain, BookOpen, Briefcase, Target, Zap, User, Save } from 'lucide-react';
import { Slider } from './ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

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


export default function ProfileSettings({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Record<string, any>>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!userId) return;
      setIsLoading(true);
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
          setPreferences({ ...defaultPreferences, ...loadedPrefs });
        } else {
          setPreferences(defaultPreferences);
        }
      } catch (error) {
        console.error("Error fetching preferences:", error);
        toast({ variant: 'destructive', title: 'Could not load your preferences.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPreferences();
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

  const handleSave = async () => {
    setIsSaving(true);
    const prefsToSave = { 
        ...preferences, 
        energyPeaks: Array.isArray(preferences.energyPeaks) ? preferences.energyPeaks.join(', ') : preferences.energyPeaks 
    };

    try {
        await setDoc(doc(db, 'userPreferences', userId), prefsToSave, { merge: true });
        toast({ title: 'Preferences Saved', description: 'Your settings have been updated successfully.' });
    } catch (error) {
        console.error("Error saving preferences:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your preferences.' });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }
  
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <User className="size-8 text-primary"/>
                    Profile & Settings
                </h1>
                <p className="text-muted-foreground mt-1">Manage your global preferences here. They will be used by the AI to generate better schedules.</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Save className="mr-2 size-4" />}
                Save Changes
            </Button>
        </div>
      
        <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Target/> Goals & Tasks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="mainGoals" className="font-semibold">What are your main goals for this period?</Label>
                            <Textarea id="mainGoals" placeholder="e.g., Launch new project, prepare for marathon, read 3 books." value={preferences.mainGoals ?? ''} onChange={e => handlePrefChange('mainGoals', e.target.value)} className="mt-2 min-h-[100px]" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Bed/> Daily Needs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
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
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Dumbbell /> Habits & Hobbies</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <HabitBuilder habitName="Sport" habitKey="sport" icon={Dumbbell} preferences={preferences} onPrefChange={handlePrefChange} />
                        <HabitBuilder habitName="Meditation" habitKey="meditation" icon={Brain} preferences={preferences} onPrefChange={handlePrefChange} />
                        <HabitBuilder habitName="Reading" habitKey="reading" icon={BookOpen} preferences={preferences} onPrefChange={handlePrefChange} />
                    </CardContent>
                </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Briefcase /> Work/Study Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div>
                            <Label>Work days</Label>
                            <div className="flex items-center gap-1.5 mt-2">
                                {weekDays.map((day, index) => (
                                    <Button key={day} variant={preferences.workDays?.includes(index) ? 'default' : 'outline'} size="icon" className="h-9 w-9 rounded-full" onClick={() => handleWorkDayToggle(index)}>{day}</Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className='flex-1'><Label htmlFor="workStartTime">Start</Label><Input id="workStartTime" type="time" value={preferences.workStartTime} onChange={e => handlePrefChange('workStartTime', e.target.value)} className="mt-1"/></div>
                            <div className='flex-1'><Label htmlFor="workEndTime">End</Label><Input id="workEndTime" type="time" value={preferences.workEndTime} onChange={e => handlePrefChange('workEndTime', e.target.value)} className="mt-1"/></div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Zap/> Productivity & Learning</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
