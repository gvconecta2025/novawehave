import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore 
} from "firebase/firestore";

// Definição das variáveis de ambiente padrão do Next.js
const configuracaoFirebase = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
};

// Declaração das instâncias tipadas
let aplicativo: FirebaseApp;
let autenticacao: Auth;
let bancoDeDados: Firestore;

try {
  // Inicialização Singleton: garante que o Firebase não recarregue múltiplas vezes no Next.js
  if (!getApps().length) {
    aplicativo = initializeApp(configuracaoFirebase);
  } else {
    aplicativo = getApp();
  }

  autenticacao = getAuth(aplicativo);

  // Inicializa o Firestore aplicando a Persistência Offline Nativa (Offline-First)
  // O cache múltiplo permite que o PDV opere em várias abas sem corromper o IndexedDB
  bancoDeDados = initializeFirestore(aplicativo, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });

  // Log exclusivo para ambiente de desenvolvimento (evita poluição no terminal de produção)
  if (process.env.NODE_ENV === "development") {
    console.log("[Firebase] Instâncias montadas. Persistência Offline (Offline-First) ativada.");
  }

} catch (erro) {
  // Política Anti-Silêncio: O erro DEVE estourar para ser capturado pelo Error Boundary visual do Next.js
  console.error("[ERRO CRÍTICO] Falha na inicialização do Firebase ou do cache offline:", erro);
  
  const mensagemErro = erro instanceof Error ? erro.message : String(erro);
  throw new Error(`Falha no ecossistema Firebase. Detalhe técnico: ${mensagemErro}`);
}

export { aplicativo, autenticacao, bancoDeDados };
