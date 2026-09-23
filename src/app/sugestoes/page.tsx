'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

interface Sugestao {
  id: string;
  titulo: string;
  descricao: string;
  auditoria: {
    criado_por_nome: string;
    criado_em: any;
  };
}

export default function WorkspaceSugestoes() {
  const { usuarioDb, usuarioAuth } = useAuthStore();
  
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  
  const [carregandoFeed, setCarregandoFeed] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(bancoDeDados, 'sugestoes'), orderBy('auditoria.criado_em', 'desc'));

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Sugestao[];
        
        setSugestoes(dados);
        setCarregandoFeed(false);
      },
      (err) => {
        console.error('[ERRO FEED SUGESTÕES]', err);
        setErro('Falha ao carregar o mural de sugestões da equipe.');
        setCarregandoFeed(false);
      }
    );

    return () => desinscrever();
  }, []);

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const payloadSugestao = {
        titulo,
        descricao,
        // Auditoria Estrita (Lei 3)
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Colaborador Oculto',
          criado_em: serverTimestamp(),
          deletado_em: null
        }
      };

      await addDoc(collection(bancoDeDados, 'sugestoes'), payloadSugestao);
      
      setTitulo('');
      setDescricao('');
      alert('💡 Sugestão enviada com sucesso! Obrigado pela colaboração.');
    } catch (err) {
      console.error('[ERRO GRAVAR SUGESTÃO]', err);
      setErro('Ocorreu um erro ao gravar sua sugestão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp) return 'Agora mesmo';
    const data = timestamp.toDate();
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-gray-50 p-8 font-sans overflow-hidden">
      
      <header className="mb-6">
        <h1 className="text-3xl font-black text-gray-900">Central de Sugestões</h1>
        <p className="text-gray-500 mt-1">Colabore com ideias de melhorias para a loja e equipe.</p>
      </header>

      {/* Regra Anti-Silêncio Local */}
      {erro && (
        <div className="mb-6 w-full rounded border-l-4 border-red-500 bg-red-100 p-4 font-semibold text-red-700 shadow-sm">
          ⚠️ {erro}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
        
        {/* Formulário (Esquerda) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-xl">✍️</span> Nova Ideia
            </h2>
            <form onSubmit={lidarComEnvio} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Título / Assunto</label>
                <input
                  required
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Melhoria no PDV..."
                  className="w-full rounded border border-gray-300 p-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Descrição Detalhada</label>
                <textarea
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={4}
                  placeholder="Descreva a sua ideia de forma clara..."
                  className="w-full rounded border border-gray-300 p-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="submit"
                disabled={enviando || titulo.trim() === '' || descricao.trim() === ''}
                className="w-full rounded bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {enviando ? 'Enviando...' : 'Publicar Sugestão'}
              </button>
            </form>
          </div>
        </div>

        {/* Mural / Feed (Direita) */}
        <div className="w-full lg:w-2/3 flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Mural da Equipe</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {carregandoFeed ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3"></div>
                <p className="text-sm font-medium">Carregando mural...</p>
              </div>
            ) : sugestoes.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                <span className="text-5xl mb-3 opacity-50">💡</span>
                <p className="text-sm font-medium">O mural está vazio. Seja o primeiro a colaborar!</p>
              </div>
            ) : (
              sugestoes.map((sugestao) => (
                <div key={sugestao.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900">{sugestao.titulo}</h3>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded whitespace-nowrap">
                      {sugestao.auditoria.criado_por_nome}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap leading-relaxed">{sugestao.descricao}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Enviado em {formatarData(sugestao.auditoria.criado_em)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
