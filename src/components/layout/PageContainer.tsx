import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  withPadding?: boolean;
  className?: string;
}

export function PageContainer({
  children,
  withPadding = true,
  className,
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div
        className={cn(
          "container mx-auto w-full",
          withPadding && "px-4 md:px-6 py-6 md:py-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
