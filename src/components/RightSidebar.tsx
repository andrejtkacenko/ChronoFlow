import { Button } from "./ui/button";
import { FilePlus2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";

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
      <TooltipProvider>
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
      </TooltipProvider>
    );
  };

  return (
    <div className={cn("h-full overflow-y-auto transition-opacity duration-300", isOpen ? "p-2 opacity-100" : "opacity-0")}>
       <div className="flex flex-col items-center pt-4 space-y-2">
         <ActionButton icon={<FilePlus2 />} label="New from Template" />
       </div>
    </div>
  );
}
