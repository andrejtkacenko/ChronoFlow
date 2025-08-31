
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';

interface MiniCalendarProps {
    onDateSelect: (date: Date) => void;
}

export default function MiniCalendar({ onDateSelect }: MiniCalendarProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());

    const handleDateChange = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate);
            onDateSelect(newDate);
        }
    }

    return (
        <Card className="w-fit shadow-lg">
            <CardContent className="p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateChange}
                    className="rounded-md"
                    classNames={{
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
                        day_today: "bg-accent text-accent-foreground",
                    }}
                />
            </CardContent>
        </Card>
    )
}
