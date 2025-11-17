import { useNavigate, useLocation } from "react-router-dom";
import { Home, FileText, Users, Calendar, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  className?: string;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Início" },
    { path: "/demands", icon: FileText, label: "Demandas" },
    { path: "/conformidades", icon: Users, label: "Contratos" },
    { path: "/minhas-tarefas", icon: ListTodo, label: "Tarefas" },
    { path: "/agendamentos", icon: Calendar, label: "Agenda" },
  ];

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-lg md:hidden",
      className
    )}>
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 relative",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
