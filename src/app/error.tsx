'use client';

import { useEffect } from 'react';

export default function ErrorBoundaryGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registo do erro na consola para os programadores
    console.error('[ERRO CAPTURADO PELO BOUNDARY GLOBAL]:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-zinc-900 p-6 font-sans text-white">
      <div className="w-full max-w-2xl rounded-xl border-l-4 border-red-500 bg-zinc-800 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3 border-b border-zinc-700 pb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-2xl font-bold">
            !
          </span>
          <div>
            <h1 className="text-xl font-black tracking-wider text-red-400">FALHA CRÍTICA NO CLIENTE</h1>
            <p className="text-xs text-zinc-400">Lei Anti-Silêncio: Exceção não tratada na interface.</p>
          </div>
        </div>

        <div className="mb-6 rounded-md bg-black p-4 text-sm font-mono text-red-300 shadow-inner overflow-auto max-h-64 break-words">
          <strong>Mensagem Técnica:</strong>
          <br />
          {error.message || 'Erro desconhecido. Verifique a consola do navegador.'}
        </div>

        <div className="rounded bg-zinc-900 p-4 text-sm text-zinc-400 border border-zinc-700">
          <p className="font-bold text-white mb-2">Instruções de Diagnóstico (Vercel):</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Aceda ao painel da Vercel no menu <strong>Settings &gt; Environment Variables</strong>.</li>
            <li>Certifique-se de que TODAS as variáveis <code className="bg-zinc-800 px-1 text-yellow-400">NEXT_PUBLIC_FIREBASE_...</code> estão preenchidas.</li>
            <li>Se adicionou as variáveis recentemente, é obrigatório fazer um novo <strong>Redeploy</strong> (Deployments &gt; Redeploy).</li>
          </ul>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => window.location.href = '/login'}
            className="rounded border border-zinc-600 px-6 py-2 text-sm font-bold text-zinc-300 transition hover:bg-zinc-700"
          >
            Voltar ao Login
          </button>
          <button
            onClick={() => reset()}
            className="rounded bg-red-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-red-700 shadow-md"
          >
            Tentar Recarregar Componente
          </button>
        </div>
      </div>
    </div>
  );
}
