
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
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
  const ActionButton = ({
    icon,
    label,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
  }) => {
    return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-full" onClick={onClick}>
              {icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
    );
  };

  return (
     <TooltipProvider>
        <div className={cn("h-full overflow-y-auto transition-opacity duration-300", isOpen ? "p-4 opacity-100" : "p-0 opacity-0")}>
            {isOpen && (
                <>
                    <h3 className="text-lg font-semibold mb-4">Settings</h3>
                    <div className="space-y-6">
                       <div>
                            <Label className="text-sm font-medium">Количество дней</Label>
                            <RadioGroup 
                                defaultValue={String(numberOfDays)} 
                                onValueChange={(value) => onNumberOfDaysChange(Number(value))}
                                className="mt-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="1" id="d1" />
                                    <Label htmlFor="d1">1 день</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="3" id="d3" />
                                    <Label htmlFor="d3">3 дня</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="7" id="d7" />
                                    <Label htmlFor="d7">7 дней</Label>
                                </div>
                            </RadioGroup>
                       </div>
                       <div>
                            <Label className="text-sm font-medium">Масштаб</Label>
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
