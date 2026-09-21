import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import ComandaFixa from '@/components/modulos/pdv/ComandaFixa';

export const metadata = {
  title: 'PDV | We Have',
  description: 'Ponto de Venda e Gestão Operacional',
};

export default function PdvLayout({ children }: { children: React.ReactNode }) {
  return (
    // Body Absolute Rule: Desktop-first, 100vh, hidden overflow on body to prevent page jump
    <div className="flex h-screen w-screen overflow-hidden bg-gray-200 text-gray-900 font-sans">
      
      {/* COLUNA 1: Menu Dinâmico (Largura Fixa) */}
      <aside className="w-64 h-full flex-shrink-0 z-20">
        <MenuLateral />
      </aside>

      {/* COLUNA 2: Workspace Principal (Scroll Independente, Flex-1 para ocupar centro) */}
      <main className="flex-1 h-full overflow-y-auto p-6 relative z-10">
        {children}
      </main>

      {/* COLUNA 3: Comanda Fixa (Largura Fixa) */}
      <aside className="w-[400px] h-full flex-shrink-0 border-l border-gray-300 shadow-2xl z-20">
        <ComandaFixa />
      </aside>

    </div>
  );
}
