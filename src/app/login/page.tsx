'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { autenticacao } from '@/lib/firebase/config';

export default function TelaLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  
  const router = useRouter();

  const lidarComLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      await signInWithEmailAndPassword(autenticacao, email, senha);
      
      // O Zustand (useAuthStore) via AuthProvider interceptará a mudança de estado,
      // mas já forçamos o redirecionamento para o PDV por padrão.
      router.push('/pdv');
      
    } catch (erroFirebase: any) {
      // Política Anti-Silêncio: Tratamento visual de erros para o balcão
      console.error('[ERRO DE AUTENTICAÇÃO]', erroFirebase);
      
      let mensagemAmigavel = 'Ocorreu um erro inesperado. Contate o suporte.';
      
      switch (erroFirebase.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          mensagemAmigavel = 'E-mail ou senha incorretos. Verifique suas credenciais.';
          break;
        case 'auth/invalid-email':
          mensagemAmigavel = 'O formato do e-mail é inválido.';
          break;
        case 'auth/network-request-failed':
          mensagemAmigavel = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
          break;
        case 'auth/too-many-requests':
          mensagemAmigavel = 'Muitas tentativas falhas. Conta temporariamente bloqueada. Tente mais tarde.';
          break;
      }
      
      setErro(mensagemAmigavel);
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-900 px-4 font-sans text-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
        
        {/* Cabeçalho de Identidade Visual */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-widest text-zinc-900">
            WE<span className="text-blue-600">HAVE</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Acesso Restrito - Sistema Operacional
          </p>
        </div>

        {/* Exibição Visual de Erro (Anti-Silêncio) */}
        {erro && (
          <div className="mb-6 rounded-md border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <p className="font-semibold">Falha no Login:</p>
            <p>{erro}</p>
          </div>
        )}

        {/* Formulário de Autenticação */}
        <form onSubmit={lidarComLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-gray-700">
              E-mail Corporativo
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={carregando}
              required
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              placeholder="seu.nome@wehave.com.br"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-semibold text-gray-700">
              Senha de Acesso
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={carregando}
              required
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="flex w-full items-center justify-center rounded-md bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {carregando ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Autenticando...
              </span>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>
        
        {/* Rodapé LGPD e Informativo */}
        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          <p>
            Ao realizar o login, você confirma que está de acordo com as diretrizes de LGPD e segurança da informação da empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
