
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

interface RightSidebarProps {
  isOpen: boolean;
  numberOfDays: number;
  onNumberOfDaysChange: (days: number) => void;
  hourHeight: number;
  onHourHeightChange: (height: number) => void;
}

export default function RightSidebar({ 
    isOpen, 
    numberOfDays, 
    onNumberOfDaysChange,
    hourHeight,
    onHourHeightChange
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
                </>
            )}
        </div>
     </TooltipProvider>
  );
}
