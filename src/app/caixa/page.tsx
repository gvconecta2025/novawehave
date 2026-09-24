'use client';

// ... (todas as imports e lógicas da página mantêm-se exatamente iguais)
import MenuLateral from '@/components/modulos/pdv/MenuLateral';

export default function PainelCaixa() {
  // ... lógica ...

  return (
    // AÇÃO 1: Wrapper Flex Global do App Shell
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <MenuLateral />
      
      <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8 transition-all duration-300 relative">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Painel Caixa & Financeiro</h1>
            <p className="text-gray-500 mt-1">Fila Operacional - Emissão de NFe, NFS-e e Notas de Devolução (Bling)</p>
          </div>
          {/* Botão Fechar Turno ... */}
        </header>

        <div className="flex-1 overflow-x-auto rounded-xl bg-white p-6 shadow-inner border border-gray-200 flex flex-col">
           {/* Fila de Comandas (scroll isolado aqui dentro) ... */}
           <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
             {/* ... Grid de Comandas ... */}
           </div>
        </div>
      </div>
    </div>
  );
}
