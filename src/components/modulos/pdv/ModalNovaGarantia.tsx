'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

interface ModalNovaGarantiaProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function ModalNovaGarantia({ aberto, aoFechar }: ModalNovaGarantiaProps) {
  const { usuarioDb, usuarioAuth } = useAuthStore();
  
  const [clienteNome, setClienteNome] = useState('');
  const [produtoDefeito, setProdutoDefeito] = useState('');
  const [motivoTroca, setMotivoTroca] = useState('');
  const [acaoImediata, setAcaoImediata] = useState('Trocar por Novo');
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const payloadGarantia = {
        fluxo_operacional: 'Garantia/Troca',
        cor_hexadecimal: '#EF4444', // Vermelho (Alerta/Devolução)
        status_atual: 'Aguardando Estorno Caixa', // Sinalizador para o módulo do Caixa (Bling)
        valor_total: 0, // Devoluções não somam ao faturamento bruto positivo do dia
        dados_garantia: {
          cliente_nome: clienteNome,
          produto_defeito: produtoDefeito,
          motivo_troca: motivoTroca,
          acao_imediata: acaoImediata,
        },
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Usuário Não Identificado',
          criado_em: serverTimestamp(),
          deletado_em: null
        }
      };

      await addDoc(collection(bancoDeDados, 'comandas'), payloadGarantia);
      
      setClienteNome('');
      setProdutoDefeito('');
      setMotivoTroca('');
      setAcaoImediata('Trocar por Novo');
      aoFechar();
      
      alert('🔄 Solicitação de Garantia/Troca enviada ao Caixa com sucesso!');
    } catch (erroFirebase) {
      console.error('[ERRO GRAVAÇÃO GARANTIA]', erroFirebase);
      setErro('Falha ao registrar a garantia. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden border border-red-500">
        
        <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔄</span> Nova Garantia / Troca
          </h2>
          <button onClick={aoFechar} className="text-red-200 hover:text-white transition text-2xl leading-none">
            &times;
          </button>
        </div>

        {erro && (
          <div className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700">
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={lidarComEnvio} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Cliente *</label>
            <input required type="text" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-red-500 outline-none" placeholder="Ex: Maria Silva" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Produto com Defeito / Devolvido *</label>
            <input required type="text" value={produtoDefeito} onChange={(e) => setProdutoDefeito(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-red-500 outline-none" placeholder="Ex: Fone Bluetooth Modelo X" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo da Troca *</label>
            <textarea required value={motivoTroca} onChange={(e) => setMotivoTroca(e.target.value)} rows={3} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-red-500 outline-none" placeholder="Lado esquerdo não emite som..." />
          </div>

          <div className="rounded-lg bg-red-50 p-4 border border-red-100">
            <label className="block text-sm font-bold text-red-900 mb-2">Ação Imediata (Resolução) *</label>
            <select value={acaoImediata} onChange={(e) => setAcaoImediata(e.target.value)} className="w-full border border-red-300 rounded p-2.5 focus:ring-2 focus:ring-red-500 outline-none bg-white font-medium text-red-800">
              <option value="Trocar por Novo">Trocar por Produto Novo (Mesmo Modelo)</option>
              <option value="Gerar Crédito na Loja">Gerar Crédito para Nova Compra</option>
              <option value="Devolução de Dinheiro">Estorno / Devolução de Dinheiro</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button type="button" onClick={aoFechar} disabled={carregando} className="px-5 py-2.5 rounded font-semibold text-gray-600 hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={carregando} className="px-6 py-2.5 rounded font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 shadow-md flex items-center gap-2">
              {carregando ? 'A Processar...' : 'Enviar para o Caixa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
