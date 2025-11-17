import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Carregando...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 md:py-16 px-4",
        className
      )}
    >
      <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-primary animate-spin mb-4" />
      <p className="text-sm md:text-base text-muted-foreground">{message}</p>
    </div>
  );
}
