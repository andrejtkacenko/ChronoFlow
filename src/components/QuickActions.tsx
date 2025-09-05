
'use client';

import { PlusCircle, Sparkles, Wand2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface ActionCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    onClick: () => void;
}

const ActionCard = ({ title, description, icon: Icon, onClick }: ActionCardProps) => (
    <button onClick={onClick} className="text-left p-4 rounded-lg bg-card border hover:bg-muted/80 transition-colors w-full h-full flex flex-col">
        <div className="flex-1">
             <div className="flex items-center gap-3">
                <Icon className="size-6 text-primary" />
                <h3 className="text-md font-semibold">{title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1 pl-9">
                {description}
            </p>
        </div>
    </button>
)

interface QuickActionsProps {
    onNewEvent: () => void;
    onSmartScheduler: () => void;
    onFullSchedule: () => void;
}

export default function QuickActions({ onNewEvent, onSmartScheduler, onFullSchedule }: QuickActionsProps) {
    const actions = [
        {
            title: 'New Event',
            description: 'Manually add an event to your calendar.',
            icon: PlusCircle,
            onClick: onNewEvent,
        },
        {
            title: 'Smart Scheduler',
            description: 'Find the best time slots for your new tasks.',
            icon: Sparkles,
            onClick: onSmartScheduler,
        },
        {
            title: 'AI Schedule Generator',
            description: 'Generate a full, multi-day schedule.',
            icon: Wand2,
            onClick: onFullSchedule,
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map(action => (
                <ActionCard key={action.title} {...action} />
            ))}
        </div>
    );
}
