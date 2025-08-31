
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Header from "@/components/Header";
import DailyOverview from "@/components/DailyOverview";
import { Skeleton } from '@/components/ui/skeleton';
import { addDays, subDays, format } from 'date-fns';
import MiniCalendar from '@/components/MiniCalendar';
import Inbox from '@/components/Inbox';
import { Separator } from '@/components/ui/separator';
import RightSidebar from '@/components/RightSidebar';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import NewEventDialog from '@/components/NewEventDialog';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { iconMap } from '@/lib/types';

interface Task {
    id: string;
    label: string;
    completed: boolean;
}

export default function SchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = useState(false);
  const [newEventTime, setNewEventTime] = useState("12:00");
  const dailyOverviewRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const handlePreviousDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleSetToday = () => setCurrentDate(new Date());

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;

    if (over && over.id === 'daily-overview-droppable' && active.data.current?.type === 'task') {
        const task = active.data.current.task as Task;
        setDraggedTask(task);
        
        // Super simplified: calculate time based on drop position
        // A more robust solution would use event.delta and the container's ref
        // For this demo, let's just open a dialog
        const hour = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
        setNewEventTime(`${hour.toString().padStart(2, '0')}:00`);

        setIsNewEventDialogOpen(true);
    }
  };

  const handleCreateEvent = async (duration: number, icon: string, color: string) => {
    if (!draggedTask) return;

    const startTime = newEventTime;
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const endTime = format(endDate, 'HH:mm');
    
    // Add to scheduleItems
    await addDoc(collection(db, "scheduleItems"), {
      title: draggedTask.label,
      date: format(currentDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      duration,
      icon,
      color,
      type: "event"
    });

    // Delete from tasks
    await deleteDoc(doc(db, "tasks", draggedTask.id));

    setIsNewEventDialogOpen(false);
    setDraggedTask(null);
  };


  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
        <div className="flex h-svh flex-col">
            <Header
            currentDate={currentDate}
            onNext={handleNextDay}
            onPrevious={handlePreviousDay}
            onToday={handleSetToday}
            showDateNav
            isRightSidebarOpen={isRightSidebarOpen}
            onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            />
            <main className="flex flex-1 overflow-hidden">
            <div className="w-[340px] flex flex-col border-r">
                <div className="px-4 pt-4 flex-1 flex flex-col overflow-y-auto">
                    <Inbox />
                </div>
                <Separator />
                <div className="py-4 flex justify-center">
                <MiniCalendar onDateSelect={(date) => setCurrentDate(date)} />
                </div>
            </div>
            <div ref={dailyOverviewRef} className="flex-1 h-full overflow-y-auto">
                <DailyOverview date={currentDate} />
            </div>
            <div className={cn("border-l transition-all duration-300", isRightSidebarOpen ? "w-[240px]" : "w-[68px]")}>
                <RightSidebar 
                    isOpen={isRightSidebarOpen} 
                />
            </div>
            </main>
        </div>
        {draggedTask && (
            <NewEventDialog
                isOpen={isNewEventDialogOpen}
                onClose={() => setIsNewEventDialogOpen(false)}
                task={draggedTask}
                startTime={newEventTime}
                onSubmit={handleCreateEvent}
            />
        )}
    </DndContext>
  );
}
