
'use client';

import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useEffect, useState } from 'react';

const tips = [
    {
        title: "The Two-Minute Rule",
        description: "If a task takes less than two minutes to complete, do it immediately. It's a great way to build momentum and stop procrastination.",
    },
    {
        title: "Eat The Frog",
        description: "Tackle your most important and challenging task first thing in the morning. This ensures you make progress on what matters most.",
    },
    {
        title: "Time Blocking",
        description: "Schedule specific blocks of time for particular tasks or types of work in your calendar. This helps you focus and protects your time.",
    },
    {
        title: "The Pomodoro Technique",
        description: "Work in focused 25-minute intervals, separated by short breaks. This technique helps maintain high levels of concentration.",
    },
    {
        title: "Batch Similar Tasks",
        description: "Group similar small tasks together, like answering emails or making calls. This reduces context switching and improves efficiency.",
    },
];

export default function ProductivityTip() {
    const [tip, setTip] = useState({ title: '', description: '' });

    useEffect(() => {
        // Simple logic to show a new tip each day
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).valueOf()) / 86400000);
        setTip(tips[dayOfYear % tips.length]);
    }, []);

    if (!tip.title) return null;

    return (
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                <Lightbulb className="size-5 text-primary" />
                <CardTitle className="text-md font-semibold">
                    Productivity Tip
                </CardTitle>
            </CardHeader>
            <CardContent>
                <h4 className="font-semibold mb-1">{tip.title}</h4>
                <p className="text-sm text-muted-foreground">
                    {tip.description}
                </p>
            </CardContent>
        </Card>
    )
}
