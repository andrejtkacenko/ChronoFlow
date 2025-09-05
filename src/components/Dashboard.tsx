
'use client';

import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import QuickActions from './QuickActions';
import TodaysOverview from './TodaysOverview';
import ProductivityTip from './ProductivityTip';
import NewEventDialog from './NewEventDialog';
import SmartScheduler from './SmartScheduler';
import { useState } from 'react';
import FullScheduleGenerator from './FullScheduleGenerator';

export default function Dashboard() {
  const { user } = useAuth();
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isSmartSchedulerOpen, setSmartSchedulerOpen] = useState(false);
  const [isFullScheduleGeneratorOpen, setFullScheduleGeneratorOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Good morning, {user.displayName || user.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="text-muted-foreground">
                Today is {format(new Date(), 'eeee, MMMM d')}. Here’s what’s on your plate.
            </p>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-8 lg:col-span-9 space-y-6">
                 <QuickActions 
                    onNewEvent={() => setIsEventDialogOpen(true)}
                    onSmartScheduler={() => setSmartSchedulerOpen(true)}
                    onFullSchedule={() => setFullScheduleGeneratorOpen(true)}
                 />
                 <TodaysOverview />
            </div>
            <div className="md:col-span-4 lg:col-span-3">
                <ProductivityTip />
            </div>
        </div>

      </div>

      <NewEventDialog 
        isOpen={isEventDialogOpen} 
        onOpenChange={setIsEventDialogOpen}
        newEventTime={{date: new Date(), startTime: format(new Date(), "HH:mm")}}
        existingEvent={null}
        isNewTask={false}
        userId={user.uid}
      />
      <SmartScheduler open={isSmartSchedulerOpen} onOpenChange={setSmartSchedulerOpen} />
      <FullScheduleGenerator open={isFullScheduleGeneratorOpen} onOpenChange={setFullScheduleGeneratorOpen} userId={user.uid} />

    </>
  );
}
