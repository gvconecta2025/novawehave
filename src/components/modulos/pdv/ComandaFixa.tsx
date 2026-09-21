'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useComandaStore } from '@/store/useComandaStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function ComandaFixa() {
  const { itens, valorTotal, removerItem, limparComanda } = useComandaStore();
  const { usuarioDb, usuarioAuth } = useAuthStore(); // Resgate do estado global para Auditoria
  
  const [carregando, setCarregando] = useState(false);
  const [erroAtivo, setErroAtivo] = useState<string | null>(null);

  const lidarComFinalizacao = async () => {
    if (itens.length === 0) return;
    
    setCarregando(true);
    setErroAtivo(null);

    try {
      // Montagem do Payload obedecendo a tipagem e segurança
      const payloadComanda = {
        itens,
        valor_total: valorTotal,
        fluxo_operacional: 'Venda Expressa',
        cor_hexadecimal: '#059669', // Verde padrão
        status_atual: 'Aguardando Caixa',
        sincronizacao_bling: {
          id_pedido_bling: null,
          sincronizado: false,
        },
        // LEI 3: Auditoria estrita em tabelas
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Usuário Não Identificado',
          criado_em: serverTimestamp(),
          deletado_em: null
        }
      };

      await addDoc(collection(bancoDeDados, 'comandas'), payloadComanda);
      
      // Feedback visual e Reset
      limparComanda();
      alert('✅ Comanda gerada e enviada para o Caixa com sucesso!');
      
    } catch (erro) {
      console.error('[ERRO FINALIZACAO COMANDA]', erro);
      setErroAtivo('Ocorreu um erro ao gravar a comanda. Verifique a rede ou chame o suporte.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      
      <div className="flex h-20 items-center justify-between border-b border-gray-200 bg-gray-50 p-4">
        <h2 className="text-lg font-bold text-gray-800">Comanda Atual</h2>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
          {itens.length} {itens.length === 1 ? 'Item' : 'Itens'}
        </span>
      </div>

      {/* Regra Anti-Silêncio Local */}
      {erroAtivo && (
        <div className="bg-red-50 p-3 text-xs font-semibold text-red-600 border-b border-red-200">
          ⚠️ {erroAtivo}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {itens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
            <span className="text-4xl mb-2">🛒</span>
            <p className="text-sm">Nenhum item na comanda.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {itens.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex-1 pr-2">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">{item.nome}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.quantidade}x {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco * item.quantidade)}
                  </span>
                  <button
                    onClick={() => removerItem(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-red-100 text-red-600 transition-colors hover:bg-red-200"
                    disabled={carregando}
                  >
                    -
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Total</span>
          <span className="text-2xl font-black text-green-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
          </span>
        </div>
        
        <button 
          onClick={lidarComFinalizacao}
          disabled={itens.length === 0 || carregando}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-4 text-sm font-bold tracking-wide text-white transition-all hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 shadow-md"
        >
          {carregando ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              PROCESSANDO...
            </>
          ) : (
            'ENVIAR PARA CAIXA'
          )}
        </button>
      </div>
    </div>
  );
}
