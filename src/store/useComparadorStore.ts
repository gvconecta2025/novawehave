import { create } from 'zustand';

export interface ProdutoComparacao {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
  saldo_estoque: number;
}

interface ComparadorState {
  produtos: ProdutoComparacao[];
  adicionarProduto: (produto: ProdutoComparacao) => void;
  removerProduto: (id: string) => void;
  limparComparacao: () => void;
}

export const useComparadorStore = create<ComparadorState>((set, get) => ({
  produtos: [],

  adicionarProduto: (produto) => {
    const { produtos } = get();
    
    if (produtos.find(p => p.id === produto.id)) {
      alert('Este produto já está no comparador.');
      return;
    }
    
    if (produtos.length >= 3) {
      alert('Você só pode comparar até 3 produtos simultaneamente.');
      return;
    }

    set({ produtos: [...produtos, produto] });
  },

  removerProduto: (id) => set((state) => ({
    produtos: state.produtos.filter(p => p.id !== id)
  })),

  limparComparacao: () => set({ produtos: [] }),
}));
