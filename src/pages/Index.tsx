import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <div className="animate-in fade-in duration-700 text-center space-y-8 max-w-lg">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-8 rounded-3xl backdrop-blur-sm">
            <Building2 className="w-16 h-16 text-primary" />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Agência Manchester
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto">
            Sistema de Gestão de Demandas e Conformidades
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")} 
            className="w-full sm:w-auto min-w-[200px] transform active:scale-95 transition-transform"
          >
            Acessar Sistema
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
