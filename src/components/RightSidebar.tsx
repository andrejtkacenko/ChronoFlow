import { Button } from "./ui/button";
import { FilePlus2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface RightSidebarProps {
  isOpen: boolean;
  onNewTask: () => void;
}

export default function RightSidebar({ isOpen, onNewTask }: RightSidebarProps) {
  const ActionButton = ({
    icon,
    label,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
  }) => {
    if (isOpen) {
      return (
        <Button variant="ghost" className="w-full justify-start px-3" onClick={onClick}>
          {icon}
          <span className="ml-2">{label}</span>
        </Button>
      );
    }
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
    <div className={cn("h-full overflow-y-auto transition-all duration-300", isOpen ? "p-4" : "p-2")}>
      <h2 className={cn("text-lg font-semibold mb-4 truncate px-3 pt-4", !isOpen && "sr-only")}>
        Actions
      </h2>
      <div className="space-y-2">
        <ActionButton icon={<PlusCircle />} label="New Task" onClick={onNewTask} />
        <ActionButton icon={<FilePlus2 />} label="New from Template" />
      </div>
    </div>
  );
}
