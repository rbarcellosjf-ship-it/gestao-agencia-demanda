import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

export function NotificationSettings() {
  const { permission, isSupported, requestPermission } = useNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notificações não suportadas
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push web.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusBadge = () => {
    switch (permission) {
      case "granted":
        return <Badge className="bg-green-500">Ativadas</Badge>;
      case "denied":
        return <Badge variant="destructive">Bloqueadas</Badge>;
      default:
        return <Badge variant="secondary">Não configuradas</Badge>;
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações Push
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        {permission === "granted" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-green-500" />
            <span>Notificações ativadas com sucesso!</span>
          </div>
        ) : permission === "denied" ? (
          <div className="text-sm text-muted-foreground">
            <p>Para ativar as notificações:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Clique no ícone de cadeado na barra de endereço</li>
              <li>Procure por "Notificações"</li>
              <li>Altere para "Permitir"</li>
              <li>Recarregue a página</li>
            </ol>
          </div>
        ) : (
          <Button onClick={requestPermission} className="w-full">
            <Bell className="w-4 h-4 mr-2" />
            Ativar Notificações
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
