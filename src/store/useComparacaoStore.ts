import { create } from 'zustand';

export interface ItemComparacao {
  id: string;
  nome: string;
  preco: number;
  imagem?: string;
  especificacoes_tecnicas?: {
    marca?: string;
    material?: string;
    cor?: string;
  };
}

interface ComparacaoState {
  itens: ItemComparacao[];
  adicionar: (item: ItemComparacao) => void;
  remover: (id: string) => void;
  limpar: () => void;
}

export const useComparacaoStore = create<ComparacaoState>((set, get) => ({
  itens: [],
  
  adicionar: (item) => {
    const { itens } = get();
    
    // Evita duplicados
    if (itens.find(i => i.id === item.id)) {
      return;
    }
    
    // Regra de Negócio: Limite de 3 produtos para não quebrar UI no Mobile
    if (itens.length >= 3) {
      alert('⚠️ Pode comparar no máximo 3 produtos simultaneamente.');
      return;
    }
    
    set({ itens: [...itens, item] });
  },
  
  remover: (id) => set((state) => ({ 
    itens: state.itens.filter(i => i.id !== id) 
  })),
  
  limpar: () => set({ itens: [] }),
}));
