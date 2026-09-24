'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import Link from 'next/link';
import { PerfilRBAC } from '@/types/auth';

interface MembroEquipe {
  id: string;
  nome_completo: string;
  email: string;
  perfil_rbac: PerfilRBAC;
  acesso_liberado?: boolean;
}

const LISTA_PERFIS: PerfilRBAC[] = ['Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 'Folguista', 'Caixa/Financeiro', 'Técnicos Credenciados'];

export default function WorkspaceEquipe() {
  const { usuarioAuth, perfilRbac, carregando: authCarregando } = useAuthStore();
  
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const acessoPermitido = ['Master', 'Supervisor', 'Admin/Dev'].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) setCarregando(false);
      return;
    }

    const q = query(collection(bancoDeDados, 'usuarios'), orderBy('nome_completo', 'asc'));

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

  const lidarComAlteracaoPerfil = async (idUsuario: string, novoPerfil: string, nomeMembro: string) => {
    if (!confirm(`Deseja alterar o perfil de ${nomeMembro} para ${novoPerfil}?`)) return;
    setErro(null); setSucesso(null);
    try {
      await updateDoc(doc(bancoDeDados, 'usuarios', idUsuario), {
        perfil_rbac: novoPerfil,
        'auditoria.perfil_atualizado_em': serverTimestamp(),
        'auditoria.perfil_atualizado_por': usuarioAuth?.uid
      });
      setSucesso(`✅ Perfil de ${nomeMembro} atualizado com sucesso para ${novoPerfil}.`);
      setTimeout(() => setSucesso(null), 4000);
    } catch (err: any) {
      setErro(`Falha ao alterar perfil: ${err.message}`);
    }
  };

  const lidarComAlternanciaAcesso = async (idUsuario: string, statusAtual: boolean, nomeMembro: string) => {
    const acaoTexto = statusAtual ? 'BLOQUEAR o acesso de' : 'LIBERAR o acesso de';
    if (!confirm(`Deseja realmente ${acaoTexto} ${nomeMembro}?`)) return;
    setErro(null); setSucesso(null);
    try {
      await updateDoc(doc(bancoDeDados, 'usuarios', idUsuario), {
        acesso_liberado: !statusAtual,
        'auditoria.acesso_alterado_em': serverTimestamp(),
        'auditoria.acesso_alterado_por': usuarioAuth?.uid
      });
      setSucesso(!statusAtual ? `✅ Acesso liberado para ${nomeMembro}.` : `🔒 Acesso bloqueado para ${nomeMembro}.`);
      setTimeout(() => setSucesso(null), 4000);
    } catch (err: any) {
      setErro(`Falha ao alterar status de acesso: ${err.message}`);
    }
  };

  const obterCorPerfil = (perfil: string) => {
    switch (perfil) {
      case 'Master': return 'bg-gray-900 text-white';
      case 'Admin/Dev': return 'bg-gray-700 text-gray-100';
      case 'Supervisor': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Vendedores': return 'bg-green-100 text-green-800 border border-green-200';
      case 'Folguista': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'Caixa/Financeiro': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'Técnicos Credenciados': return 'bg-amber-100 text-amber-800 border border-amber-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (authCarregando) {
    return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;
  }

  if (!acessoPermitido) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 p-8">
        <div className="flex max-w-md flex-col items-center text-center"><span className="text-6xl mb-4">⛔</span><h1 className="text-2xl font-black">Acesso Restrito</h1><Link href="/pdv" className="mt-4 rounded bg-blue-600 px-6 py-2.5 text-white font-bold">Voltar</Link></div>
      </div>
    );
  }

  return (
    // AÇÃO 1: Wrapper Flex Global do App Shell Fluido
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <MenuLateral />
      
      <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8 transition-all duration-300 relative">
        <header className="mb-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Gestão de Equipe e Acessos</h1>
            <p className="text-gray-500 mt-1">Controle de perfis (RBAC), funções operacionais e bloqueio de turnos.</p>
          </div>
        </header>

        {erro && <div className="mb-4 shrink-0 rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm">{erro}</div>}
        {sucesso && <div className="mb-4 shrink-0 rounded border-l-4 border-green-500 bg-green-50 p-4 font-semibold text-green-800 shadow-sm">{sucesso}</div>}

        <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4 shrink-0">
            <h2 className="text-lg font-bold text-gray-800">Colaboradores Cadastrados</h2>
            <span className="rounded bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">{membros.length} Ativos</span>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Colaborador</th>
                  <th scope="col" className="px-6 py-4 font-bold">Perfil / Cargo (RBAC)</th>
                  <th scope="col" className="px-6 py-4 font-bold text-center">Status do Acesso</th>
                  <th scope="col" className="px-6 py-4 font-bold text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {carregando ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div></td></tr>
                ) : membros.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Nenhum colaborador encontrado.</td></tr>
                ) : (
                  membros.map((membro) => {
                    const isMe = membro.id === usuarioAuth?.uid;
                    return (
                      <tr key={membro.id} className={`transition-colors ${isMe ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 flex items-center gap-2">{membro.nome_completo} {isMe && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase">Você</span>}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{membro.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <select disabled={isMe} value={membro.perfil_rbac} onChange={(e) => lidarComAlteracaoPerfil(membro.id, e.target.value, membro.nome_completo)} className={`px-3 py-1.5 rounded-md text-xs font-bold outline-none cursor-pointer disabled:opacity-80 ${obterCorPerfil(membro.perfil_rbac)}`}>
                            {LISTA_PERFIS.map(p => <option key={p} value={p} className="bg-white text-gray-900">{p}</option>)}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${membro.acesso_liberado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${membro.acesso_liberado ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
                            {membro.acesso_liberado ? 'Liberado' : 'Bloqueado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button disabled={isMe} onClick={() => lidarComAlternanciaAcesso(membro.id, membro.acesso_liberado || false, membro.nome_completo)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${membro.acesso_liberado ? 'bg-green-500' : 'bg-red-500'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${membro.acesso_liberado ? 'translate-x-5' : 'translate-x-0'}`} />
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
    </div>
  );
}
