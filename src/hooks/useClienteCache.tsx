import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCPF } from "@/lib/cpfValidator";

interface ClienteData {
  nome: string | null;
  telefone: string | null;
}

interface UseClienteCacheReturn {
  clienteData: ClienteData | null;
  loading: boolean;
  salvarCliente: (cpf: string, nome: string, telefone: string) => Promise<void>;
  buscarCliente: (cpf: string) => Promise<void>;
  limparCache: () => void;
}

export const useClienteCache = (cpfInicial?: string): UseClienteCacheReturn => {
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  const [loading, setLoading] = useState(false);

  const buscarCliente = useCallback(async (cpf: string) => {
    if (!cpf) {
      setClienteData(null);
      return;
    }

    const cpfNormalizado = normalizeCPF(cpf);
    
    // Só busca se o CPF tiver 11 dígitos
    if (cpfNormalizado.length !== 11) {
      setClienteData(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clientes_cache")
        .select("nome, telefone")
        .eq("cpf", cpfNormalizado)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar cliente no cache:", error);
        setClienteData(null);
        return;
      }

      if (data) {
        setClienteData({
          nome: data.nome,
          telefone: data.telefone,
        });
      } else {
        setClienteData(null);
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      setClienteData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const salvarCliente = useCallback(async (cpf: string, nome: string, telefone: string) => {
    if (!cpf) return;

    const cpfNormalizado = normalizeCPF(cpf);
    
    if (cpfNormalizado.length !== 11) return;

    // Só salva se tiver pelo menos nome ou telefone
    if (!nome && !telefone) return;

    try {
      const { error } = await supabase
        .from("clientes_cache")
        .upsert(
          {
            cpf: cpfNormalizado,
            nome: nome || null,
            telefone: telefone || null,
          },
          { onConflict: "cpf" }
        );

      if (error) {
        console.error("Erro ao salvar cliente no cache:", error);
      }
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  }, []);

  // Busca inicial quando cpfInicial é fornecido
  useEffect(() => {
    if (cpfInicial) {
      buscarCliente(cpfInicial);
    }
  }, [cpfInicial, buscarCliente]);

  const limparCache = useCallback(() => {
    setClienteData(null);
  }, []);

  return {
    clienteData,
    loading,
    salvarCliente,
    buscarCliente,
    limparCache,
  };
};
