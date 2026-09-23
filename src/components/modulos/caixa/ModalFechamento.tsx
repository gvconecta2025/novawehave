'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';

interface ModalFechamentoProps {
  aberto: boolean;
  aoFechar: () => void;
}

interface ComandaFechamento {
  id: string;
  status_atual: string;
  pagamento?: {
    metodo: string;
    valor_recebido: number;
    troco: number;
  };
  valor_total: number;
  auditoria: {
    criado_em: any;
    faturado_em?: any;
  };
}

export default function ModalFechamento({ aberto, aoFechar }: ModalFechamentoProps) {
  const [comandasHoje, setComandasHoje] = useState<ComandaFechamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;

    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);
    const inicioDoDiaMillis = inicioDoDia.getTime();

    const q = query(
      collection(bancoDeDados, 'comandas'),
      where('status_atual', '==', 'Faturado/Concluído')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as ComandaFechamento[];
        
        // BLINDAGEM DE FILTRO: Fallbacks seguros e validação de existência da função toMillis
        const faturadosHoje = dados.filter(c => {
          const timestampReferencia = c.auditoria?.faturado_em || c.auditoria?.criado_em;
          if (!timestampReferencia || typeof timestampReferencia.toMillis !== 'function') return false;
          
          return timestampReferencia.toMillis() >= inicioDoDiaMillis;
        });
        
        setComandasHoje(faturadosHoje);
        setCarregando(false);
        setErro(null); 
      },
      (err: any) => {
        console.error('[ERRO FECHAMENTO CAIXA]', err);
        setErro(`Falha no Firestore [${err.code || 'Erro Técnico'}]: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, [aberto]);

  if (!aberto) return null;

  const totais = comandasHoje.reduce(
    (acc, comanda) => {
      const valor = comanda.pagamento ? (comanda.pagamento.valor_recebido - comanda.pagamento.troco) : (Number(comanda.valor_total) || 0);
      const metodo = comanda.pagamento?.metodo || 'Outros';

      acc.total += valor;
      if (metodo === 'Pix') acc.pix += valor;
      else if (metodo === 'Cartão de Crédito') acc.credito += valor;
      else if (metodo === 'Cartão de Débito') acc.debito += valor;
      else if (metodo === 'Dinheiro') acc.dinheiro += valor;
      else acc.outros += valor;

      return acc;
    },
    { total: 0, pix: 0, credito: 0, debito: 0, dinheiro: 0, outros: 0 }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-sans backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden border border-gray-300">
        
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔒</span> Fechamento de Turno
          </h2>
          <button onClick={aoFechar} className="text-gray-400 hover:text-white transition text-2xl leading-none">
            &times;
          </button>
        </div>

        {erro && (
          <div className="bg-red-50 p-4 border-b border-red-200 text-sm font-medium text-red-800 shadow-inner break-words">
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}

        <div className="p-6">
          {carregando ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-900 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 text-center shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Faturamento Bruto do Dia</p>
                <p className="text-4xl font-black text-gray-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.total)}
                </p>
                <p className="text-xs font-semibold text-gray-400 mt-2">{comandasHoje.length} operações concluídas hoje</p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Consolidação por Método</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-100 bg-white p-3 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-gray-500 font-bold mb-1">Total Pix</span>
                    <span className="text-lg font-black text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.pix)}</span>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-3 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-gray-500 font-bold mb-1">Total Dinheiro</span>
                    <span className="text-lg font-black text-amber-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.dinheiro)}</span>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-3 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-gray-500 font-bold mb-1">Cartão Crédito</span>
                    <span className="text-lg font-black text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.credito)}</span>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-white p-3 flex flex-col items-center justify-center shadow-sm">
                    <span className="text-xs text-gray-500 font-bold mb-1">Cartão Débito</span>
                    <span className="text-lg font-black text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.debito)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg text-xs text-amber-900 font-medium border border-amber-200">
                <strong className="block mb-1 text-amber-900">Lembrete de Fechamento:</strong> 
                Conte o valor físico na gaveta (Dinheiro) e confira os relatórios das máquinas de cartão com a tabela acima antes de encerrar as suas atividades operacionais.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
