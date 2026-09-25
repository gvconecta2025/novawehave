'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import ModalNovoProduto from '@/components/modulos/estoque/ModalNovoProduto';
import ModalEditarProduto from '@/components/modulos/estoque/ModalEditarProduto';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';

interface ProdutoEstoque {
  id: string; sku: string; nome: string; preco: number; saldo_estoque: number;
  descricao?: string; midia_urls?: string[]; video_url?: string;
  especificacoes_tecnicas?: { marca?: string; material?: string; cor?: string; };
  sincronizacao_bling: { sincronizado: boolean; id_produto_bling: string | null; };
}

export default function WorkspaceEstoque() {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [produtoSendoEditado, setProdutoSendoEditado] = useState<ProdutoEstoque | null>(null);

  useEffect(() => {
    const q = query(collection(bancoDeDados, 'produtos'), orderBy('nome', 'asc'));
    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id, sku: data.sku || 'N/A', nome: data.nome || 'PRODUTO SEM NOME',
            preco: data.preco || 0, saldo_estoque: data.saldo_estoque || 0,
            descricao: data.descricao, midia_urls: data.midia_urls || [], video_url: data.video_url,
            especificacoes_tecnicas: data.especificacoes_tecnicas || {},
            sincronizacao_bling: { sincronizado: data.sincronizacao_bling?.sincronizado || false, id_produto_bling: data.sincronizacao_bling?.id_produto_bling || null }
          };
        }) as ProdutoEstoque[];
        setProdutos(dados); setCarregando(false); setErro(null);
      },
      (err) => { setErro(`Falha ao carregar catálogo: ${err.message}`); setCarregando(false); }
    );
    return () => desinscrever();
  }, []);

  const abrirEdicao = (produto: ProdutoEstoque) => {
    setProdutoSendoEditado(produto); setModalEditarAberto(true);
  };

  return (
    <AppLayoutWrapper>
      <div className="flex min-h-full flex-col p-6 md:p-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div><h1 className="text-3xl font-black text-gray-900">Estoque e Catálogo</h1><p className="text-gray-500 mt-1">Gestão local espelhada e sincronização com Bling ERP.</p></div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-xl bg-white border border-gray-300 px-5 py-2.5 font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95" title="Sincronizar Bling"><span>🔄</span> Sincronizar Bling</button>
            <button onClick={() => setModalNovoAberto(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"><span>➕</span> Novo Produto</button>
          </div>
        </header>

        {erro && <div className="mb-6 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm">⚠️ {erro}</div>}

        <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4 shrink-0">
            <h2 className="text-lg font-bold text-gray-700">Produtos Cadastrados</h2><span className="rounded bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{produtos.length} Itens</span>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-600 relative">
              <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <tr><th className="px-6 py-4">SKU</th><th className="px-6 py-4">Produto</th><th className="px-6 py-4 text-right">Preço</th><th className="px-6 py-4 text-center">Estoque</th><th className="px-6 py-4 text-center">Status ERP</th><th className="px-6 py-4 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {carregando ? <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div></td></tr> : produtos.length === 0 ? <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400">Estoque Vazio</td></tr> : produtos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{p.sku}</td><td className="px-6 py-4 font-bold text-gray-900">{p.nome}</td><td className="px-6 py-4 text-right font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco)}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${p.saldo_estoque > 5 ? 'bg-emerald-100 text-emerald-800' : p.saldo_estoque > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{p.saldo_estoque}</span></td>
                    <td className="px-6 py-4 text-center">{p.sincronizacao_bling.sincronizado ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">Espelhado</span> : <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 border border-gray-200">Não Sincronizado</span>}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => abrirEdicao(p)} className="rounded border border-gray-300 px-3 py-1.5 text-xs font-bold hover:bg-gray-50 transition shadow-sm">Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <ModalNovoProduto aberto={modalNovoAberto} aoFechar={() => setModalNovoAberto(false)} />
        <ModalEditarProduto aberto={modalEditarAberto} produto={produtoSendoEditado} aoFechar={() => setModalEditarAberto(false)} />
      </div>
    </AppLayoutWrapper>
  );
}
