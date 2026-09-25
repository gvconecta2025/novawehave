'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import Link from 'next/link';
import { PerfilRBAC } from '@/types/auth';

interface MembroEquipe {
  id: string;
  nome_completo: string;
  email: string;
  perfil_rbac: PerfilRBAC;
  acesso_liberado?: boolean;
}

const LISTA_PERFIS: PerfilRBAC[] = [
  'Master', 
  'Supervisor', 
  'Admin/Dev', 
  'Vendedores', 
  'Folguista', 
  'Caixa/Financeiro', 
  'Técnicos Credenciados'
];

export default function WorkspaceEquipe() {
  const { 
    usuarioAuth, 
    perfilRbac, 
    carregando: authCarregando 
  } = useAuthStore();
  
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Barreira RBAC
  const acessoPermitido = [
    'Master', 
    'Supervisor', 
    'Admin/Dev'
  ].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) {
        setCarregando(false);
      }
      return;
    }

    const q = query(
      collection(bancoDeDados, 'usuarios'), 
      orderBy('nome_completo', 'asc')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map(doc => ({
          id: doc.id,
          nome_completo: doc.data().nome_completo || 'Sem Nome',
          email: doc.data().email || 'Sem E-mail',
          perfil_rbac: doc.data().perfil_rbac || 'Vendedores',
          acesso_liberado: doc.data().acesso_liberado !== false,
        })) as MembroEquipe[];
        
        setMembros(dados);
        setCarregando(false);
        setErro(null);
      },
      (err: any) => {
        console.error('[ERRO LISTAGEM EQUIPE]', err);
        setErro(`Falha ao conectar com o banco de dados [${err.code}]: ${err.message}`);
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, [acessoPermitido, authCarregando]);

  const lidarComAlteracaoPerfil = async (
    idUsuario: string, 
    novoPerfil: string, 
    nomeMembro: string
  ) => {
    if (!confirm(`Deseja alterar o perfil de ${nomeMembro} para ${novoPerfil}?`)) return;
    
    setErro(null);
    setSucesso(null);

    try {
      const docRef = doc(bancoDeDados, 'usuarios', idUsuario);
      await updateDoc(docRef, {
        perfil_rbac: novoPerfil,
        'auditoria.perfil_atualizado_em': serverTimestamp(),
        'auditoria.perfil_atualizado_por': usuarioAuth?.uid
      });
      
      setSucesso(`✅ Perfil de ${nomeMembro} atualizado com sucesso para ${novoPerfil}.`);
      
      setTimeout(() => {
        setSucesso(null);
      }, 4000);
      
    } catch (err: any) {
      console.error('[ERRO ALTERAR PERFIL]', err);
      setErro(`Falha ao alterar perfil de ${nomeMembro}: ${err.message}`);
    }
  };

  const lidarComAlternanciaAcesso = async (
    idUsuario: string, 
    statusAtual: boolean, 
    nomeMembro: string
  ) => {
    const acaoTexto = statusAtual ? 'BLOQUEAR o acesso de' : 'LIBERAR o acesso de';
    
    if (!confirm(`Deseja realmente ${acaoTexto} ${nomeMembro}?`)) return;

    setErro(null);
    setSucesso(null);

    try {
      const docRef = doc(bancoDeDados, 'usuarios', idUsuario);
      
      await updateDoc(docRef, {
        acesso_liberado: !statusAtual,
        'auditoria.acesso_alterado_em': serverTimestamp(),
        'auditoria.acesso_alterado_por': usuarioAuth?.uid
      });
      
      const msg = !statusAtual 
        ? `✅ Acesso liberado para ${nomeMembro}.` 
        : `🔒 Acesso bloqueado para ${nomeMembro}.`;
        
      setSucesso(msg);
      
      setTimeout(() => {
        setSucesso(null);
      }, 4000);
      
    } catch (err: any) {
      console.error('[ERRO ALTERAR ACESSO]', err);
      setErro(`Falha ao alterar status de acesso de ${nomeMembro}: ${err.message}`);
    }
  };

  const obterCorPerfil = (perfil: string) => {
    switch (perfil) {
      case 'Master': 
        return 'bg-gray-900 text-white';
      case 'Admin/Dev': 
        return 'bg-gray-700 text-gray-100';
      case 'Supervisor': 
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Vendedores': 
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Folguista': 
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'Caixa/Financeiro': 
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'Técnicos Credenciados': 
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authCarregando) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent">
        </div>
      </div>
    );
  }

  if (!acessoPermitido) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans">
        <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl">
          <span className="mb-4 text-6xl">
            ⛔
          </span>
          <h1 className="mb-2 text-2xl font-black text-gray-900">
            Acesso Restrito
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            O seu perfil ({perfilRbac}) não possui autorização executiva para gerir a equipa.
          </p>
          <Link 
            href="/pdv" 
            className="rounded bg-blue-600 px-6 py-2.5 font-bold text-white transition hover:bg-blue-700"
          >
            Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppLayoutWrapper>
      <div className="flex min-h-full flex-col p-6 md:p-8">
        
        <header className="mb-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">
              Gestão de Equipe e Acessos
            </h1>
            <p className="text-gray-500 mt-1">
              Controle de perfis (RBAC), funções operacionais e bloqueio de turnos.
            </p>
          </div>
        </header>

        {erro && (
          <div className="mb-6 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm break-words">
            ⚠️ {erro}
          </div>
        )}
        
        {sucesso && (
          <div className="mb-6 shrink-0 rounded-xl border-l-4 border-green-500 bg-green-50 p-4 font-semibold text-green-800 shadow-sm animate-pulse-short">
            {sucesso}
          </div>
        )}

        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
          
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4 shrink-0">
            <h2 className="text-lg font-bold text-gray-800">
              Colaboradores Cadastrados
            </h2>
            <span className="rounded bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              {membros.length} Ativos
            </span>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-600 relative">
              <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">
                    Colaborador
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold">
                    Perfil / Cargo (RBAC)
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold text-center">
                    Status do Acesso
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold text-right">
                    Ação Rápida
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {carregando ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto">
                        </div>
                        <p className="text-sm font-medium text-gray-500">
                          A carregar registos da equipa...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : membros.length === 0 && !erro ? (
                  <tr>
                    <td 
                      colSpan={4} 
                      className="px-6 py-12 text-center text-gray-400 font-medium"
                    >
                      Nenhum colaborador encontrado na base de dados.
                    </td>
                  </tr>
                ) : (
                  membros.map((membro) => {
                    const isMe = membro.id === usuarioAuth?.uid;

                    return (
                      <tr 
                        key={membro.id} 
                        className={`transition-colors ${isMe ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 flex items-center gap-2">
                            {membro.nome_completo}
                            {isMe && (
                              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Você
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {membro.email}
                          </p>
                        </td>
                        
                        <td className="px-6 py-4">
                          <select
                            disabled={isMe}
                            value={membro.perfil_rbac}
                            onChange={(e) => lidarComAlteracaoPerfil(membro.id, e.target.value, membro.nome_completo)}
                            title={isMe ? "Você não pode alterar o próprio perfil." : "Alterar perfil de acesso"}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold font-sans outline-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-80 appearance-none ${obterCorPerfil(membro.perfil_rbac)}`}
                          >
                            {LISTA_PERFIS.map(perfil => (
                              <option 
                                key={perfil} 
                                value={perfil} 
                                className="bg-white text-gray-900"
                              >
                                {perfil}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-6 py-4 text-center">
                          {membro.acesso_liberado ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 border border-green-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500">
                              </span>
                              Liberado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse">
                              </span>
                              Bloqueado
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            disabled={isMe}
                            onClick={() => lidarComAlternanciaAcesso(membro.id, membro.acesso_liberado || false, membro.nome_completo)}
                            title={isMe ? "Regra de Imunidade: Não pode bloquear-se a si mesmo." : "Alternar acesso"}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                              membro.acesso_liberado ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                membro.acesso_liberado ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayoutWrapper>
  );
}
