
import { Button } from "./ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface RightSidebarProps {
  isOpen: boolean;
}

export default function RightSidebar({ isOpen }: RightSidebarProps) {
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
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">View settings are now automatic based on screen size.</p>
                    </div>
                </>
            )}
        </div>
     </TooltipProvider>
  );
}
