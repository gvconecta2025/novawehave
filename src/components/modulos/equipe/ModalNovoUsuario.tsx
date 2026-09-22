'use client';

import { useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { PerfilRBAC } from '@/types/auth';

interface ModalNovoUsuarioProps {
  aberto: boolean;
  aoFechar: () => void;
}

const PERFIS_DISPONEIS: PerfilRBAC[] = [
  'Master', 'Supervisor', 'Admin/Dev', 'Vendedores', 
  'Folguista', 'Caixa/Financeiro', 'Técnicos Credenciados'
];

export default function ModalNovoUsuario({ aberto, aoFechar }: ModalNovoUsuarioProps) {
  const { usuarioDb, usuarioAuth } = useAuthStore();
  
  // Estados do Formulário
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilRBAC>('Vendedores');
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    // Variável para armazenar a instância temporária
    let aplicativoSecundario;

    try {
      // 1. Recria as credenciais via variáveis de ambiente (mantém isolamento do config principal)
      const configuracaoSecundaria = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
      };

      // 2. Inicializa o App Secundário para não deslogar o Admin atual
      aplicativoSecundario = initializeApp(configuracaoSecundaria, 'AppRegistroEquipe');
      const authSecundario = getAuth(aplicativoSecundario);

      // 3. Cria a autenticação no Firebase Auth
      const credencial = await createUserWithEmailAndPassword(authSecundario, email, senha);
      const novoUsuario = credencial.user;

      // 4. Grava os dados RBAC e LGPD no Firestore usando a instância PRINCIPAL (bancoDeDados)
      await setDoc(doc(bancoDeDados, 'usuarios', novoUsuario.uid), {
        id_usuario: novoUsuario.uid,
        nome_completo: nomeCompleto,
        email: email,
        perfil_rbac: perfilSelecionado,
        dados_acesso: {
          ultimo_login: null,
          status: 'ativo'
        },
        lgpd: {
          consentimento_fornecido: true, // Consentimento administrativo padrão no ato da contratação
          data_aceite: serverTimestamp(),
          ip_aceite: 'criacao_interna_admin'
        },
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Admin',
          criado_em: serverTimestamp(),
          atualizado_por: null,
          deletado_em: null // Lei do Soft Delete
        }
      });

      // 5. Finaliza a sessão do App Secundário para limpar a memória
      await signOut(authSecundario);

      alert(`✅ Colaborador ${nomeCompleto} cadastrado com sucesso!`);
      
      // Limpa formulário e fecha modal
      setNomeCompleto('');
      setEmail('');
      setSenha('');
      setPerfilSelecionado('Vendedores');
      aoFechar();

    } catch (erroFirebase: any) {
      console.error('[ERRO CADASTRO EQUIPE]', erroFirebase);
      
      // Regra Anti-Silêncio: Tradução de erros comuns do Firebase Auth
      let mensagemAmigavel = 'Ocorreu um erro ao cadastrar o usuário.';
      if (erroFirebase.code === 'auth/email-already-in-use') {
        mensagemAmigavel = 'Este e-mail já está em uso por outro colaborador.';
      } else if (erroFirebase.code === 'auth/weak-password') {
        mensagemAmigavel = 'A senha provisória deve ter no mínimo 6 caracteres.';
      } else if (erroFirebase.code === 'auth/invalid-email') {
        mensagemAmigavel = 'O formato do e-mail é inválido.';
      }
      
      setErro(mensagemAmigavel);
    } finally {
      // 6. Destrói o App Secundário definitivamente, independente de sucesso ou erro
      if (aplicativoSecundario) {
        await deleteApp(aplicativoSecundario).catch(console.error);
      }
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
        
        <div className="bg-blue-900 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Novo Colaborador</h2>
          <button onClick={aoFechar} className="text-blue-200 hover:text-white transition text-2xl leading-none">
            &times;
          </button>
        </div>

        {erro && (
          <div className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700">
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={lidarComEnvio} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome Completo *</label>
            <input 
              required type="text" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} 
              className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="Ex: Carlos Oliveira" 
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail Corporativo *</label>
            <input 
              required type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
              className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="carlos@wehave.com.br" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Senha Provisória *</label>
              <input 
                required type="text" value={senha} onChange={(e) => setSenha(e.target.value)} 
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Mínimo 6 caracteres" 
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Perfil (RBAC) *</label>
              <select 
                required value={perfilSelecionado} onChange={(e) => setPerfilSelecionado(e.target.value as PerfilRBAC)}
                className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {PERFIS_DISPONEIS.map(perfil => (
                  <option key={perfil} value={perfil}>{perfil}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-3 rounded-md mt-2 text-xs text-gray-600">
            <strong>Auditoria:</strong> Este cadastro será registrado em nome de {usuarioDb?.nome_completo || 'Admin'}.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={aoFechar} disabled={carregando} className="px-5 py-2.5 rounded font-semibold text-gray-600 hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={carregando} className="flex items-center gap-2 px-6 py-2.5 rounded font-bold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-50">
              {carregando ? 'Registrando...' : 'Cadastrar Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
