import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="text-center space-y-8 px-4">
        <div className="flex justify-center">
          <div className="bg-primary p-6 rounded-2xl shadow-2xl">
            <Building2 className="w-16 h-16 text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground">
            Agência Manchester
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Sistema de Gestão de Demandas e Conformidades
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" onClick={() => navigate("/auth")} className="min-w-[200px]">
            Acessar Sistema
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
