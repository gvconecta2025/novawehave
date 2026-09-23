import { create } from 'zustand';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { autenticacao, bancoDeDados } from '@/lib/firebase/config';
import { UsuarioApp, PerfilRBAC } from '@/types/auth';

// Expansão do tipo localmente para suportar a Trava da Folguista (Lei 3)
interface UsuarioAppExpandido extends UsuarioApp {
  acesso_liberado?: boolean;
}

interface AuthState {
  usuarioAuth: User | null;
  usuarioDb: UsuarioAppExpandido | null;
  perfilRbac: PerfilRBAC | null;
  carregando: boolean;
  erroAcesso: string | null;
  configurarAutenticacao: () => void;
  fazerLogout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  usuarioAuth: null,
  usuarioDb: null,
  perfilRbac: null,
  carregando: true,
  erroAcesso: null,

  configurarAutenticacao: () => {
    const desinscreverAuth = onAuthStateChanged(autenticacao, (user) => {
      if (user) {
        try {
          const docRef = doc(bancoDeDados, 'usuarios', user.uid);
          
          // onSnapshot em vez de getDoc para derrubar a sessão em TEMPO REAL se o admin revogar
          onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const dados = docSnap.data() as UsuarioAppExpandido;
              
              // BARREIRA CONDICIONAL (Folguista)
              if (dados.perfil_rbac === 'Folguista' && dados.acesso_liberado !== true) {
                get().fazerLogout();
                const msgErro = 'Acesso bloqueado: Seu turno não está ativo no momento. Contate o Supervisor.';
                set({ 
                  usuarioAuth: null, 
                  usuarioDb: null, 
                  perfilRbac: null, 
                  carregando: false,
                  erroAcesso: msgErro
                });
                alert(`⚠️ ${msgErro}`);
                return;
              }

              set({
                usuarioAuth: user,
                usuarioDb: dados,
                perfilRbac: dados.perfil_rbac,
                carregando: false,
                erroAcesso: null
              });
            } else {
              get().fazerLogout();
            }
          });
        } catch (error) {
          console.error("[ERRO AUTH ZUSTAND]", error);
          set({ carregando: false, erroAcesso: 'Falha ao validar os privilégios do usuário no banco.' });
        }
      } else {
        set({ usuarioAuth: null, usuarioDb: null, perfilRbac: null, carregando: false });
      }
    });

    return desinscreverAuth;
  },

  fazerLogout: async () => {
    set({ carregando: true });
    await signOut(autenticacao);
    set({ usuarioAuth: null, usuarioDb: null, perfilRbac: null, carregando: false, erroAcesso: null });
  }
}));
