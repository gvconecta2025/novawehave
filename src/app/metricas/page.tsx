'use client';
import { useAuthStore } from '@/store/useAuthStore';
import AppLayoutWrapper from '@/components/global/AppLayoutWrapper';

export default function WorkspaceMetricas() {
  const { perfilRbac } = useAuthStore();
  return (
    <AppLayoutWrapper>
      <div className="flex min-h-full flex-col p-6 md:p-8">
        <header className="mb-8 shrink-0 border-b border-gray-200 pb-6"><h1 className="text-3xl font-black">Métricas Globais</h1></header>
        <div className="flex-1 flex items-center justify-center text-gray-400">Dashboard Operacional em Tempo Real.</div>
      </div>
    </AppLayoutWrapper>
  );
}
