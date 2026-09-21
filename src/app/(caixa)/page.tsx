'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';

// Interface espelho do Payload salvo na Ação 2
interface ComandaPendente {
  id: string;
  valor_total: number;
  fluxo_operacional: string;
  cor_hexadecimal: string;
  status_atual: string;
  itens: Array<{ nome: string; quantidade: number }>;
  auditoria: {
    criado_por_nome: string;
  };
}

export default function PainelCaixa() {
  const [comandas, setComandas] = useState<ComandaPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Retorna apenas comandas da fila do caixa
    const q = query(
      collection(bancoDeDados, 'comandas'),
      where('status_atual', '==', 'Aguardando Caixa'),
      orderBy('auditoria.criado_em', 'asc') // Fila real (First In, First Out)
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ComandaPendente[];

        setComandas(dados);
        setCarregando(false);
      },
      (err) => {
        console.error('[ERRO FILA CAIXA]', err);
        setErro('Falha ao conectar com a fila de comandas. Tente recarregar a página.');
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100 p-8 font-sans">
      
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Painel Caixa & Financeiro</h1>
        <p className="text-gray-500 mt-1">Fila Operacional - Emissão de NFe / Sincronização Bling</p>
      </header>

      {erro && (
        <div className="mb-4 w-full rounded border-l-4 border-red-500 bg-red-100 p-4 text-red-700 shadow-sm">
          {erro}
        </div>
      )}

      {/* Workspace do Caixa (Kanban Horizontal) */}
      <div className="flex-1 overflow-x-auto rounded-xl bg-white p-6 shadow-inner border border-gray-200">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-gray-800">Comandas Pendentes</h2>
          <span className="rounded bg-red-100 px-3 py-1 text-sm font-bold text-red-600">
            {comandas.length} Fila
          </span>
        </div>

        {carregando ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : comandas.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-gray-400">
            <span className="text-5xl mb-3">✅</span>
            <p className="font-semibold text-gray-600">Fila Limpa!</p>
            <p className="text-sm">Nenhuma operação aguardando faturamento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
            {comandas.map((comanda) => (
              <div 
                key={comanda.id}
                className="flex flex-col rounded-xl border bg-white shadow-md transition-transform hover:-translate-y-1 overflow-hidden"
                style={{ borderColor: comanda.cor_hexadecimal }} // Aplicação da UI Color-Coded
              >
                {/* Header Color-Coded do Card */}
                <div 
                  className="px-4 py-3 text-white" 
                  style={{ backgroundColor: comanda.cor_hexadecimal }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold uppercase tracking-wider">{comanda.fluxo_operacional}</span>
                  </div>
                  <div className="text-2xl font-black mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comanda.valor_total)}
                  </div>
                </div>

                <div className="p-4 flex-1">
                  <div className="mb-4 border-b border-gray-100 pb-2">
                    <p className="text-xs text-gray-400 font-semibold uppercase">Vendedor</p>
                    <p className="text-sm text-gray-800 font-bold">{comanda.auditoria.criado_por_nome}</p>
                  </div>
                  
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {comanda.itens.map((item, index) => (
                      <p key={index} className="text-sm text-gray-600 border-l-2 border-gray-200 pl-2">
                        {item.quantidade}x {item.nome}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Call To Action Claro e Direto */}
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                  <button 
                    className="w-full flex items-center justify-center gap-2 rounded bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <span>🧾</span> Processar NFe e Bling
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
