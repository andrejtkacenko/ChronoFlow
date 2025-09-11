'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, User as UserIcon, Dumbbell, Brain, BookOpen, Bed, Utensils } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';


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

const HabitBuilder = ({ habitName, habitKey, icon: Icon, preferences, onPrefChange }: { habitName: string; habitKey: string; icon: React.ElementType; preferences: Record<string, any>; onPrefChange: (id: string, value: any) => void; }) => {
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
};


export default function ProfileSettings({ userId }: { userId: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [preferences, setPreferences] = useState<Record<string, any>>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  
  useEffect(() => {
      if (user) {
          setDisplayName(user.displayName || '');
          setPhotoURL(user.photoURL || '');
      }

      const fetchUserPreferences = async () => {
          if (!userId) return;
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
  }, [user, userId, toast]);

  const handlePrefChange = (id: string, value: any) => {
    setPreferences(p => ({ ...p, [id]: typeof value === 'function' ? value(p[id]) : value }));
  };

  const handleWorkDayToggle = (day: number) => {
    setPreferences(p => {
        const currentWorkDays = new Set(p.workDays || []);
        currentWorkDays.has(day) ? currentWorkDays.delete(day) : currentWorkDays.add(day);
        return { ...p, workDays: Array.from(currentWorkDays).sort() };
    });
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
        toast({ variant: 'destructive', title: 'Not authenticated.' });
        return;
    }
    setIsSaving(true);
    
    try {
        await updateProfile(auth.currentUser, {
            displayName: displayName,
            photoURL: photoURL
        });

        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            displayName: displayName,
            photoURL: photoURL,
            email: auth.currentUser.email
        }, { merge: true });

        const prefsToSave = { 
            ...preferences, 
            energyPeaks: Array.isArray(preferences.energyPeaks) ? preferences.energyPeaks.join(', ') : preferences.energyPeaks 
        };
        await setDoc(doc(db, 'userPreferences', userId), prefsToSave, { merge: true });

        toast({ title: 'Profile Updated', description: 'Your profile information has been saved.' });
    } catch (error) {
        console.error("Error saving profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save your profile.' });
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
  
  return (
    <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <UserIcon className="size-8 text-primary"/>
                    Profile
                </h1>
                <p className="text-muted-foreground mt-1">Manage your public profile and planning preferences.</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin"/> : <Save className="mr-2 size-4" />}
                Save Changes
            </Button>
        </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>User Information</CardTitle>
                        <CardDescription>This information will be displayed on your profile.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className='flex items-center gap-6'>
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={photoURL || undefined} alt="User Avatar" />
                                <AvatarFallback>{displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className='flex-1 space-y-2'>
                                <Label htmlFor="displayName">Display Name</Label>
                                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your Name" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="photoURL">Photo URL</Label>
                            <Input id="photoURL" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://example.com/avatar.png" />
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Goals & Learnings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="mainGoals">Main goals for this period?</Label>
                            <Textarea id="mainGoals" placeholder="e.g., Launch new project, prepare for marathon, read 3 books." value={preferences.mainGoals ?? ''} onChange={e => handlePrefChange('mainGoals', e.target.value)} className="mt-2" />
                        </div>
                        <div>
                            <Label htmlFor="pastLearnings">Learnings from past planning?</Label>
                            <Textarea id="pastLearnings" placeholder={`e.g., "Better not to set more than 2 large tasks per day", "Morning workouts give more energy."`} value={preferences.pastLearnings ?? ''} onChange={e => handlePrefChange('pastLearnings', e.target.value)} className="mt-2" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader><CardTitle>Planning Preferences</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {/* Work */}
                        <div className="p-4 rounded-lg border bg-card/50 space-y-4">
                            <h4 className="font-semibold">Work & Productivity</h4>
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
                             <div>
                                <Label>When are your energy peaks?</Label>
                                <Select value={preferences.energyPeaks} onValueChange={(value) => handlePrefChange('energyPeaks', value)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select period" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Morning">Morning</SelectItem>
                                        <SelectItem value="Afternoon">Afternoon</SelectItem>
                                        <SelectItem value="Evening">Evening</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                         {/* Foundational Habits */}
                        <div className="p-4 rounded-lg border bg-card/50 space-y-4">
                            <h4 className="font-semibold">Daily Routine</h4>
                             <div>
                                <div className="flex justify-between items-center mb-1"><Label className="flex items-center gap-2"><Bed className="size-5 text-primary"/>Sleep Time</Label><span className="text-sm font-medium text-primary">{preferences.sleepTimeRange?.[0]}:00 - {preferences.sleepTimeRange?.[1]}:00</span></div>
                                <Slider value={preferences.sleepTimeRange} onValueChange={(value) => handlePrefChange('sleepTimeRange', value)} min={0} max={24} step={1} />
                            </div>
                             <div>
                                <div className="flex justify-between items-center mb-1"><Label className="flex items-center gap-2"><Utensils className="size-5 text-primary"/>Meals per Day</Label><span className="text-sm font-medium text-primary">{preferences.mealsPerDay}</span></div>
                                <Slider value={[preferences.mealsPerDay]} onValueChange={(value) => handlePrefChange('mealsPerDay', value[0])} min={1} max={5} step={1} />
                            </div>
                             <div>
                                <div className="flex justify-between items-center mb-1"><Label className="flex items-center gap-2"><UserIcon className="size-5 text-primary"/>Daily Rest (hours)</Label><span className="text-sm font-medium text-primary">{preferences.restTime}</span></div>
                                <Slider value={[preferences.restTime]} onValueChange={(value) => handlePrefChange('restTime', value[0])} min={1} max={5} step={0.5} />
                            </div>
                        </div>
                        
                        {/* Optional Habits */}
                        <div className="space-y-4">
                            <HabitBuilder habitName="Sport" habitKey="sport" icon={Dumbbell} preferences={preferences} onPrefChange={handlePrefChange} />
                            <HabitBuilder habitName="Meditation" habitKey="meditation" icon={Brain} preferences={preferences} onPrefChange={handlePrefChange} />
                            <HabitBuilder habitName="Reading" habitKey="reading" icon={BookOpen} preferences={preferences} onPrefChange={handlePrefChange} />
                        </div>
                         <div className="p-4 rounded-lg border bg-card/50 space-y-2">
                             <Label htmlFor="fixedEventsText" className="font-semibold">Other recurring events</Label>
                             <Textarea id="fixedEventsText" placeholder={`e.g., "Team meeting every Mon at 10:00", "English lesson on Tue and Thu at 18:00"`} value={preferences.fixedEventsText ?? ''} onChange={e => handlePrefChange('fixedEventsText', e.target.value)} />
                        </div>
                    </CardContent>
                 </Card>
            </div>
        </div>
    </div>
  );
}
