import { create } from 'zustand';

export interface ItemCarrinhoO2O {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  sku: string;
  imagem?: string;
}

interface CarrinhoO2OState {
  itens: ItemCarrinhoO2O[];
  adicionarItem: (item: Omit<ItemCarrinhoO2O, 'quantidade'>) => void;
  removerItem: (id: string) => void;
  alterarQuantidade: (idProduto: string, delta: number) => void;
  limparCarrinho: () => void;
}

export const useCarrinhoO2OStore = create<CarrinhoO2OState>((set) => ({
  itens: [],
  
  adicionarItem: (novoItem) => set((state) => {
    const existe = state.itens.find((i) => i.id === novoItem.id);
    
    if (existe) {
      return {
        itens: state.itens.map((i) =>
          i.id === novoItem.id 
            ? { ...i, quantidade: i.quantidade + 1 } 
            : i
        ),
      };
    }
    
    return { 
      itens: [...state.itens, { ...novoItem, quantidade: 1 }] 
    };
  }),
  
  removerItem: (id) => set((state) => ({
    itens: state.itens.filter((i) => i.id !== id),
  })),
  
  alterarQuantidade: (idProduto, delta) => set((state) => ({
    itens: state.itens.map((i) => {
      if (i.id === idProduto) {
        const novaQtd = i.quantidade + delta;
        return { 
          ...i, 
          quantidade: novaQtd > 0 ? novaQtd : 1 
        };
      }
      return i;
    }),
  })),
  
  limparCarrinho: () => set({ itens: [] }),
}));
