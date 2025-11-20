import { useState } from "react";
import { Bell, BellOff, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function NotificationSettingsCollapsible() {
  const { permission, isSupported, requestPermission } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  if (!isSupported) {
    return (
      <Card className="border-l-4 border-l-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <BellOff className="w-4 h-4" />
              Notificações não suportadas
            </CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const getStatusBadge = () => {
    switch (permission) {
      case "granted":
        return <Badge className="bg-green-500 text-xs">Ativadas</Badge>;
      case "denied":
        return <Badge variant="destructive" className="text-xs">Bloqueadas</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Não configuradas</Badge>;
    }
  };

  const getDescription = () => {
    switch (permission) {
      case "granted":
        return "Você receberá notificações sobre novas demandas, mudanças de status e agendamentos próximos.";
      case "denied":
        return "As notificações estão bloqueadas. Você pode ativá-las nas configurações do navegador.";
      default:
        return "Ative as notificações para receber alertas em tempo real sobre demandas e agendamentos.";
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-l-4 border-l-primary/30">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <CardTitle className="text-sm">Notificações Push</CardTitle>
                {getStatusBadge()}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent className="animate-accordion-down">
          <CardContent className="pt-0 space-y-3">
            <CardDescription className="text-xs">
              {getDescription()}
            </CardDescription>
            
            {permission === "granted" ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-4 h-4 text-green-500" />
                <span>Notificações ativadas com sucesso!</span>
              </div>
            ) : permission === "denied" ? (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-2">Para ativar as notificações:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Clique no ícone de cadeado na barra de endereço</li>
                  <li>Procure por "Notificações"</li>
                  <li>Altere para "Permitir"</li>
                  <li>Recarregue a página</li>
                </ol>
              </div>
            ) : (
              <Button onClick={requestPermission} size="sm" className="w-full">
                <Bell className="w-4 h-4 mr-2" />
                Ativar Notificações
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
