'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { UsuarioApp } from '@/types/auth';
import ModalNovoUsuario from '@/components/modulos/equipe/ModalNovoUsuario';

export default function WorkspaceEquipe() {
  const [equipe, setEquipe] = useState<UsuarioApp[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    // Escuta ativa da coleção de usuários ordenando alfabeticamente
    const q = query(collection(bancoDeDados, 'usuarios'), orderBy('nome_completo', 'asc'));

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        // Filtra para remover usuários que sofreram soft-delete (deletado_em != null)
        const dados = snapshot.docs
          .filter(doc => !doc.data()?.auditoria?.deletado_em)
          .map((doc) => ({
            ...doc.data(),
            id_usuario: doc.id,
          })) as UsuarioApp[];
          
        setEquipe(dados);
        setCarregando(false);
      },
      (erroFirebase) => {
        console.error('[ERRO LISTAGEM EQUIPE]', erroFirebase);
        setErro('Falha ao sincronizar o quadro de funcionários. Verifique a rede.');
        setCarregando(false);
      }
    );

    return () => desinscrever();
  }, []);

  // Função auxiliar para determinar a cor do badge de acordo com o nível de privilégio (Color-Coded RBAC)
  const obterCorBadge = (perfil: string) => {
    if (['Master', 'Admin/Dev', 'Supervisor'].includes(perfil)) return 'bg-red-100 text-red-800 border-red-200';
    if (['Caixa/Financeiro'].includes(perfil)) return 'bg-green-100 text-green-800 border-green-200';
    if (['Técnicos Credenciados'].includes(perfil)) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-blue-100 text-blue-800 border-blue-200'; // Vendedores e Folguistas
  };

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100 p-8 font-sans overflow-hidden">
      
      {/* Cabeçalho do Módulo */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Gestão de Equipe</h1>
          <p className="text-gray-500 mt-1">Controle de acessos, perfis (RBAC) e auditabilidade.</p>
        </div>
        <button 
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 rounded bg-blue-900 px-6 py-3 font-bold text-white shadow-md transition hover:bg-blue-800 hover:shadow-lg active:scale-95"
        >
          <span>➕</span> Cadastrar Colaborador
        </button>
      </header>

      {/* Regra Anti-Silêncio Local */}
      {erro && (
        <div className="mb-4 w-full rounded border-l-4 border-red-500 bg-red-100 p-4 font-semibold text-red-700 shadow-sm">
          {erro}
        </div>
      )}

      {/* Tabela Data-Driven (Data Grid) */}
      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-4">Nome do Colaborador</th>
                <th scope="col" className="px-6 py-4">E-mail Corporativo</th>
                <th scope="col" className="px-6 py-4">Perfil de Acesso (RBAC)</th>
                <th scope="col" className="px-6 py-4 text-center">Status</th>
                <th scope="col" className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {carregando ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Carregando equipe...
                  </td>
                </tr>
              ) : equipe.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Nenhum colaborador encontrado no banco de dados.
                  </td>
                </tr>
              ) : (
                equipe.map((usuario) => (
                  <tr key={usuario.id_usuario} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {usuario.nome_completo}
                    </td>
                    <td className="px-6 py-4">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${obterCorBadge(usuario.perfil_rbac)}`}>
                        {usuario.perfil_rbac}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Ativo
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-blue-600 font-medium text-xs transition-colors" title="Apenas visualização nesta etapa">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renderização do Modal */}
      <ModalNovoUsuario aberto={modalAberto} aoFechar={() => setModalAberto(false)} />
    </div>
  );
}
