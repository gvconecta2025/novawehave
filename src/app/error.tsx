'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundaryGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ERRO CAPTURADO PELO BOUNDARY]:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 p-6 font-sans text-gray-900">
      <div className="w-full max-w-2xl rounded-2xl border-t-8 border-red-600 bg-white p-10 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-5xl font-bold text-red-600 shadow-inner">
            ⚠️
          </span>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">FALHA DE EXECUÇÃO</h1>
          <p className="mt-2 text-sm font-semibold text-red-600 uppercase tracking-widest">
            Lei Anti-Silêncio: Exceção Interceptada
          </p>
        </div>

        <div className="mb-8 overflow-hidden rounded-lg border border-red-200 bg-red-50 shadow-inner">
          <div className="border-b border-red-200 bg-red-100 px-4 py-2 text-xs font-bold text-red-800 uppercase tracking-wider">
            Detalhe Técnico Exato do Erro
          </div>
          <div className="max-h-48 overflow-y-auto p-4 font-mono text-sm text-red-900 whitespace-pre-wrap break-words">
            {error.message || 'Erro desconhecido. Verifique o console.'}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-red-700 active:scale-95"
          >
            Tentar Novamente
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-8 py-3 text-sm font-bold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-95"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}
