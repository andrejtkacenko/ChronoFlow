
'use-client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { addTask } from '@/lib/client-actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    label: string;
    completed: boolean;
    userId: string;
}

const TaskItem = ({ task, onCompletionChange }: { task: Task, onCompletionChange: (id: string, completed: boolean) => void }) => {
    return (
        <div className="flex items-center space-x-3 bg-card p-2 rounded-md">
            <Checkbox
                id={task.id}
                checked={task.completed}
                onCheckedChange={(checked) => onCompletionChange(task.id, !!checked)}
            />
            <label
                htmlFor={task.id}
                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.completed ? 'line-through text-muted-foreground' : ''}`}
            >
                {task.label}
            </label>
        </div>
    );
}

interface InboxProps {
    userId: string;
}

export default function Inbox({ userId }: InboxProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskLabel, setNewTaskLabel] = useState('');
    const { toast } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, "tasks"), 
            where("userId", "==", userId),
            orderBy("label")
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasksData: Task[] = [];
            querySnapshot.forEach((doc) => {
                const task = { id: doc.id, ...doc.data() } as Task;
                if (!task.completed) {
                    tasksData.push(task);
                }
            });
            setTasks(tasksData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (isAddingTask) {
            inputRef.current?.focus();
        }
    }, [isAddingTask]);

    const handleTaskCompletion = async (taskId: string, completed: boolean) => {
        const taskRef = doc(db, "tasks", taskId);
        try {
            await updateDoc(taskRef, { completed });
        } catch (error) {
            console.error("Error updating task: ", error);
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskLabel.trim()) {
            setIsAddingTask(false);
            return;
        }

        try {
            await addTask(newTaskLabel, userId);
            setNewTaskLabel('');
            toast({
                title: "Task Added",
                description: `"${newTaskLabel}" has been added to your inbox.`,
            });
        } catch (error) {
            console.error("Error adding task: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to add task. Please try again.",
            });
        } finally {
            setIsAddingTask(false);
        }
    }

    if (loading) {
        return (
             <div className="flex-1 flex flex-col h-full">
                <h2 className="text-xl font-semibold mb-4 px-4">Inbox</h2>
                <div className="flex-1 overflow-hidden">
                    <div className="space-y-4 px-4">
                        <div className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4 rounded-sm" />
                            <Skeleton className="h-4 w-[250px]" />
                        </div>
                         <div className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4 rounded-sm" />
                            <Skeleton className="h-4 w-[200px]" />
                        </div>
                         <div className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4 rounded-sm" />
                            <Skeleton className="h-4 w-[280px]" />
                        </div>
                         <div className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4 rounded-sm" />
                            <Skeleton className="h-4 w-[220px]" />
                        </div>
                         <div className="flex items-center space-x-3">
                            <Skeleton className="h-4 w-4 rounded-sm" />
                            <Skeleton className="h-4 w-[180px]" />
                        </div>
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
                    <Button variant="ghost" size="icon" onClick={() => setIsAddingTask(true)} className={cn("h-8 w-8", isAddingTask && "hidden")}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {isAddingTask && (
                     <form onSubmit={handleAddTask} className="flex items-center gap-2 mb-4">
                        <Input 
                            ref={inputRef}
                            value={newTaskLabel}
                            onChange={(e) => setNewTaskLabel(e.target.value)}
                            placeholder="Add a new task..."
                            className="h-9"
                            onBlur={(e) => {
                                // Only submit on blur if there is text, otherwise just close
                                if (!e.relatedTarget) { // To prevent blur when clicking submit
                                    if(newTaskLabel.trim()) {
                                        handleAddTask(e);
                                    } else {
                                        setIsAddingTask(false);
                                    }
                                }
                            }}
                        />
                         <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </form>
                )}
            </div>
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4 px-4">
                        {tasks.length > 0 ? tasks.map(task => (
                           <TaskItem key={task.id} task={task} onCompletionChange={handleTaskCompletion} />
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No tasks in your inbox.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
