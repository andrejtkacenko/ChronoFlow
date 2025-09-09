
import { Button } from "./ui/button";
import { Settings, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
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

interface RightSidebarProps {
  isOpen: boolean;
  numberOfDays: number;
  onNumberOfDaysChange: (days: number) => void;
  hourHeight: number;
  onHourHeightChange: (height: number) => void;
  onDeleteEvents: (period: 'day' | 'week' | 'month' | 'all') => void;
}

const DeleteButton = ({ period, label, onDelete }: { period: 'day' | 'week' | 'month' | 'all', label: string, onDelete: (period: 'day' | 'week' | 'month' | 'all') => void }) => {
    const descriptions = {
        day: "This will permanently delete all events for the selected day.",
        week: "This will permanently delete all events for the selected week.",
        month: "This will permanently delete all events for the selected month.",
        all: "This will permanently delete all scheduled events from your account."
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start text-left h-auto py-2">
                    <Trash2 className="mr-2 h-4 w-4 shrink-0" />
                    <span>{label}</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>{descriptions[period]}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(period)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default function RightSidebar({ 
    isOpen, 
    numberOfDays, 
    onNumberOfDaysChange,
    hourHeight,
    onHourHeightChange,
    onDeleteEvents
}: RightSidebarProps) {

  return (
     <TooltipProvider>
        <div className={cn("h-full overflow-y-auto transition-opacity duration-300", isOpen ? "p-4 opacity-100" : "p-0 opacity-0")}>
            {isOpen && (
                <>
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

                    <Separator className="my-6" />

                    <div className="space-y-4">
                        <h4 className="font-semibold text-destructive">Danger Zone</h4>
                        <p className="text-xs text-muted-foreground">These actions are irreversible. Please be certain.</p>
                        <div className="space-y-2">
                           <DeleteButton period="day" label="Delete Today's Events" onDelete={onDeleteEvents} />
                           <DeleteButton period="week" label="Delete This Week's Events" onDelete={onDeleteEvents} />
                           <DeleteButton period="month" label="Delete This Month's Events" onDelete={onDeleteEvents} />
                           <DeleteButton period="all" label="Delete All Events" onDelete={onDeleteEvents} />
                        </div>
                    </div>
                </>
            )}
        </div>
     </TooltipProvider>
  );
}
