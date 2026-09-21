import { create } from 'zustand';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { autenticacao, bancoDeDados } from '@/lib/firebase/config';
import { UsuarioApp, PerfilRBAC } from '@/types/auth';

interface AuthState {
  usuarioAuth: User | null;
  usuarioDb: UsuarioApp | null;
  perfilRbac: PerfilRBAC | null;
  carregando: boolean;
  inicializarAuth: () => void;
  fazerLogout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuarioAuth: null,
  usuarioDb: null,
  perfilRbac: null,
  carregando: true,

  inicializarAuth: () => {
    // Escuta alterações de sessão no Firebase
    const desinscrever = onAuthStateChanged(autenticacao, async (usuarioFirebase) => {
      if (usuarioFirebase) {
        try {
          // Busca os dados adicionais (RBAC) no Firestore
          const refDoc = doc(bancoDeDados, 'usuarios', usuarioFirebase.uid);
          const snapDoc = await getDoc(refDoc);

          if (snapDoc.exists()) {
            const dados = snapDoc.data() as UsuarioApp;
            set({
              usuarioAuth: usuarioFirebase,
              usuarioDb: dados,
              perfilRbac: dados.perfil_rbac,
              carregando: false,
            });
          } else {
            console.error('[RBAC] Documento de usuário não encontrado no Firestore.');
            set({ usuarioAuth: usuarioFirebase, usuarioDb: null, perfilRbac: null, carregando: false });
          }
        } catch (erro) {
          console.error('[ERRO AUTH] Falha ao recuperar perfil RBAC:', erro);
          set({ carregando: false });
        }
      } else {
        // Usuário deslogado
        set({
          usuarioAuth: null,
          usuarioDb: null,
          perfilRbac: null,
          carregando: false,
        });
      }
    });

    // Função de limpeza do listener (embora o Zustand mantenha global)
    return desinscrever;
  },

  fazerLogout: async () => {
    try {
      await signOut(autenticacao);
      set({ usuarioAuth: null, usuarioDb: null, perfilRbac: null, carregando: false });
      window.location.href = '/login'; // Força o redirecionamento de segurança
    } catch (erro) {
      console.error('[ERRO LOGOUT] Falha ao encerrar sessão:', erro);
    }
  },
}));
