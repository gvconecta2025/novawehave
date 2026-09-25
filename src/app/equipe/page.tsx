'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';
import Link from 'next/link';

export default function WorkspaceEquipe() {
  const { usuarioAuth, perfilRbac, authCarregando } = useAuthStore() as any;
  const [membros, setMembros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const acessoPermitido = ['Master', 'Supervisor', 'Admin/Dev'].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) { if (!authCarregando && !acessoPermitido) setCarregando(false); return; }
    const un = onSnapshot(query(collection(bancoDeDados, 'usuarios'), orderBy('nome_completo', 'asc')), (snap) => {
      setMembros(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setCarregando(false);
    }, (err) => { setErro(err.message); setCarregando(false); });
    return () => un();
  }, [acessoPermitido, authCarregando]);

  if (authCarregando) return <div className="flex h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;
  if (!acessoPermitido) return <div className="flex h-screen w-full items-center justify-center bg-gray-100"><Link href="/pdv" className="rounded bg-blue-600 px-6 py-2.5 text-white">Voltar</Link></div>;

  return (
    <AppLayoutWrapper>
      <div className="flex min-h-full flex-col p-6 md:p-8">
        <header className="mb-8 shrink-0 border-b border-gray-200 pb-6"><h1 className="text-3xl font-black text-gray-900">Gestão de Equipe</h1></header>
        {erro && <div className="mb-4 shrink-0 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800">{erro}</div>}
        <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white text-xs uppercase text-gray-500 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <tr><th className="px-6 py-4">Colaborador</th><th className="px-6 py-4">Perfil</th><th className="px-6 py-4">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {membros.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900">{m.nome_completo}</td>
                    <td className="px-6 py-4">{m.perfil_rbac}</td>
                    <td className="px-6 py-4">{m.acesso_liberado !== false ? 'Liberado' : 'Bloqueado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayoutWrapper>
  );
}
