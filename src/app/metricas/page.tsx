'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import Link from 'next/link';

interface ComandaMetrica {
  id: string;
  fluxo_operacional: string;
  status_atual: string;
  valor_total: number;
  auditoria: {
    criado_por_nome: string;
  };
}

export default function WorkspaceMetricas() {
  const { 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();
  
  const [comandas, setComandas] = useState<ComandaMetrica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Barreira RBAC (Acesso Executivo)
  const acessoPermitido = [
    'Master', 
    'Supervisor', 
    'Admin/Dev'
  ].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) {
        setCarregando(false);
      }
      return;
    }

    const desinscreverComandas = onSnapshot(
      query(collection(bancoDeDados, 'comandas')),
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          fluxo_operacional: doc.data().fluxo_operacional || 'Indefinido',
          status_atual: doc.data().status_atual || 'Indefinido',
          valor_total: Number(doc.data().valor_total) || 0,
          auditoria: doc.data().auditoria || { criado_por_nome: 'Desconhecido' },
        })) as ComandaMetrica[];
        
        setComandas(dados);
        setCarregando(false);
        setErro(null);
      },
      (err: any) => {
        console.error('[ERRO MÉTRICAS COMANDAS]', err);
        setErro(`Falha ao carregar as métricas financeiras: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscreverComandas();
  }, [acessoPermitido, authCarregando]);

  // Bloqueios de Interface
  if (authCarregando) {
    return (
      <div 
        className="flex h-screen items-center justify-center bg-gray-50"
      >
        <div 
          className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
        >
        </div>
      </div>
    );
  }

  if (!acessoPermitido) {
    return (
      <div 
        className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans"
      >
        <div 
          className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl"
        >
          <span 
            className="mb-4 text-6xl"
          >
            ⛔
          </span>
          <h1 
            className="mb-2 text-2xl font-black text-gray-900"
          >
            Acesso Restrito
          </h1>
          <p 
            className="mb-6 text-sm text-gray-500"
          >
            O seu perfil ({perfilRbac}) não possui autorização executiva para visualizar as métricas globais.
          </p>
          <Link 
            href="/pdv" 
            className="rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white transition hover:bg-blue-700 shadow-md"
          >
            Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  // --- CÁLCULO DOS 4 GRANDES FLUXOS (Color-Coded) ---
  
  // 1. Venda Direta (Balcão) -> 'Venda Expressa'
  const fluxoVendaDireta = comandas.filter(c => c.fluxo_operacional === 'Venda Expressa');
  const totalVendaDireta = fluxoVendaDireta.reduce((acc, curr) => acc + curr.valor_total, 0);

  // 2. Loja Online (O2O) -> 'Venda Online' ou 'Loja Online' (Assumindo nomenclaturas comuns do O2O fechado no Caixa)
  const fluxoLojaOnline = comandas.filter(c => c.fluxo_operacional === 'Venda Online' || c.fluxo_operacional === 'Loja Online');
  const totalLojaOnline = fluxoLojaOnline.reduce((acc, curr) => acc + curr.valor_total, 0);

  // 3. Compra Sem Estoque (Logística)
  const fluxoSemEstoque = comandas.filter(c => c.fluxo_operacional === 'Compra Sem Estoque');
  const totalSemEstoque = fluxoSemEstoque.reduce((acc, curr) => acc + curr.valor_total, 0);

  // 4. Assistência Técnica (Serviços)
  const fluxoAssistencia = comandas.filter(c => c.fluxo_operacional === 'Assistência Técnica');
  const totalAssistencia = fluxoAssistencia.reduce((acc, curr) => acc + curr.valor_total, 0);

  return (
    <AppLayoutWrapper>
      <div 
        className="flex min-h-full flex-col p-6 md:p-8"
      >
        
        {/* Cabeçalho */}
        <header 
          className="mb-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6"
        >
          <div>
            <h1 
              className="text-3xl font-black text-gray-900"
            >
              Métricas Operacionais
            </h1>
            <p 
              className="text-gray-500 mt-1"
            >
              Monitorização em tempo real dos 4 grandes fluxos financeiros.
            </p>
          </div>
        </header>

        {/* Lei Anti-Silêncio */}
        {erro && (
          <div 
            className="mb-6 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm"
          >
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}

        {carregando ? (
          <div 
            className="flex flex-col items-center justify-center py-20 text-gray-400"
          >
            <div 
              className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3"
            >
            </div>
            <p 
              className="font-medium"
            >
              A consolidar inteligência de dados...
            </p>
          </div>
        ) : (
          <div 
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
            
            {/* GRID DE CARDS (Os 4 Fluxos) */}
            <div 
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8"
            >
              
              {/* Card 1: Venda Direta */}
              <div 
                className="flex flex-col justify-between rounded-2xl border border-blue-200 bg-white p-6 shadow-sm relative overflow-hidden group"
              >
                <div 
                  className="absolute right-0 top-0 p-4 opacity-10 text-6xl transition-transform group-hover:scale-110"
                >
                  🛒
                </div>
                <div>
                  <h3 
                    className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                  >
                    Venda Direta
                  </h3>
                  <p 
                    className="text-sm font-semibold text-blue-600 mb-4"
                  >
                    Balcão Físico
                  </p>
                  <p 
                    className="text-3xl font-black text-gray-900"
                  >
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(totalVendaDireta)}
                  </p>
                </div>
                <div 
                  className="mt-4 pt-4 border-t border-blue-50 flex items-center justify-between"
                >
                  <span 
                    className="text-sm font-bold text-gray-600"
                  >
                    Volume de Pedidos:
                  </span>
                  <span 
                    className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-black text-blue-800"
                  >
                    {fluxoVendaDireta.length}
                  </span>
                </div>
              </div>

              {/* Card 2: Loja Online O2O */}
              <div 
                className="flex flex-col justify-between rounded-2xl border border-green-200 bg-white p-6 shadow-sm relative overflow-hidden group"
              >
                <div 
                  className="absolute right-0 top-0 p-4 opacity-10 text-6xl transition-transform group-hover:scale-110"
                >
                  🌐
                </div>
                <div>
                  <h3 
                    className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                  >
                    Loja Online
                  </h3>
                  <p 
                    className="text-sm font-semibold text-green-600 mb-4"
                  >
                    Operação O2O
                  </p>
                  <p 
                    className="text-3xl font-black text-gray-900"
                  >
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(totalLojaOnline)}
                  </p>
                </div>
                <div 
                  className="mt-4 pt-4 border-t border-green-50 flex items-center justify-between"
                >
                  <span 
                    className="text-sm font-bold text-gray-600"
                  >
                    Volume de Pedidos:
                  </span>
                  <span 
                    className="rounded-lg bg-green-100 px-3 py-1 text-sm font-black text-green-800"
                  >
                    {fluxoLojaOnline.length}
                  </span>
                </div>
              </div>

              {/* Card 3: Compra Sem Estoque */}
              <div 
                className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-white p-6 shadow-sm relative overflow-hidden group"
              >
                <div 
                  className="absolute right-0 top-0 p-4 opacity-10 text-6xl transition-transform group-hover:scale-110"
                >
                  🚚
                </div>
                <div>
                  <h3 
                    className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                  >
                    Sem Estoque
                  </h3>
                  <p 
                    className="text-sm font-semibold text-amber-600 mb-4"
                  >
                    Logística & Encomendas
                  </p>
                  <p 
                    className="text-3xl font-black text-gray-900"
                  >
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(totalSemEstoque)}
                  </p>
                </div>
                <div 
                  className="mt-4 pt-4 border-t border-amber-50 flex items-center justify-between"
                >
                  <span 
                    className="text-sm font-bold text-gray-600"
                  >
                    Volume de Pedidos:
                  </span>
                  <span 
                    className="rounded-lg bg-amber-100 px-3 py-1 text-sm font-black text-amber-800"
                  >
                    {fluxoSemEstoque.length}
                  </span>
                </div>
              </div>

              {/* Card 4: Assistência Técnica */}
              <div 
                className="flex flex-col justify-between rounded-2xl border border-purple-200 bg-white p-6 shadow-sm relative overflow-hidden group"
              >
                <div 
                  className="absolute right-0 top-0 p-4 opacity-10 text-6xl transition-transform group-hover:scale-110"
                >
                  🔧
                </div>
                <div>
                  <h3 
                    className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1"
                  >
                    Assistência
                  </h3>
                  <p 
                    className="text-sm font-semibold text-purple-600 mb-4"
                  >
                    Serviços Técnicos
                  </p>
                  <p 
                    className="text-3xl font-black text-gray-900"
                  >
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(totalAssistencia)}
                  </p>
                </div>
                <div 
                  className="mt-4 pt-4 border-t border-purple-50 flex items-center justify-between"
                >
                  <span 
                    className="text-sm font-bold text-gray-600"
                  >
                    Ordens de Serviço:
                  </span>
                  <span 
                    className="rounded-lg bg-purple-100 px-3 py-1 text-sm font-black text-purple-800"
                  >
                    {fluxoAssistencia.length}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </AppLayoutWrapper>
  );
}
