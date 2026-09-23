'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import Link from 'next/link';

export default function WorkspaceConfiguracoes() {
  const { perfilRbac, usuarioDb, usuarioAuth } = useAuthStore();
  
  const [whatsappLoja, setWhatsappLoja] = useState('');
  const [bannerTexto, setBannerTexto] = useState('');
  const [descontoPix, setDescontoPix] = useState<number | string>('');
  
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Barreira RBAC Estrita (Apenas Master e Admin/Dev)
  const acessoPermitido = perfilRbac === 'Master' || perfilRbac === 'Admin/Dev';

  useEffect(() => {
    if (!acessoPermitido) {
      setCarregando(false);
      return;
    }

    const carregarConfiguracoes = async () => {
      try {
        const docRef = doc(bancoDeDados, 'configuracoes', 'geral');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dados = docSnap.data();
          setWhatsappLoja(dados.whatsapp_loja || '');
          setBannerTexto(dados.banner_promocional_texto || '');
          setDescontoPix(dados.desconto_pix_percentual || '');
        }
      } catch (err) {
        console.error('[ERRO CARREGAMENTO CONFIGURACOES]', err);
        setErro('Falha ao conectar com o banco de dados. Verifique a rede.');
      } finally {
        setCarregando(false);
      }
    };

    carregarConfiguracoes();
  }, [acessoPermitido]);

  const lidarComSalvamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setSalvando(true);

    try {
      const docRef = doc(bancoDeDados, 'configuracoes', 'geral');
      
      const payloadConfiguracoes = {
        whatsapp_loja: whatsappLoja,
        banner_promocional_texto: bannerTexto,
        desconto_pix_percentual: Number(descontoPix) || 0,
        // Auditoria Estrita (Lei 3)
        auditoria: {
          atualizado_por_id: usuarioAuth?.uid || 'desconhecido',
          atualizado_por_nome: usuarioDb?.nome_completo || 'Admin',
          atualizado_em: serverTimestamp(),
        }
      };

      // Usa setDoc com merge para não sobrescrever acidentalmente outros campos que possam existir no futuro
      await setDoc(docRef, payloadConfiguracoes, { merge: true });
      
      setSucesso('✅ Configurações globais salvas com sucesso!');
      
      // Limpa a mensagem de sucesso após 3 segundos
      setTimeout(() => setSucesso(null), 3000);
    } catch (err) {
      console.error('[ERRO SALVAR CONFIGURACOES]', err);
      setErro('Ocorreu um erro ao salvar as configurações. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // UI de Acesso Negado
  if (!carregando && !acessoPermitido) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans">
        <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl">
          <span className="mb-4 text-6xl">⛔</span>
          <h1 className="mb-2 text-2xl font-black text-gray-900">Acesso Restrito</h1>
          <p className="mb-6 text-sm text-gray-500">
            O seu perfil ({perfilRbac}) não tem privilégios suficientes para acessar o painel de configurações do sistema.
          </p>
          <Link href="/pdv" className="rounded bg-blue-600 px-6 py-2.5 font-bold text-white transition hover:bg-blue-700">
            Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100 p-8 font-sans overflow-hidden">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Configurações Globais</h1>
          <p className="text-gray-500 mt-1">Gestão de variáveis do sistema, integrações e CMS.</p>
        </div>
      </header>

      {/* Regras Anti-Silêncio Locais */}
      {erro && (
        <div className="mb-6 w-full rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-700 shadow-sm">
          ⚠️ {erro}
        </div>
      )}
      
      {sucesso && (
        <div className="mb-6 w-full rounded border-l-4 border-green-500 bg-green-50 p-4 font-semibold text-green-700 shadow-sm transition-all">
          {sucesso}
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {carregando ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="font-medium text-gray-500">A carregar configurações...</p>
          </div>
        ) : (
          <form onSubmit={lidarComSalvamento} className="mx-auto max-w-3xl space-y-8">
            
            {/* Bloco 1: Comunicação e O2O */}
            <section className="space-y-4 border-b border-gray-100 pb-8">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">📱</span> Omnichannel (O2O)
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">WhatsApp da Loja (DDI + DDD + Número)</label>
                  <input
                    type="text"
                    value={whatsappLoja}
                    onChange={(e) => setWhatsappLoja(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 5533999999999"
                    className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-400">Usado nos botões de conversão da vitrine pública.</p>
                </div>
              </div>
            </section>

            {/* Bloco 2: CMS da Loja Pública */}
            <section className="space-y-4 border-b border-gray-100 pb-8">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">🖥️</span> Vitrine Pública (CMS)
              </h2>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Texto do Banner Principal</label>
                <input
                  type="text"
                  value={bannerTexto}
                  onChange={(e) => setBannerTexto(e.target.value)}
                  placeholder="Ex: Lançamentos Exclusivos - Tudo para proteger o seu aparelho."
                  className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </section>

            {/* Bloco 3: Regras de Negócio / Financeiro */}
            <section className="space-y-4 border-b border-gray-100 pb-8">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">💰</span> Regras de Negócio
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Desconto PIX (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={descontoPix}
                    onChange={(e) => setDescontoPix(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full rounded-lg border border-gray-300 p-3 font-bold text-green-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-400">Calculado automaticamente sobre os preços da loja.</p>
                </div>
              </div>
            </section>

            {/* Rodapé de Ações */}
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4 border border-gray-200">
              <span className="text-xs text-gray-500">
                Última edição por: <strong className="text-gray-700">{usuarioDb?.nome_completo}</strong>
              </span>
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-8 py-3 text-sm font-bold text-white transition hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-md"
              >
                {salvando ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    A SALVAR...
                  </>
                ) : (
                  'SALVAR CONFIGURAÇÕES'
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
