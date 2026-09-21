import { create } from 'zustand';

export interface ProdutoComanda {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface ComandaState {
  itens: ProdutoComanda[];
  valorTotal: number;
  adicionarItem: (produto: Omit<ProdutoComanda, 'quantidade'>) => void;
  removerItem: (idProduto: string) => void;
  limparComanda: () => void;
}

export const useComandaStore = create<ComandaState>((set) => ({
  itens: [],
  valorTotal: 0,

  adicionarItem: (produto) => set((state) => {
    const itemExistente = state.itens.find((item) => item.id === produto.id);
    let novosItens;

    if (itemExistente) {
      novosItens = state.itens.map((item) =>
        item.id === produto.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      );
    } else {
      novosItens = [...state.itens, { ...produto, quantidade: 1 }];
    }

    const novoTotal = novosItens.reduce((total, item) => total + (item.preco * item.quantidade), 0);

    return { itens: novosItens, valorTotal: novoTotal };
  }),

  removerItem: (idProduto) => set((state) => {
    const itemExistente = state.itens.find((item) => item.id === idProduto);
    if (!itemExistente) return state;

    let novosItens;
    if (itemExistente.quantidade > 1) {
      novosItens = state.itens.map((item) =>
        item.id === idProduto
          ? { ...item, quantidade: item.quantidade - 1 }
          : item
      );
    } else {
      novosItens = state.itens.filter((item) => item.id !== idProduto);
    }

    const novoTotal = novosItens.reduce((total, item) => total + (item.preco * item.quantidade), 0);

    return { itens: novosItens, valorTotal: novoTotal };
  }),

  limparComanda: () => set({ itens: [], valorTotal: 0 }),
}));
