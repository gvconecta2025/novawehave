'use client';

import { useState, useEffect } from 'react';
import { collection, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { useComandaStore } from '@/store/useComandaStore';

interface ModalPagamentoProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function ModalPagamento({ aberto, aoFechar }: ModalPagamentoProps) {
  const { usuarioDb, usuarioAuth } = useAuthStore();
  const { itens, limparComanda } = useComandaStore();
  
  const [metodoPagamento, setMetodoPagamento] = useState('Pix');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [troco, setTroco] = useState(0);
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valorTotal = itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  // Cálculo reativo de troco
  useEffect(() => {
    if (metodoPagamento === 'Dinheiro' && valorRecebido) {
      const recebidoNum = parseFloat(valorRecebido.replace(',', '.')) || 0;
      const calcTroco = recebidoNum - valorTotal;
      setTroco(calcTroco > 0 ? calcTroco : 0);
    } else {
      setTroco(0);
      setValorRecebido('');
    }
  }, [valorRecebido, metodoPagamento, valorTotal]);

  if (!aberto) return null;

  const lidarComFinalizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (itens.length === 0) {
      setErro('A comanda está vazia. Adicione produtos antes de finalizar.');
      return;
    }

    if (metodoPagamento === 'Dinheiro') {
      const recebidoNum = parseFloat(valorRecebido.replace(',', '.')) || 0;
      if (recebidoNum < valorTotal) {
        setErro('O valor recebido em dinheiro é inferior ao total da venda.');
        return;
      }
    }

    setCarregando(true);

    try {
      // Criação de Lote de Transação (Batch) para garantir a baixa de estoque simultânea
      const lote = writeBatch(bancoDeDados);

      // 1. Prepara a criação da Comanda
      const novaComandaRef = doc(collection(bancoDeDados, 'comandas'));
      const payloadVenda = {
        fluxo_operacional: 'Venda Expressa',
        cor_hexadecimal: '#10B981', // Verde (Receita Positiva)
        status_atual: 'Aguardando Caixa',
        valor_total: valorTotal,
        itens: itens.map(item => ({
          id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade
        })),
        pagamento: {
          metodo: metodoPagamento,
          valor_recebido: metodoPagamento === 'Dinheiro' ? parseFloat(valorRecebido.replace(',', '.')) : valorTotal,
          troco: troco
        },
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Colaborador Oculto',
          criado_em: serverTimestamp(),
          deletado_em: null
        }
      };

      lote.set(novaComandaRef, payloadVenda);

      // 2. Prepara as baixas de estoque usando a função increment (Atômica)
      itens.forEach(item => {
        const produtoRef = doc(bancoDeDados, 'produtos', item.id);
        lote.update(produtoRef, {
          saldo_estoque: increment(-item.quantidade)
        });
      });

      // 3. Executa o Lote
      await lote.commit();

      // Limpeza de Estado
      limparComanda();
      setMetodoPagamento('Pix');
      setValorRecebido('');
      setTroco(0);
      aoFechar();
      
      alert('✅ Venda Expressa finalizada e enviada ao Caixa!');
    } catch (erroFirebase) {
      console.error('[ERRO FINALIZAR VENDA]', erroFirebase);
      setErro('Falha crítica ao finalizar venda e dar baixa no estoque. A transação foi cancelada.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 font-sans backdrop-blur-md transition-opacity">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-green-500">
        
        <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>💳</span> Finalizar Venda
          </h2>
          <button onClick={aoFechar} className="text-green-200 hover:text-white transition text-3xl leading-none font-light">
            &times;
          </button>
        </div>

        {erro && (
          <div className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700">
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={lidarComFinalizacao} className="p-6 space-y-5">
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200 text-center">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Total a Pagar</p>
            <p className="text-4xl font-black text-green-700">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Método de Pagamento</label>
            <div className="grid grid-cols-2 gap-3">
              {['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map((metodo) => (
                <button
                  key={metodo}
                  type="button"
                  onClick={() => setMetodoPagamento(metodo)}
                  className={`py-3 px-2 rounded-lg text-sm font-bold border transition-all ${
                    metodoPagamento === metodo 
                      ? 'bg-green-100 border-green-500 text-green-800 ring-2 ring-green-200' 
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {metodo}
                </button>
              ))}
            </div>
          </div>

          {metodoPagamento === 'Dinheiro' && (
            <div className="grid grid-cols-2 gap-4 bg-amber-50 p-4 rounded-xl border border-amber-200">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Valor Recebido (R$)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  min={valorTotal}
                  value={valorRecebido} 
                  onChange={(e) => setValorRecebido(e.target.value)} 
                  className="w-full border border-amber-300 rounded p-2.5 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-gray-900" 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Troco ao Cliente (R$)</label>
                <div className="w-full bg-white border border-amber-300 rounded p-2.5 font-black text-green-700 flex items-center">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(troco)}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
            <button type="button" onClick={aoFechar} disabled={carregando} className="px-5 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={carregando || valorTotal === 0} 
              className="px-8 py-3 rounded-lg font-black text-white bg-green-600 hover:bg-green-700 transition disabled:opacity-50 shadow-lg active:scale-95 flex items-center gap-2"
            >
              {carregando ? 'A Processar...' : 'Confirmar e Faturar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
