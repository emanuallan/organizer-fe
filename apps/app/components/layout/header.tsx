import { useSessionQuery } from "@/lib/queries/session";
import { Button } from "@repo/ui";
import { Menu, Settings, X } from "lucide-react";

interface HeaderProps {
  isSidebarOpen: boolean;
  onMenuToggle: () => void;
}

export function Header({ isSidebarOpen, onMenuToggle }: HeaderProps) {
  const { data: session } = useSessionQuery();
  return (
    <header className="h-18 border-b bg-background flex items-center px-4 gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuToggle}
        className="shrink-0"
      >
        {isSidebarOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </Button>

      <div className="flex-1 flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground sm:block hidden">
            Welcome back, {session?.user.name.split(" ")[0]}. Here's what's
            happening with your organization.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
