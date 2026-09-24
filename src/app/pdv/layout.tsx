import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import ComandaFixa from '@/components/modulos/pdv/ComandaFixa';

export default function PdvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
      
      {/* Injeção do App Shell Global */}
      <MenuLateral />
      
      {/* Container Principal: O pl-16 empurra o conteúdo para fora da zona da Sidebar Fina */}
      <div className="flex flex-1 pl-16 transition-all duration-300">
        
        {/* Workspace Central (Grid de Produtos) */}
        <main className="flex-1 overflow-hidden p-6 md:p-8 custom-scrollbar">
          {children}
        </main>
        
        {/* Coluna Direita (Comanda Fixa) - Oculta em telas muito pequenas */}
        <aside className="w-[350px] shrink-0 shadow-2xl z-10 hidden lg:block bg-white border-l border-gray-200">
          <ComandaFixa />
        </aside>
        
      </div>
    </div>
  );
}
