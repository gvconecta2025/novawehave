'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

interface ModalNovaAssinaturaProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function ModalNovaAssinatura({ aberto, aoFechar }: ModalNovaAssinaturaProps) {
  const { usuarioDb, usuarioAuth } = useAuthStore();
  
  const [clienteNome, setClienteNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [descricaoProduto, setDescricaoProduto] = useState('');
  const [valorNegociado, setValorNegociado] = useState('');
  
  // Controles Financeiros e Logísticos
  const [statusPagamento, setStatusPagamento] = useState('Pendente');
  const [statusInicial, setStatusInicial] = useState('Intenção de Compra');
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    // BARREIRA DE NEGÓCIO: Impede encomendar sem dinheiro no caixa
    const statusAvancados = ['Pedido ao Fornecedor', 'Em Trânsito', 'Retirada VIP'];
    if (statusPagamento === 'Pendente' && statusAvancados.includes(statusInicial)) {
      setErro('Bloqueio Financeiro: Não é permitido avançar o pedido ao fornecedor sem a confirmação de um Sinal ou Pagamento Integral.');
      return;
    }

    setCarregando(true);

    try {
      const payloadAssinatura = {
        fluxo_operacional: 'Assinatura We Have',
        cor_hexadecimal: '#D97706', // Dourado/Gold (Amber-500)
        status_atual: statusInicial,
        valor_total: parseFloat(valorNegociado) || 0,
        dados_encomenda: {
          cliente_nome: clienteNome,
          telefone: telefone,
          descricao_produto: descricaoProduto,
          status_pagamento: statusPagamento, // "Pendente", "Sinal Pago", "Integral"
        },
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Usuário Não Identificado',
          criado_em: serverTimestamp(),
          deletado_em: null
        }
      };

      await addDoc(collection(bancoDeDados, 'comandas'), payloadAssinatura);
      
      setClienteNome('');
      setTelefone('');
      setDescricaoProduto('');
      setValorNegociado('');
      setStatusPagamento('Pendente');
      setStatusInicial('Intenção de Compra');
      aoFechar();
      
      alert('🌟 Encomenda VIP registrada com sucesso!');
    } catch (erroFirebase) {
      console.error('[ERRO GRAVAÇÃO ASSINATURA]', erroFirebase);
      setErro('Falha ao registrar a encomenda. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden border border-amber-500">
        
        {/* Cabeçalho Color-Coded VIP (Dourado) */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🌟</span> Nova Encomenda VIP
          </h2>
          <button onClick={aoFechar} className="text-amber-100 hover:text-white transition text-2xl leading-none">
            &times;
          </button>
        </div>

        {/* Regra Anti-Silêncio Local */}
        {erro && (
          <div className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700">
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={lidarComEnvio} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Cliente *</label>
              <input required type="text" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Ex: Cliente Ouro" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp (Notificações) *</label>
              <input required type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="(33) 99999-9999" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-900 mb-1">Produto Desejado (Prateleira Infinita) *</label>
            <textarea required value={descricaoProduto} onChange={(e) => setDescricaoProduto(e.target.value)} rows={3} className="w-full border border-amber-300 bg-amber-50 rounded p-2.5 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Descreva cor, capacidade, marca e modelo exato desejado pelo cliente..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Valor Negociado (R$) *</label>
              <input required type="number" step="0.01" value={valorNegociado} onChange={(e) => setValorNegociado(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-green-700" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmação Financeira</label>
              <select value={statusPagamento} onChange={(e) => setStatusPagamento(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium">
                <option value="Pendente">Pendente</option>
                <option value="Sinal Pago">Sinal Pago (Entrada)</option>
                <option value="Integralmente Pago">Integralmente Pago</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Etapa Logística Inicial</label>
              <select value={statusInicial} onChange={(e) => setStatusInicial(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-amber-500 outline-none bg-white font-medium">
                <option value="Intenção de Compra">Intenção de Compra</option>
                <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                <option value="Pedido ao Fornecedor">Pedido ao Fornecedor</option>
                <option value="Em Trânsito">Em Trânsito</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button type="button" onClick={aoFechar} disabled={carregando} className="px-5 py-2.5 rounded font-semibold text-gray-600 hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={carregando} className="px-6 py-2.5 rounded font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition disabled:opacity-50 shadow-md">
              {carregando ? 'Registrando...' : 'Confirmar Encomenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
