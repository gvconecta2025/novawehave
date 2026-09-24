'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import Link from 'next/link';

interface ComandaHistorico {
  id: string;
  fluxo_operacional: string;
  status_atual: string;
  valor_total: number;
  cor_hexadecimal: string;
  auditoria: {
    criado_em: any;
    criado_por_nome?: string;
  };
}

export default function WorkspaceHistorico() {
  const { perfilRbac, carregando: authCarregando } = useAuthStore();
  
  const [historico, setHistorico] = useState<ComandaHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Barreira RBAC: Acesso Exclusivo à Diretoria e Supervisão
  const acessoPermitido = ['Master', 'Admin/Dev', 'Supervisor'].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) setCarregando(false);
      return;
    }

    // Query Global: Sem filtros WHERE para apanhar toda a coleção (Livro Razão)
    const q = query(collection(bancoDeDados, 'comandas'));

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ComandaHistorico[];

        // Ordenação Cronológica Decrescente Segura (Mais recentes no topo)
        dados.sort((a, b) => {
          const tempoA = typeof a.auditoria?.criado_em?.toMillis === 'function' ? a.auditoria.criado_em.toMillis() : 0;
          const tempoB = typeof b.auditoria?.criado_em?.toMillis === 'function' ? b.auditoria.criado_em.toMillis() : 0;
          return tempoB - tempoA; 
        });

        setHistorico(dados);
        setCarregando(false);
        setErro(null);
      },
      (err: any) => {
        console.error('[ERRO LIVRO RAZÃO]', err);
        setErro(`Falha ao carregar o histórico geral [${err.code || 'Erro Técnico'}]: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, [acessoPermitido, authCarregando]);

  const formatarData = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'Data Inválida';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp.toDate());
  };

  if (authCarregando) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!acessoPermitido) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans">
        <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl">
          <span className="mb-4 text-6xl">⛔</span>
          <h1 className="mb-2 text-2xl font-black text-gray-900">Acesso Restrito</h1>
          <p className="mb-6 text-sm text-gray-500">
            O seu perfil ({perfilRbac}) não possui privilégios de auditoria para aceder ao Livro Razão.
          </p>
          <Link href="/pdv" className="rounded bg-blue-600 px-6 py-2.5 font-bold text-white transition hover:bg-blue-700">
            Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <MenuLateral />
      {/* PADRONIZAÇÃO: pl-20 (mobile) e md:pl-24 protegem o conteúdo da Sidebar */}
      <div className="flex h-screen w-full flex-col bg-gray-50 p-6 pl-20 md:p-8 md:pl-24 font-sans overflow-hidden transition-all">
        
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Livro Razão</h1>
            <p className="text-gray-500 mt-1">Histórico Cronológico e Auditoria Geral de Operações.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-5 py-2.5 font-bold text-gray-700 shadow-sm">
              <span className="text-xl">📊</span> 
              {historico.length} Operações Registadas
            </span>
          </div>
        </header>

        {erro && (
          <div className="mb-6 w-full rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm break-words">
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}

        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
            <h2 className="text-lg font-bold text-gray-800">Todas as Transações</h2>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ordenado por mais recentes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Data/Hora</th>
                  <th scope="col" className="px-6 py-4 font-bold">Operador (Criado por)</th>
                  <th scope="col" className="px-6 py-4 font-bold">Fluxo Operacional</th>
                  <th scope="col" className="px-6 py-4 font-bold">Status Atual</th>
                  <th scope="col" className="px-6 py-4 font-bold text-right">Valor Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {carregando ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></div>
                        <p className="text-sm font-medium text-gray-500">A consolidar Livro Razão...</p>
                      </div>
                    </td>
                  </tr>
                ) : historico.length === 0 && !erro ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                      O Livro Razão está vazio. Nenhuma operação foi registada no sistema.
                    </td>
                  </tr>
                ) : (
                  historico.map((comanda) => (
                    <tr key={comanda.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {formatarData(comanda.auditoria?.criado_em)}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-700">
                        {comanda.auditoria?.criado_por_nome || 'Operador Oculto'}
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border"
                          style={{ 
                            color: comanda.cor_hexadecimal || '#6B7280', 
                            borderColor: `${comanda.cor_hexadecimal || '#6B7280'}40`, 
                            backgroundColor: `${comanda.cor_hexadecimal || '#6B7280'}10` 
                          }}
                        >
                          {comanda.fluxo_operacional || 'Fluxo Indefinido'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">
                        {comanda.status_atual || 'Status Indefinido'}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(comanda.valor_total) || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
