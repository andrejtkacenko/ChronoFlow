import { Button } from "./ui/button";
import { FilePlus2, PlusCircle } from "lucide-react";

export default function RightSidebar() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-xl font-semibold mb-4">Actions</h2>
      <div className="space-y-4">
        <Button className="w-full">
          <PlusCircle />
          New Task
        </Button>
        <Button variant="secondary" className="w-full">
          <FilePlus2 />
          New from Template
        </Button>
      </div>
    </div>
  );
}
