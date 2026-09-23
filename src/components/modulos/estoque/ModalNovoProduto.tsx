'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

interface ModalNovoProdutoProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function ModalNovoProduto({ aberto, aoFechar }: ModalNovoProdutoProps) {
  const { usuarioDb, usuarioAuth } = useAuthStore();
  
  const [nome, setNome] = useState('');
  const [sku, setSku] = useState('');
  const [preco, setPreco] = useState('');
  const [saldoFisico, setSaldoFisico] = useState('');
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      // Regra de Negócio: Se o SKU não for fornecido, geramos um provisório
      const skuFinal = sku.trim() !== '' 
        ? sku.trim().toUpperCase() 
        : `WH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const payloadProduto = {
        nome: nome.trim(),
        sku: skuFinal,
        preco: parseFloat(preco) || 0,
        saldo_estoque: parseInt(saldoFisico, 10) || 0,
        descricao: 'Nova descrição pendente de edição.', // Fallback para a Vitrine Pública
        // Integração Bling (Wrapper)
        sincronizacao_bling: {
          sincronizado: false,
          id_produto_bling: null,
        },
        // Auditoria Estrita (Lei 3)
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Usuário Não Identificado',
          criado_em: serverTimestamp(),
          atualizado_por: null,
          deletado_em: null
        }
      };

      await addDoc(collection(bancoDeDados, 'produtos'), payloadProduto);
      
      // Limpeza de estado e fecho
      setNome('');
      setSku('');
      setPreco('');
      setSaldoFisico('');
      aoFechar();
      
      alert('📦 Produto cadastrado com sucesso no catálogo local!');
    } catch (erroFirebase) {
      console.error('[ERRO CADASTRO PRODUTO]', erroFirebase);
      setErro('Falha ao registrar o produto. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden border border-indigo-500">
        
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📦</span> Novo Produto
          </h2>
          <button onClick={aoFechar} className="text-indigo-200 hover:text-white transition text-2xl leading-none">
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Produto *</label>
            <input 
              required 
              type="text" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="Ex: Capa Silicone iPhone 13" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">SKU (Opcional)</label>
            <input 
              type="text" 
              value={sku} 
              onChange={(e) => setSku(e.target.value)} 
              className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" 
              placeholder="Deixe em branco para gerar automaticamente" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Preço de Venda (R$) *</label>
              <input 
                required 
                type="number" 
                step="0.01"
                min="0"
                value={preco} 
                onChange={(e) => setPreco(e.target.value)} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-green-700" 
                placeholder="0.00" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Saldo Físico Inicial *</label>
              <input 
                required 
                type="number"
                min="0" 
                value={saldoFisico} 
                onChange={(e) => setSaldoFisico(e.target.value)} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" 
                placeholder="Qtd em estoque" 
              />
            </div>
          </div>

          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800 mt-2">
            <span className="font-bold">Atenção:</span> Este produto será criado no banco local. A sincronização com o Bling ERP ocorrerá em background ou manualmente através do painel.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button type="button" onClick={aoFechar} disabled={carregando} className="px-5 py-2.5 rounded font-semibold text-gray-600 hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={carregando} 
              className="px-6 py-2.5 rounded font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 shadow-md flex items-center gap-2"
            >
              {carregando ? 'Salvando...' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
