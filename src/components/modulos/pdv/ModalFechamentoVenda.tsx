'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

// Tipagem básica para que o modal entenda o que está sendo vendido
interface ItemVenda {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  sku: string;
}

export interface PayloadFechamento {
  cliente: {
    nome: string;
    cpf: string;
  };
  financeiro: {
    subtotal: number;
    desconto: number;
    justificativa_desconto: string;
    total_final: number;
    metodos_pagamento: string[];
  };
  vendedor_responsavel: string;
}

interface ModalFechamentoVendaProps {
  aberto: boolean;
  aoFechar: () => void;
  itensCarrinho: ItemVenda[];
  valorSubtotal: number;
  aoConfirmarVenda: (payload: PayloadFechamento) => void;
}

const OPCOES_PAGAMENTO = [
  'Dinheiro', 
  'PIX', 
  'Cartão Crédito', 
  'Cartão Débito'
];

export default function ModalFechamentoVenda({ 
  aberto, 
  aoFechar, 
  itensCarrinho, 
  valorSubtotal, 
  aoConfirmarVenda 
}: ModalFechamentoVendaProps) {
  
  const { 
    usuarioDb 
  } = useAuthStore();
  
  // Estados do Cliente
  const [nomeCliente, setNomeCliente] = useState('');
  const [cpfCliente, setCpfCliente] = useState('');
  
  // Estados Financeiros
  const [desconto, setDesconto] = useState<number | ''>('');
  const [justificativaDesconto, setJustificativaDesconto] = useState('');
  const [metodosSelecionados, setMetodosSelecionados] = useState<string[]>([]);
  
  // Estados de Validação (Anti-Silêncio)
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const valorDesconto = typeof desconto === 'number' ? desconto : 0;
  const valorTotalFinal = Math.max(0, valorSubtotal - valorDesconto);

  // Efeito para limpar o modal sempre que ele for aberto
  useEffect(() => {
    if (aberto) {
      setNomeCliente('');
      setCpfCliente('');
      setDesconto('');
      setJustificativaDesconto('');
      setMetodosSelecionados([]);
      setErroFormulario(null);
    }
  }, [aberto]);

  if (!aberto) {
    return null;
  }

  const alternarMetodoPagamento = (metodo: string) => {
    setMetodosSelecionados((prev) => 
      prev.includes(metodo) 
        ? prev.filter((m) => m !== metodo)
        : [...prev, metodo]
    );
  };

  const lidarComConfirmacao = (e: React.FormEvent) => {
    e.preventDefault();
    setErroFormulario(null);

    // Validação 1: Pagamento
    if (metodosSelecionados.length === 0) {
      setErroFormulario('Selecione pelo menos um método de pagamento.');
      return;
    }

    // Validação 2: Margem de Desconto
    if (valorDesconto > 0 && justificativaDesconto.trim().length < 5) {
      setErroFormulario('É obrigatório justificar o motivo do desconto (mín. 5 caracteres).');
      return;
    }

    // Validação 3: Desconto não pode exceder o subtotal
    if (valorDesconto > valorSubtotal) {
      setErroFormulario('O desconto não pode ser maior que o subtotal da venda.');
      return;
    }

    const payloadCompilado: PayloadFechamento = {
      cliente: {
        nome: nomeCliente.trim() || 'Cliente Balcão',
        cpf: cpfCliente.trim()
      },
      financeiro: {
        subtotal: valorSubtotal,
        desconto: valorDesconto,
        justificativa_desconto: justificativaDesconto.trim(),
        total_final: valorTotalFinal,
        metodos_pagamento: metodosSelecionados
      },
      vendedor_responsavel: usuarioDb?.nome_completo || 'Vendedor Padrão'
    };

    aoConfirmarVenda(payloadCompilado);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity"
    >
      <div 
        className="w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden border border-blue-500 flex flex-col max-h-[90vh] animate-fade-in"
      >
        
        {/* Cabeçalho */}
        <div 
          className="bg-blue-600 px-6 py-4 flex items-center justify-between shrink-0"
        >
          <h2 
            className="text-xl font-bold text-white flex items-center gap-2"
          >
            <span>
              💰
            </span> 
            Fechamento de Venda
          </h2>
          <button 
            onClick={aoFechar} 
            className="text-blue-200 hover:text-white transition text-3xl leading-none"
            title="Fechar Modal"
          >
            &times;
          </button>
        </div>

        {/* Auditoria / Vendedor */}
        <div 
          className="bg-gray-100 px-6 py-2 border-b border-gray-200 shrink-0 flex items-center justify-between"
        >
          <span 
            className="text-xs font-bold text-gray-500 uppercase tracking-wider"
          >
            Vendedor Responsável
          </span>
          <span 
            className="text-xs font-black text-blue-700"
          >
            {usuarioDb?.nome_completo || 'Não Identificado'}
          </span>
        </div>

        {/* Regra Anti-Silêncio */}
        {erroFormulario && (
          <div 
            className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700 shrink-0 break-words"
          >
            ⚠️ <strong>Diagnóstico:</strong> {erroFormulario}
          </div>
        )}

        {/* Corpo do Formulário */}
        <form 
          onSubmit={lidarComConfirmacao} 
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div 
            className="p-6 overflow-y-auto flex-1 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            
            {/* COLUNA ESQUERDA: Identificação */}
            <div 
              className="flex flex-col gap-5"
            >
              <div>
                <h3 
                  className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2"
                >
                  Dados do Cliente
                </h3>
                
                <div 
                  className="space-y-4"
                >
                  <div>
                    <label 
                      className="block text-xs font-bold text-gray-700 mb-1"
                    >
                      Nome (Opcional)
                    </label>
                    <input 
                      type="text" 
                      value={nomeCliente} 
                      onChange={(e) => setNomeCliente(e.target.value)} 
                      placeholder="Ex: Cliente Balcão"
                      className="w-full border border-gray-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    />
                  </div>
                  
                  <div>
                    <label 
                      className="block text-xs font-bold text-gray-700 mb-1"
                    >
                      CPF (Opcional - Garantia)
                    </label>
                    <input 
                      type="text" 
                      value={cpfCliente} 
                      onChange={(e) => setCpfCliente(e.target.value)} 
                      placeholder="Ex: 000.000.000-00"
                      className="w-full border border-gray-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-mono" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 
                  className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2 pt-2"
                >
                  Formas de Pagamento *
                </h3>
                
                <div 
                  className="grid grid-cols-2 gap-3"
                >
                  {OPCOES_PAGAMENTO.map((metodo) => {
                    const ativo = metodosSelecionados.includes(metodo);
                    
                    return (
                      <button 
                        key={metodo}
                        type="button"
                        onClick={() => alternarMetodoPagamento(metodo)}
                        className={`p-3 rounded-lg border text-xs font-bold transition-all text-center flex items-center justify-center gap-2 ${
                          ativo 
                            ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-inner' 
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        <div 
                          className={`w-3 h-3 rounded-full border ${
                            ativo ? 'border-4 border-blue-600 bg-white' : 'border-gray-400'
                          }`}
                        >
                        </div>
                        {metodo}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: Finanças */}
            <div 
              className="flex flex-col rounded-xl border border-gray-200 bg-gray-50 p-5"
            >
              <h3 
                className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2"
              >
                Resumo Financeiro
              </h3>
              
              <div 
                className="flex items-center justify-between mb-4"
              >
                <span 
                  className="text-sm font-semibold text-gray-500"
                >
                  Subtotal
                </span>
                <span 
                  className="text-lg font-bold text-gray-700"
                >
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(valorSubtotal)}
                </span>
              </div>

              <div 
                className="mb-4"
              >
                <label 
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Desconto Autorizado (R$)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={desconto} 
                  onChange={(e) => setDesconto(e.target.value ? Number(e.target.value) : '')} 
                  placeholder="0,00"
                  className="w-full border border-red-300 rounded p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none transition font-bold text-red-700 bg-red-50" 
                />
              </div>

              {valorDesconto > 0 && (
                <div 
                  className="mb-6 animate-fade-in"
                >
                  <label 
                    className="block text-xs font-bold text-red-700 mb-1"
                  >
                    Justificativa do Desconto *
                  </label>
                  <textarea 
                    value={justificativaDesconto} 
                    onChange={(e) => setJustificativaDesconto(e.target.value)} 
                    placeholder="Motivo da concessão (Obrigatório para a auditoria)..."
                    rows={3}
                    className="w-full border border-red-200 rounded p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none transition custom-scrollbar resize-none" 
                  />
                </div>
              )}

              <div 
                className="mt-auto border-t border-gray-200 pt-4"
              >
                <div 
                  className="flex items-center justify-between"
                >
                  <span 
                    className="text-sm font-bold text-gray-900 uppercase"
                  >
                    Total a Pagar
                  </span>
                  <span 
                    className="text-4xl font-black text-green-700"
                  >
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(valorTotalFinal)}
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* Rodapé e Ações */}
          <div 
            className="border-t border-gray-100 bg-white p-6 shrink-0 flex justify-end gap-3"
          >
            <button 
              type="button" 
              onClick={aoFechar} 
              className="px-6 py-3 rounded-xl font-bold text-gray-600 border border-gray-300 hover:bg-gray-50 transition active:scale-95"
            >
              Continuar Comprando
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span 
                className="text-lg"
              >
                ✅
              </span> 
              Confirmar e Lançar Venda
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
