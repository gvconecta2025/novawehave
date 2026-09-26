'use client';

import { useState, useEffect } from 'react';
import { 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { comprimirImagemWebP } from '@/lib/utils/image';

interface ProdutoSelecionado {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  saldo_estoque: number;
  categoria?: string;
  subcategoria?: string;
  descricao?: string;
  midia_urls?: string[];
  video_url?: string;
  especificacoes_tecnicas?: Record<string, string>;
}

interface EspecificacaoDinamica {
  id: string;
  chave: string;
  valor: string;
}

interface ModalEditarProdutoProps {
  aberto: boolean;
  produto: ProdutoSelecionado | null;
  aoFechar: () => void;
}

export default function ModalEditarProduto({ aberto, produto, aoFechar }: ModalEditarProdutoProps) {
  const { 
    usuarioDb, 
    usuarioAuth 
  } = useAuthStore();
  
  // Campos Base
  const [nome, setNome] = useState('');
  const [sku, setSku] = useState('');
  const [preco, setPreco] = useState('');
  const [saldoFisico, setSaldoFisico] = useState('');
  
  // Campos de Categorização
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  
  // Campos Ricos e Mídia
  const [midiaUrls, setMidiaUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  
  // Especificações Dinâmicas (Chave-Valor)
  const [especificacoes, setEspecificacoes] = useState<EspecificacaoDinamica[]>([]);
  
  // Controlo de Estado
  const [carregando, setCarregando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Leitura do Banco e Preenchimento Reativo
  useEffect(() => {
    if (aberto && produto) {
      setNome(produto.nome || '');
      setSku(produto.sku || '');
      setPreco(produto.preco?.toString() || '0');
      setSaldoFisico(produto.saldo_estoque?.toString() || '0');
      
      setCategoria(produto.categoria || '');
      setSubcategoria(produto.subcategoria || '');
      
      setMidiaUrls(produto.midia_urls || []);
      setVideoUrl(produto.video_url || '');
      setDescricao(produto.descricao || '');
      
      // Conversão do Objeto Record para Array Dinâmico
      if (produto.especificacoes_tecnicas) {
        const specsConvertidas = Object.entries(produto.especificacoes_tecnicas).map(([k, v], idx) => ({
          id: `spec-${idx}-${Date.now()}`,
          chave: k,
          valor: v
        }));
        setEspecificacoes(specsConvertidas);
      } else {
        setEspecificacoes([]);
      }
      
      setErro(null);
    }
  }, [aberto, produto]);

  if (!aberto || !produto) return null;

  // Lógica de Upload e Compressão WebP (Client-Side)
  const lidarComUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setFazendoUpload(true);
    setErro(null);

    const novosUrls: string[] = [];
    const files = Array.from(e.target.files);

    for (const file of files) {
      try {
        const ficheiroWebP = await comprimirImagemWebP(file);
        
        const formData = new FormData();
        formData.append('image', ficheiroWebP);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Erro desconhecido ao carregar imagem.');
        }
        
        novosUrls.push(data.url);
      } catch (err: any) {
        console.error('[FALHA UPLOAD WEBP]', err);
        setErro(`Falha ao carregar a imagem ${file.name}: ${err.message}`);
      }
    }

    setMidiaUrls(prev => [...prev, ...novosUrls]);
    setFazendoUpload(false);
  };

  const removerImagem = (urlParaRemover: string) => {
    setMidiaUrls(prev => prev.filter(url => url !== urlParaRemover));
  };

  // Funções de Controlo das Especificações Dinâmicas
  const adicionarEspecificacao = () => {
    setEspecificacoes((prev) => [
      ...prev, 
      { 
        id: Date.now().toString() + Math.random().toString(), 
        chave: '', 
        valor: '' 
      }
    ]);
  };

  const removerEspecificacao = (idToRemove: string) => {
    setEspecificacoes((prev) => prev.filter(spec => spec.id !== idToRemove));
  };

  const atualizarEspecificacao = (idToUpdate: string, campo: 'chave' | 'valor', novoValor: string) => {
    setEspecificacoes((prev) => prev.map(spec => {
      if (spec.id === idToUpdate) {
        return { ...spec, [campo]: novoValor.toUpperCase() };
      }
      return spec;
    }));
  };

  // Submissão da Edição
  const lidarComEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      // Transformação do Array Dinâmico de volta para Record
      const specsRecord = especificacoes.reduce((acc, curr) => {
        if (curr.chave.trim() && curr.valor.trim()) {
          acc[curr.chave.trim().toUpperCase()] = curr.valor.trim().toUpperCase();
        }
        return acc;
      }, {} as Record<string, string>);

      const docRef = doc(bancoDeDados, 'produtos', produto.id);
      
      await updateDoc(docRef, {
        nome: nome.trim(),
        sku: sku.trim(),
        preco: parseFloat(preco) || 0,
        saldo_estoque: parseInt(saldoFisico, 10) || 0,
        categoria: categoria.trim().toUpperCase(),
        subcategoria: subcategoria.trim().toUpperCase(),
        descricao: descricao.trim(),
        midia_urls: midiaUrls,
        video_url: videoUrl.trim(),
        especificacoes_tecnicas: specsRecord,
        'auditoria.atualizado_por_id': usuarioAuth?.uid,
        'auditoria.atualizado_por_nome': usuarioDb?.nome_completo,
        'auditoria.atualizado_em': serverTimestamp(),
      });
      
      aoFechar();
      alert('📦 Produto atualizado com sucesso e especificações guardadas!');
      
    } catch (erroFirebase: any) {
      console.error('[ERRO EDICAO PRODUTO]', erroFirebase);
      setErro(`Falha ao atualizar o banco de dados: ${erroFirebase.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity"
    >
      <div 
        className="w-full max-w-4xl rounded-xl bg-white shadow-2xl overflow-hidden border border-indigo-500 flex flex-col max-h-[90vh]"
      >
        
        {/* Cabeçalho */}
        <div 
          className="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0"
        >
          <h2 
            className="text-xl font-bold text-white flex items-center gap-2"
          >
            <span>
              ✏️
            </span> 
            Editar Produto
          </h2>
          <button 
            onClick={aoFechar} 
            className="text-indigo-200 hover:text-white transition text-3xl leading-none"
            title="Fechar Modal"
          >
            &times;
          </button>
        </div>

        {/* Alerta de Erro Visual (Anti-Silêncio) */}
        {erro && (
          <div 
            className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700 shrink-0 break-words"
          >
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}

        {/* Corpo do Formulário */}
        <form 
          onSubmit={lidarComEdicao} 
          className="p-6 overflow-y-auto flex-1 custom-scrollbar"
        >
          
          {/* BLOCO 1: Informações Base */}
          <h3 
            className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2"
          >
            Informações Base
          </h3>
          <div 
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          >
            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Nome do Produto (ALL CAPS) *
              </label>
              <input 
                required 
                type="text" 
                value={nome} 
                onChange={(e) => setNome(e.target.value.toUpperCase())} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
              />
            </div>
            
            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                SKU ERP (ALL CAPS) *
              </label>
              <input 
                required 
                type="text" 
                value={sku} 
                onChange={(e) => setSku(e.target.value.toUpperCase())} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm transition" 
              />
            </div>
            
            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Preço de Venda (R$) *
              </label>
              <input 
                required 
                type="number" 
                step="0.01" 
                min="0" 
                value={preco} 
                onChange={(e) => setPreco(e.target.value)} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-green-700 transition" 
              />
            </div>
            
            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Saldo Físico Atual *
              </label>
              <input 
                required 
                type="number" 
                min="0" 
                value={saldoFisico} 
                onChange={(e) => setSaldoFisico(e.target.value)} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
              />
            </div>

            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Categoria (ALL CAPS) *
              </label>
              <input 
                required 
                type="text" 
                placeholder="Ex: SMARTPHONES"
                value={categoria} 
                onChange={(e) => setCategoria(e.target.value.toUpperCase())} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
              />
            </div>

            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Subcategoria (ALL CAPS)
              </label>
              <input 
                type="text" 
                placeholder="Ex: IPHONES"
                value={subcategoria} 
                onChange={(e) => setSubcategoria(e.target.value.toUpperCase())} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
              />
            </div>
          </div>

          {/* BLOCO 2: Mídia e Apresentação */}
          <h3 
            className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2"
          >
            Mídia e Apresentação
          </h3>
          <div 
            className="space-y-4 mb-6"
          >
            <div 
              className="bg-gray-50 p-4 rounded-lg border border-gray-200"
            >
              <label 
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Imagens do Produto (Adicionar Novas em WebP)
              </label>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={lidarComUpload} 
                disabled={fazendoUpload} 
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition cursor-pointer" 
              />
              
              {fazendoUpload && (
                <p 
                  className="text-sm font-bold text-indigo-600 mt-3 animate-pulse"
                >
                  A comprimir e carregar imagens para o servidor...
                </p>
              )}
              
              {midiaUrls.length > 0 && (
                <div 
                  className="mt-4 flex flex-wrap gap-3"
                >
                  {midiaUrls.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="relative h-20 w-20 rounded-md border border-gray-300 overflow-hidden group bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={url} 
                        alt={`Preview ${idx}`} 
                        className="h-full w-full object-cover" 
                      />
                      <button 
                        type="button" 
                        onClick={() => removerImagem(url)} 
                        className="absolute inset-0 bg-black/70 text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm backdrop-blur-sm"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                URL de Vídeo (YouTube)
              </label>
              <input 
                type="url" 
                value={videoUrl} 
                onChange={(e) => setVideoUrl(e.target.value)} 
                placeholder="https://youtube.com/watch?v=..."
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
              />
            </div>

            <div>
              <label 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Descrição Comercial
              </label>
              <textarea 
                value={descricao} 
                onChange={(e) => setDescricao(e.target.value)} 
                rows={4} 
                placeholder="Escreva os detalhes que vão convencer o cliente..."
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition custom-scrollbar" 
              />
            </div>
          </div>

          {/* BLOCO 3: Especificações Técnicas Dinâmicas */}
          <div 
            className="flex items-center justify-between mb-4 border-b border-indigo-100 pb-2"
          >
            <h3 
              className="text-lg font-bold text-indigo-900"
            >
              Especificações Técnicas
            </h3>
            <button
              type="button"
              onClick={adicionarEspecificacao}
              className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition"
            >
              + Adicionar Campo
            </button>
          </div>

          <div 
            className="space-y-3 mb-2"
          >
            {especificacoes.length === 0 ? (
              <p 
                className="text-sm text-gray-500 italic"
              >
                Nenhuma especificação associada. Clique em Adicionar Campo.
              </p>
            ) : (
              especificacoes.map((spec) => (
                <div 
                  key={spec.id} 
                  className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200"
                >
                  <div 
                    className="flex-1"
                  >
                    <input 
                      type="text" 
                      placeholder="Chave (Ex: CAPACIDADE)"
                      value={spec.chave}
                      onChange={(e) => atualizarEspecificacao(spec.id, 'chave', e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition font-semibold"
                    />
                  </div>
                  
                  <div 
                    className="flex-1"
                  >
                    <input 
                      type="text" 
                      placeholder="Valor (Ex: 128GB)"
                      value={spec.valor}
                      onChange={(e) => atualizarEspecificacao(spec.id, 'valor', e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removerEspecificacao(spec.id)}
                    className="w-8 h-8 flex items-center justify-center rounded text-red-500 bg-red-50 border border-red-200 hover:bg-red-500 hover:text-white transition-colors"
                    title="Remover especificação"
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>

          {/* RODAPÉ DO FORMULÁRIO */}
          <div 
            className="sticky bottom-0 bg-white pt-4 border-t border-gray-100 mt-6 flex justify-end gap-3 shrink-0 pb-2"
          >
            <button 
              type="button" 
              onClick={aoFechar} 
              disabled={carregando || fazendoUpload} 
              className="px-5 py-2.5 rounded-lg font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={carregando || fazendoUpload} 
              className="px-6 py-2.5 rounded-lg font-black text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
            >
              {carregando ? 'A Processar...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
