
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";

const tasks = [
    { id: 'task-1', label: 'Finalize quarterly report', completed: false },
    { id: 'task-2', label: 'Email team about new design mockups', completed: false },
    { id: 'task-3', label: 'Book flight for conference', completed: true },
    { id: 'task-4', label: 'Pick up groceries', completed: false },
    { id: 'task-5', label: 'Call the dentist', completed: false },
];

export default function Inbox() {
    return (
        <div className="flex-1 flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-4">Inbox</h2>
            <div className="flex-1 overflow-hidden rounded-lg border">
                <ScrollArea className="h-full p-4">
                    <div className="space-y-4">
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center space-x-3">
                                <Checkbox id={task.id} checked={task.completed} />
                                <label
                                    htmlFor={task.id}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {task.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
