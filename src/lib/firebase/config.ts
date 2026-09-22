import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore 
} from "firebase/firestore";

// Mapeamento das variáveis
const configuracaoFirebase = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// VALIDAÇÃO ESTRITA (Proteção contra Client-Side Exception na Vercel)
const chavesAusentes = Object.entries(configuracaoFirebase)
  .filter(([_, valor]) => !valor)
  .map(([chave]) => chave);

if (chavesAusentes.length > 0) {
  const mensagemErro = `Vercel Env Vars em falta: ${chavesAusentes.join(', ')}. Insira-as no painel da Vercel e faça um Redeploy.`;
  console.error('[ERRO FATAL]', mensagemErro);
  // Lança o erro propositadamente para o Error Boundary capturar em vez de quebrar silenciosamente
  throw new Error(mensagemErro);
}

let aplicativo: FirebaseApp;
let autenticacao: Auth;
let bancoDeDados: Firestore;

try {
  if (!getApps().length) {
    aplicativo = initializeApp(configuracaoFirebase as Record<string, string>);
  } else {
    aplicativo = getApp();
  }

  autenticacao = getAuth(aplicativo);

  bancoDeDados = initializeFirestore(aplicativo, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });

  if (process.env.NODE_ENV === "development") {
    console.log("[Firebase] Instâncias montadas. Persistência Offline ativada.");
  }

} catch (erro) {
  console.error("[ERRO CRÍTICO] Falha na inicialização do Firebase:", erro);
  const mensagemErro = erro instanceof Error ? erro.message : String(erro);
  throw new Error(`Falha no ecossistema Firebase. Detalhe técnico: ${mensagemErro}`);
}

export { aplicativo, autenticacao, bancoDeDados };
