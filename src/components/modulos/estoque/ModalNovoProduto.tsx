'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

interface ModalNovoProdutoProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function ModalNovoProduto({ aberto, aoFechar }: ModalNovoProdutoProps) {
  const { usuarioDb, usuarioAuth } = useAuthStore();
  
  // Campos Base
  const [nome, setNome] = useState('');
  const [sku, setSku] = useState('');
  const [preco, setPreco] = useState('');
  const [saldoFisico, setSaldoFisico] = useState('');
  
  // Novos Campos (Mídia e Especificações)
  const [midiaUrls, setMidiaUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  const [marca, setMarca] = useState('');
  const [material, setMaterial] = useState('');
  const [cor, setCor] = useState('');
  
  // Estados de Controlo
  const [carregando, setCarregando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Geração de SKU Inteligente
  useEffect(() => {
    if (aberto && !sku) {
      setSku(`WH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    }
  }, [aberto, sku]);

  if (!aberto) return null;

  // Função para comunicar com a nova API Route (Upload Múltiplo)
  const lidarComUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setFazendoUpload(true);
    setErro(null);

    const novosUrls: string[] = [];
    const files = Array.from(e.target.files);

    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro desconhecido ao carregar imagem.');
        
        novosUrls.push(data.url);
      } catch (err: any) {
        console.error('[FALHA UPLOAD]', err);
        setErro(`Falha ao carregar a imagem ${file.name}: ${err.message}`);
      }
    }

    setMidiaUrls(prev => [...prev, ...novosUrls]);
    setFazendoUpload(false);
  };

  const removerImagem = (urlParaRemover: string) => {
    setMidiaUrls(prev => prev.filter(url => url !== urlParaRemover));
  };

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const payloadProduto = {
        nome: nome.trim(),
        sku: sku.trim(),
        preco: parseFloat(preco) || 0,
        saldo_estoque: parseInt(saldoFisico, 10) || 0,
        descricao: descricao.trim(),
        midia_urls: midiaUrls,
        video_url: videoUrl.trim(),
        especificacoes_tecnicas: {
          marca: marca.trim(),
          material: material.trim(),
          cor: cor.trim()
        },
        sincronizacao_bling: { sincronizado: false, id_produto_bling: null },
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Usuário Não Identificado',
          criado_em: serverTimestamp(),
          atualizado_por: null,
          deletado_em: null
        }
      };

      await addDoc(collection(bancoDeDados, 'produtos'), payloadProduto);
      
      // Limpeza
      setNome(''); setSku(''); setPreco(''); setSaldoFisico('');
      setMidiaUrls([]); setVideoUrl(''); setDescricao(''); 
      setMarca(''); setMaterial(''); setCor('');
      
      aoFechar();
      alert('📦 Produto completo cadastrado com sucesso no catálogo!');
    } catch (erroFirebase: any) {
      console.error('[ERRO CADASTRO PRODUTO]', erroFirebase);
      setErro(`Falha ao registrar na base de dados: ${erroFirebase.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl overflow-hidden border border-indigo-500 flex flex-col max-h-[90vh]">
        
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📦</span> Novo Produto Detalhado
          </h2>
          <button onClick={aoFechar} className="text-indigo-200 hover:text-white transition text-2xl leading-none">&times;</button>
        </div>

        {erro && (
          <div className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700 shrink-0 break-words">⚠️ {erro}</div>
        )}

        <form onSubmit={lidarComEnvio} className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* BLOCO 1: Informações Base */}
          <h3 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Informações Base</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Produto (ALL CAPS) *</label>
              <input required type="text" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">SKU ERP (ALL CAPS) *</label>
              <input required type="text" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Preço de Venda (R$) *</label>
              <input required type="number" step="0.01" min="0" value={preco} onChange={(e) => setPreco(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-green-700" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Saldo Físico Inicial *</label>
              <input required type="number" min="0" value={saldoFisico} onChange={(e) => setSaldoFisico(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          {/* BLOCO 2: Mídia e Conteúdo Rica */}
          <h3 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Mídia e Apresentação</h3>
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Imagens do Produto (Upload para ImgBB)</label>
              <input type="file" accept="image/*" multiple onChange={lidarComUpload} disabled={fazendoUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition" />
              
              {fazendoUpload && <p className="text-sm font-bold text-indigo-600 mt-3 animate-pulse">A carregar imagens para o servidor...</p>}
              
              {midiaUrls.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {midiaUrls.map((url, idx) => (
                    <div key={idx} className="relative h-20 w-20 rounded-md border border-gray-300 overflow-hidden group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removerImagem(url)} className="absolute inset-0 bg-black/50 text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">X</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">URL de Vídeo (YouTube)</label>
              <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição Comercial (Vitrine Pública)</label>
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Escreva os detalhes que vão convencer o cliente na Loja Pública..." />
            </div>
          </div>

          {/* BLOCO 3: Especificações Técnicas */}
          <h3 className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2">Especificações Técnicas (ALL CAPS)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Marca</label>
              <input type="text" value={marca} onChange={(e) => setMarca(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Material</label>
              <input type="text" value={material} onChange={(e) => setMaterial(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cor</label>
              <input type="text" value={cor} onChange={(e) => setCor(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          {/* RODAPÉ DO FORMULÁRIO */}
          <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100 mt-6 flex justify-end gap-3 shrink-0 pb-2">
            <button type="button" onClick={aoFechar} disabled={carregando || fazendoUpload} className="px-5 py-2.5 rounded font-semibold text-gray-600 hover:bg-gray-100 transition">Cancelar</button>
            <button type="submit" disabled={carregando || fazendoUpload} className="px-6 py-2.5 rounded font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 shadow-md">
              {carregando ? 'Salvando...' : 'Cadastrar Produto Completo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
