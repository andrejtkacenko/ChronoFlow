
import { Button } from "./ui/button";
import { Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { deleteScheduleItemsInRange } from "@/lib/actions";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { Separator } from "./ui/separator";

interface RightSidebarProps {
  isOpen: boolean;
  numberOfDays: number;
  onNumberOfDaysChange: (days: number) => void;
  hourHeight: number;
  onHourHeightChange: (height: number) => void;
  currentDate: Date;
}

export default function RightSidebar({ 
    isOpen, 
    numberOfDays, 
    onNumberOfDaysChange,
    hourHeight,
    onHourHeightChange,
    currentDate,
}: RightSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDelete = async (range: 'day' | 'week' | 'month' | 'all') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }

    let startDate: string | null = null;
    let endDate: string | null = null;

    switch (range) {
      case 'day':
        startDate = format(currentDate, 'yyyy-MM-dd');
        endDate = format(currentDate, 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(startOfWeek(currentDate), 'yyyy-MM-dd');
        endDate = format(endOfWeek(currentDate), 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        break;
      case 'all':
        // null dates means all
        break;
    }
    
    try {
        const result = await deleteScheduleItemsInRange(user.uid, startDate, endDate);
        toast({ title: 'Success', description: `${result.deletedCount} items have been deleted.` });
    } catch(e) {
        const error = e as Error;
        toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
    }
  };


  const DeleteButton = ({ range, label, description }: { range: 'day' | 'week' | 'month' | 'all', label: string, description: string }) => (
     <AlertDialog>
        <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">{label}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(range)}>Delete</AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  );

  return (
     <TooltipProvider>
        <div className={cn("h-full overflow-y-auto transition-opacity duration-300 flex flex-col", isOpen ? "p-4 opacity-100" : "p-0 opacity-0")}>
            {isOpen && (
                <>
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Settings</h3>
                        <div className="space-y-6">
                        <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label className="text-sm font-medium">Количество дней</Label>
                                    <span className="text-sm font-medium text-primary">{numberOfDays}</span>
                                </div>
                                <Slider
                                    value={[numberOfDays]}
                                    onValueChange={(value) => onNumberOfDaysChange(value[0])}
                                    min={1}
                                    max={7}
                                    step={1}
                                    className="mt-2"
                                />
                        </div>
                        <div>
                                <div className="flex justify-between items-center mb-1">
                                    <Label className="text-sm font-medium">Масштаб</Label>
                                    <span className="text-sm font-medium text-primary">{Math.round(hourHeight/60 * 100)}%</span>
                                </div>
                                <Slider
                                    value={[hourHeight]}
                                    onValueChange={(value) => onHourHeightChange(value[0])}
                                    min={40}
                                    max={160}
                                    step={10}
                                    className="mt-2"
                                />
                        </div>
                        </div>
                    </div>
                    <div className="mt-auto pt-6">
                        <Separator className="my-4"/>
                        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 space-y-4">
                            <div className="flex items-center gap-2">
                                <Trash2 className="size-5 text-destructive"/>
                                <h4 className="font-semibold text-destructive">Danger Zone</h4>
                            </div>
                           <div className="grid grid-cols-2 gap-2">
                             <DeleteButton range="day" label="Today" description="This will permanently delete all events and tasks for the currently selected day."/>
                             <DeleteButton range="week" label="This Week" description="This will permanently delete all events and tasks for the currently selected week."/>
                             <DeleteButton range="month" label="This Month" description="This will permanently delete all events and tasks for the currently selected month."/>
                             <DeleteButton range="all" label="All" description="This will permanently delete ALL of your scheduled events and tasks. This action cannot be undone."/>
                           </div>
                        </div>
                    </div>
                </>
            )}
        </div>
     </TooltipProvider>
  );
}
