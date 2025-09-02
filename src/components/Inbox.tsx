
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import type { ScheduleItem } from '@/lib/types';
import { cn } from '@/lib/utils';


interface TaskItemProps { 
    task: ScheduleItem, 
    onCompletionChange: (id: string, completed: boolean) => void,
    onTaskClick: (task: ScheduleItem) => void
}

const TaskItem = ({ task, onCompletionChange, onTaskClick }: TaskItemProps) => {
    
    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCompletionChange(task.id, !task.completed);
    }

    return (
        <div 
            className="flex items-center space-x-3 bg-card p-2 rounded-md group cursor-pointer hover:bg-muted/80"
            onClick={() => onTaskClick(task)}
        >
            <Checkbox
                id={task.id}
                checked={task.completed}
                onCheckedChange={(checked) => onCompletionChange(task.id, !!checked)}
                onClick={(e) => e.stopPropagation()} // prevent click from bubbling to the div
            />
            <label
                htmlFor={task.id}
                className={cn(
                    "flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer",
                    task.completed && 'line-through text-muted-foreground'
                )}
            >
                {task.title}
            </label>
        </div>
    );
}

interface InboxProps {
    userId: string;
    onNewTask: () => void;
    onEditTask: (task: ScheduleItem) => void;
}

export default function Inbox({ userId, onNewTask, onEditTask }: InboxProps) {
    const [tasks, setTasks] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, "scheduleItems"), 
            where("userId", "==", userId),
            where("date", "==", null) // This is how we identify unscheduled tasks
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasksData: ScheduleItem[] = [];
            querySnapshot.forEach((doc) => {
                tasksData.push({ id: doc.id, ...doc.data() } as ScheduleItem);
            });
            // Show uncompleted tasks first, then sort alphabetically
            tasksData.sort((a, b) => {
                if (a.completed !== b.completed) {
                    return a.completed ? 1 : -1;
                }
                return a.title.localeCompare(b.title);
            });
            setTasks(tasksData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const handleTaskCompletion = async (taskId: string, completed: boolean) => {
        const taskRef = doc(db, "scheduleItems", taskId);
        try {
            await updateDoc(taskRef, { completed });
        } catch (error) {
            console.error("Error updating task completion: ", error);
        }
    };

    if (loading) {
        return (
             <div className="flex-1 flex flex-col h-full">
                <h2 className="text-xl font-semibold mb-4 px-4">Inbox</h2>
                <div className="flex-1 overflow-hidden">
                    <div className="space-y-4 px-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-3">
                              <Skeleton className="h-4 w-4 rounded-sm" />
                              <Skeleton className="h-4 w-full" style={{width: `${Math.random() * 50 + 40}%`}} />
                          </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold">Inbox</h2>
                    <Button variant="ghost" size="icon" onClick={onNewTask} className="h-8 w-8">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-2 px-4">
                        {tasks.length > 0 ? tasks.map(task => (
                           <TaskItem 
                                key={task.id} 
                                task={task} 
                                onCompletionChange={handleTaskCompletion}
                                onTaskClick={onEditTask}
                            />
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No tasks in your inbox.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
