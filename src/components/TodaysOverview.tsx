
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import type { ScheduleItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { iconMap } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

const EventItem = ({ item }: { item: ScheduleItem }) => {
    const { toast } = useToast();
    const Icon = iconMap[item.icon || 'Default'] || iconMap.Default;
    const isTask = item.type === 'task';
    const isCompleted = isTask && item.completed;
    
    const handleCompletionChange = async (completed: boolean) => {
        try {
            const itemRef = doc(db, "scheduleItems", item.id);
            await updateDoc(itemRef, { completed });
            toast({
                title: completed ? 'Task Completed!' : 'Task Marked as Incomplete',
                description: `"${item.title}"`,
            });
        } catch (error) {
            console.error("Error updating task status:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not update task status.',
            });
        }
    };

    return (
        <div className={cn("flex items-center gap-4 py-3", isCompleted && "opacity-60")}>
             <div className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0" style={{backgroundColor: item.color ? item.color.replace(')', ', 0.1)').replace('hsl', 'hsla') : undefined}}>
                <Icon className="size-5" style={{color: item.color ?? undefined}} />
            </div>
            <div className="flex-1">
                <p className={cn("font-semibold", isCompleted && "line-through")}>{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.startTime} - {item.endTime}</p>
            </div>
            {isTask && (
                <Checkbox 
                    checked={item.completed} 
                    onCheckedChange={handleCompletionChange}
                    aria-label={`Mark ${item.title} as ${item.completed ? 'incomplete' : 'complete'}`}
                />
            )}
        </div>
    )
}


export default function TodaysOverview() {
    const { user } = useAuth();
    const [todaysItems, setTodaysItems] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [today, setToday] = useState(new Date());

    useEffect(() => {
        // Ensure this only runs on the client to avoid hydration mismatch
        setToday(new Date());
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        };

        const todayStr = format(today, 'yyyy-MM-dd');
        const q = query(
            collection(db, "scheduleItems"), 
            where("userId", "==", user.uid),
            where("date", "==", todayStr)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items: ScheduleItem[] = [];
            snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as ScheduleItem));
            items.sort((a,b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
            setTodaysItems(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching today's items: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, today]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Today's Agenda</CardTitle>
                <CardDescription>Here are the events and tasks you have for today.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                           <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                           </div>
                        ))}
                    </div>
                ) : todaysItems.length > 0 ? (
                    <div className="divide-y">
                        {todaysItems.map(item => (
                            <EventItem key={item.id} item={item} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                        <p className="font-semibold">Looks like a clear day!</p>
                        <p className="text-sm mt-1">You have no events or tasks scheduled for today.</p>
                        <Button size="sm" className="mt-4" asChild>
                            <Link href="/schedule">Go to Schedule</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
