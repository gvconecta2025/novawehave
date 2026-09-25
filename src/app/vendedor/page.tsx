'use client';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';

export default function WorkspaceVendedor() {
  return (
    <AppLayoutWrapper>
      <div className="flex min-h-full flex-col p-6 md:p-8">
        <header className="mb-8 shrink-0 border-b border-gray-200 pb-6"><h1 className="text-3xl font-black">Painel de Desempenho</h1></header>
        <div className="flex-1 flex items-center justify-center text-gray-400">Auditoria Pessoal do Operador.</div>
      </div>
    </AppLayoutWrapper>
  );
}
