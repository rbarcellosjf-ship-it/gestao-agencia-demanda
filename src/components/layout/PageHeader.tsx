import { ArrowLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backTo?: string;
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

export function PageHeader({
  title,
  description,
  action,
  backTo,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("mb-6 md:mb-8", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {crumb.href ? (
                <button
                  onClick={() => navigate(crumb.href!)}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {backTo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(backTo)}
                className="h-8 w-8 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl truncate">
              {description}
            </p>
          )}
        </div>

        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
    </div>
  );
}
