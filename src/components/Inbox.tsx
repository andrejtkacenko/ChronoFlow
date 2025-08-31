
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { addTask } from '@/lib/client-actions';
import { useToast } from '@/hooks/use-toast';

interface Task {
    id: string;
    label: string;
    completed: boolean;
}

export default function Inbox() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskLabel, setNewTaskLabel] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, "tasks"), orderBy("label"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const tasksData: Task[] = [];
            querySnapshot.forEach((doc) => {
                tasksData.push({ id: doc.id, ...doc.data() } as Task);
            });
            setTasks(tasksData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
        if (!newTaskLabel.trim()) return;

        try {
            await addTask(newTaskLabel);
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
                <h2 className="text-xl font-semibold mb-2">Inbox</h2>
                 <form onSubmit={handleAddTask} className="flex items-center gap-2 mb-4">
                    <Input 
                        value={newTaskLabel}
                        onChange={(e) => setNewTaskLabel(e.target.value)}
                        placeholder="Add a new task..."
                        className="h-9"
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
                        <Plus className="h-4 w-4" />
                    </Button>
                </form>
            </div>
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4 px-4">
                        {tasks.length > 0 ? tasks.map(task => (
                            <div key={task.id} className="flex items-center space-x-3">
                                <Checkbox
                                    id={task.id}
                                    checked={task.completed}
                                    onCheckedChange={(checked) => handleTaskCompletion(task.id, !!checked)}
                                />
                                <label
                                    htmlFor={task.id}
                                    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                                >
                                    {task.label}
                                </label>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No tasks in your inbox.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
