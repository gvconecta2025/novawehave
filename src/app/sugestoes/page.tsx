'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc,
  doc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';

interface Sugestao {
  id: string;
  titulo: string;
  descricao: string;
  status_atual: string;
  auditoria: {
    criado_por_nome?: string;
    criado_em: any;
  };
}

export default function WorkspaceSugestoes() {
  const { 
    usuarioDb, 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();
  
  // Estados do Formulário
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  
  // Estados do Feed
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  
  // Estados de Controlo (Regra Anti-Silêncio)
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Verificação de Moderação
  const isGestor = [
    'Master', 
    'Admin/Dev', 
    'Supervisor'
  ].includes(perfilRbac || '');

  // Leitura do Feed em Tempo Real (Ação 2)
  useEffect(() => {
    if (authCarregando) {
      return;
    }

    const q = query(collection(bancoDeDados, 'sugestoes'));

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Sugestao[];

        // Ordenação segura por data de criação (mais recentes no topo)
        dados.sort((a, b) => {
          const tempoA = typeof a.auditoria?.criado_em?.toMillis === 'function' 
            ? a.auditoria.criado_em.toMillis() 
            : 0;
          const tempoB = typeof b.auditoria?.criado_em?.toMillis === 'function' 
            ? b.auditoria.criado_em.toMillis() 
            : 0;
          
          return tempoB - tempoA; 
        });

        setSugestoes(dados);
        setCarregando(false);
        setErro(null);
      },
      (err: any) => {
        console.error('[ERRO FEED SUGESTÕES]', err);
        setErro(`Falha ao carregar as sugestões: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, [authCarregando]);

  // Cadastro de Nova Sugestão
  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setEnviando(true);

    try {
      const payloadSugestao = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        status_atual: 'Em Análise',
        auditoria: {
          criado_por_nome: usuarioDb?.nome_completo || 'Colaborador Oculto',
          criado_em: serverTimestamp(),
        }
      };

      await addDoc(collection(bancoDeDados, 'sugestoes'), payloadSugestao);
      
      setSucesso('💡 Excelente! A sua sugestão foi enviada para a Diretoria.');
      setTitulo('');
      setDescricao('');
      
      setTimeout(() => {
        setSucesso(null);
      }, 5000);

    } catch (err: any) {
      console.error('[ERRO ENVIAR SUGESTÃO]', err);
      setErro(`Falha ao registar a sua ideia: ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  // Moderação de Status (Apenas Gestores)
  const alterarStatus = async (idSugestao: string, novoStatus: string) => {
    if (!isGestor) return;
    
    try {
      const docRef = doc(bancoDeDados, 'sugestoes', idSugestao);
      
      await updateDoc(docRef, {
        status_atual: novoStatus
      });
      
    } catch (err: any) {
      console.error('[ERRO ALTERAR STATUS]', err);
      setErro(`Falha ao atualizar o status: ${err.message}`);
    }
  };

  const obterEstiloStatus = (status: string) => {
    switch (status) {
      case 'Em Análise':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Na Fila (Dev)':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Implementada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Recusada':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return 'Data Recente';
    }
    return new Intl.DateTimeFormat('pt-BR', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    }).format(timestamp.toDate());
  };

  if (authCarregando) {
    return (
      <div 
        className="flex h-screen w-full items-center justify-center bg-gray-50"
      >
        <div 
          className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
        >
        </div>
      </div>
    );
  }

  return (
    <AppLayoutWrapper>
      <div 
        className="flex min-h-full flex-col p-6 md:p-8"
      >
        
        {/* Cabeçalho */}
        <header 
          className="mb-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6"
        >
          <div>
            <h1 
              className="text-3xl font-black text-gray-900"
            >
              Central de Inovação
            </h1>
            <p 
              className="text-gray-500 mt-1"
            >
              Envie sugestões de melhoria, novas funcionalidades ou reporte problemas do sistema.
            </p>
          </div>
          <div 
            className="flex items-center gap-3"
          >
            <span 
              className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800 shadow-sm border border-blue-200"
            >
              <span>
                💡
              </span> 
              Feedback Loop
            </span>
          </div>
        </header>

        {/* Alertas Visuais (Anti-Silêncio) */}
        {erro && (
          <div 
            className="mb-6 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm break-words"
          >
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}
        
        {sucesso && (
          <div 
            className="mb-6 shrink-0 rounded-xl border-l-4 border-green-500 bg-green-50 p-4 font-semibold text-green-800 shadow-sm"
          >
            {sucesso}
          </div>
        )}

        {/* Estrutura Grid (Formulário à Esquerda, Feed à Direita) */}
        <div 
          className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden"
        >
          
          {/* COLUNA ESQUERDA: Formulário de Cadastro */}
          <div 
            className="w-full lg:w-[400px] shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden h-fit"
          >
            <div 
              className="border-b border-gray-100 bg-gray-50 p-5 shrink-0"
            >
              <h2 
                className="text-lg font-bold text-gray-800 flex items-center gap-2"
              >
                <span>
                  📝
                </span> 
                Nova Ideia
              </h2>
            </div>

            <form 
              onSubmit={lidarComEnvio} 
              className="p-5 flex flex-col gap-4"
            >
              <div>
                <label 
                  className="block text-sm font-bold text-gray-700 mb-2"
                >
                  Título da Sugestão *
                </label>
                <input 
                  required 
                  type="text" 
                  value={titulo} 
                  onChange={(e) => setTitulo(e.target.value)} 
                  placeholder="Ex: Novo Filtro no Painel do Caixa"
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-bold text-gray-700 mb-2"
                >
                  Descrição Detalhada *
                </label>
                <textarea 
                  required 
                  rows={6}
                  value={descricao} 
                  onChange={(e) => setDescricao(e.target.value)} 
                  placeholder="Explique como isso vai ajudar a operação da We Have..."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 resize-none custom-scrollbar" 
                />
              </div>

              <button 
                type="submit" 
                disabled={enviando} 
                className="mt-2 w-full rounded-xl bg-gray-900 py-3.5 text-sm font-black text-white transition-all hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex justify-center items-center gap-2"
              >
                {enviando ? (
                  <>
                    <div 
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    >
                    </div>
                    A ENVIAR IDEIA...
                  </>
                ) : (
                  '🚀 ENVIAR PARA DIRETORIA'
                )}
              </button>
            </form>
          </div>

          {/* COLUNA DIREITA: Feed de Sugestões */}
          <div 
            className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            <div 
              className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-5 shrink-0"
            >
              <h2 
                className="text-lg font-bold text-gray-800"
              >
                Feed de Inovação
              </h2>
              <span 
                className="text-xs font-semibold text-gray-500"
              >
                {sugestoes.length} sugestões registadas
              </span>
            </div>

            <div 
              className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/50"
            >
              {carregando ? (
                <div 
                  className="flex flex-col items-center justify-center py-20"
                >
                  <div 
                    className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"
                  >
                  </div>
                  <p 
                    className="text-sm font-medium text-gray-400"
                  >
                    A carregar ideias incríveis...
                  </p>
                </div>
              ) : sugestoes.length === 0 ? (
                <div 
                  className="py-20 text-center flex flex-col items-center"
                >
                  <span 
                    className="text-6xl mb-4 grayscale opacity-40"
                  >
                    🚀
                  </span>
                  <h3 
                    className="text-xl font-bold text-gray-600"
                  >
                    Seja o primeiro a inovar!
                  </h3>
                  <p 
                    className="text-gray-400 mt-2 text-sm max-w-sm"
                  >
                    Utilize o formulário ao lado para enviar a sua primeira sugestão de melhoria para o sistema.
                  </p>
                </div>
              ) : (
                <div 
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {sugestoes.map(sugestao => (
                    <div 
                      key={sugestao.id} 
                      className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-md relative overflow-hidden"
                    >
                      <div>
                        <div 
                          className="flex justify-between items-start mb-3"
                        >
                          <span 
                            className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${obterEstiloStatus(sugestao.status_atual)}`}
                          >
                            {sugestao.status_atual}
                          </span>
                          <span 
                            className="text-[10px] font-semibold text-gray-400"
                          >
                            {formatarData(sugestao.auditoria?.criado_em)}
                          </span>
                        </div>
                        
                        <h3 
                          className="font-black text-gray-900 text-base mb-2 line-clamp-2"
                        >
                          {sugestao.titulo}
                        </h3>
                        
                        <p 
                          className="text-sm text-gray-600 line-clamp-4 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100 italic"
                        >
                          "{sugestao.descricao}"
                        </p>
                      </div>
                      
                      <div 
                        className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3"
                      >
                        <p 
                          className="text-xs font-semibold text-gray-500"
                        >
                          Sugerido por: <strong className="text-gray-800">{sugestao.auditoria?.criado_por_nome || 'Oculto'}</strong>
                        </p>

                        {/* Moderação RBAC - Exclusivo para Gestores */}
                        {isGestor && (
                          <div 
                            className="flex flex-wrap gap-2 mt-2"
                          >
                            <button 
                              onClick={() => alterarStatus(sugestao.id, 'Em Análise')}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 transition"
                            >
                              Em Análise
                            </button>
                            <button 
                              onClick={() => alterarStatus(sugestao.id, 'Na Fila (Dev)')}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                            >
                              P/ Fila (Dev)
                            </button>
                            <button 
                              onClick={() => alterarStatus(sugestao.id, 'Implementada')}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition"
                            >
                              Implementada
                            </button>
                            <button 
                              onClick={() => alterarStatus(sugestao.id, 'Recusada')}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                            >
                              Recusada
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayoutWrapper>
  );
}
