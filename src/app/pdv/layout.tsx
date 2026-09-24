import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import ComandaFixa from '@/components/modulos/pdv/ComandaFixa';

export default function PdvLayout({ children }: { children: React.ReactNode }) {
  return (
    // AÇÃO 1: Wrapper Global Flexível (O menu irá empurrar o 'flex-1')
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      
      <MenuLateral />
      
      <div className="flex flex-1 overflow-hidden transition-all duration-300">
        <main className="flex-1 overflow-hidden p-6 md:p-8 custom-scrollbar">
          {children}
        </main>
        
        <aside className="w-[350px] shrink-0 shadow-2xl z-10 hidden lg:block bg-white border-l border-gray-200">
          <ComandaFixa />
        </aside>
      </div>
    </div>
  );
}
