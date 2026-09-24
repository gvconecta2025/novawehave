'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import Link from 'next/link';

export default function WorkspaceConfiguracoes() {
  const { perfilRbac, usuarioDb, usuarioAuth, carregando: authCarregando } = useAuthStore();
  
  const [whatsappLoja, setWhatsappLoja] = useState('');
  const [bannerTexto, setBannerTexto] = useState('');
  const [descontoPix, setDescontoPix] = useState<number | string>('');
  
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const acessoPermitido = ['Master', 'Admin/Dev'].includes(perfilRbac || '');

  useEffect(() => {
    if (authCarregando || !acessoPermitido) {
      if (!authCarregando && !acessoPermitido) setCarregando(false);
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
          setDescontoPix(dados.desconto_pix_percentual || 0);
        }
      } catch (err: any) {
        console.error('[ERRO CARREGAMENTO CONFIGURACOES]', err);
        setErro(`Falha ao conectar com o banco de dados: ${err.message}`);
      } finally {
        setCarregando(false);
      }
    };

    carregarConfiguracoes();
  }, [acessoPermitido, authCarregando]);

  const lidarComSalvamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setSalvando(true);

    try {
      const docRef = doc(bancoDeDados, 'configuracoes', 'geral');
      
      const payloadConfiguracoes = {
        whatsapp_loja: whatsappLoja.replace(/\D/g, ''),
        banner_promocional_texto: bannerTexto.trim(),
        desconto_pix_percentual: Number(descontoPix) || 0,
        auditoria: {
          atualizado_por_id: usuarioAuth?.uid || 'desconhecido',
          atualizado_por_nome: usuarioDb?.nome_completo || 'Admin',
          atualizado_em: serverTimestamp(),
        }
      };

      await setDoc(docRef, payloadConfiguracoes, { merge: true });
      
      setSucesso('✅ Configurações globais salvas com sucesso! As alterações já estão ativas na Loja e PDV.');
      setTimeout(() => setSucesso(null), 5000);
    } catch (err: any) {
      console.error('[ERRO SALVAR CONFIGURACOES]', err);
      setErro(`Ocorreu um erro ao salvar as configurações: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  if (!carregando && !acessoPermitido) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-8 font-sans">
        <div className="flex max-w-md flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-2xl">
          <span className="mb-4 text-6xl">⛔</span>
          <h1 className="mb-2 text-2xl font-black text-gray-900">Acesso Restrito</h1>
          <p className="mb-6 text-sm text-gray-500">
            O seu perfil ({perfilRbac}) não tem privilégios executivos para aceder ao painel de configurações do sistema.
          </p>
          <Link href="/pdv" className="rounded bg-blue-600 px-6 py-2.5 font-bold text-white transition hover:bg-blue-700">
            Voltar ao PDV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <MenuLateral />
      {/* PADRONIZAÇÃO: pl-20 (mobile) e md:pl-24 */}
      <div className="flex h-screen w-full flex-col bg-gray-50 p-6 pl-20 md:p-8 md:pl-24 font-sans overflow-hidden transition-all">
        
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Configurações Globais</h1>
            <p className="text-gray-500 mt-1">Gestão de variáveis do sistema, integrações e CMS da Loja Pública.</p>
          </div>
        </header>

        {erro && (
          <div className="mb-6 w-full rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm break-words">
            ⚠️ {erro}
          </div>
        )}
        
        {sucesso && (
          <div className="mb-6 w-full rounded border-l-4 border-green-500 bg-green-50 p-4 font-semibold text-green-800 shadow-sm animate-pulse-short">
            {sucesso}
          </div>
        )}

        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col custom-scrollbar">
          {carregando ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-gray-400">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="font-medium text-sm">A carregar configurações do servidor...</p>
            </div>
          ) : (
            <form onSubmit={lidarComSalvamento} className="flex-1 flex flex-col relative">
              
              <div className="p-8 space-y-10">
                <section className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="text-2xl">📱</span> Omnichannel (O2O) & Contactos
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <label className="mb-2 block text-sm font-bold text-gray-700">WhatsApp de Vendas (DDI + DDD + Número)</label>
                      <input
                        required
                        type="text"
                        value={whatsappLoja}
                        onChange={(e) => setWhatsappLoja(e.target.value)}
                        placeholder="Ex: 5533999999999"
                        className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono text-gray-800"
                      />
                      <p className="mt-2 text-xs text-gray-500 font-medium">Este número receberá todas as mensagens de conversão geradas na Loja Pública e nos links de Assistência.</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="text-2xl">🖥️</span> Vitrine Pública (CMS)
                  </h2>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="mb-2 block text-sm font-bold text-gray-700">Texto do Banner Promocional (Home)</label>
                    <textarea
                      required
                      rows={3}
                      value={bannerTexto}
                      onChange={(e) => setBannerTexto(e.target.value)}
                      placeholder="Ex: Lançamentos Exclusivos - Tudo para proteger o seu aparelho."
                      className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800"
                    />
                    <p className="mt-2 text-xs text-gray-500 font-medium">Mensagem de destaque exibida no topo da vitrine principal para todos os clientes.</p>
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="text-2xl">💰</span> Regras de Negócio & Checkout
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <label className="mb-2 block text-sm font-bold text-gray-700">Desconto PIX (%) na Loja Pública</label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={descontoPix}
                          onChange={(e) => setDescontoPix(e.target.value)}
                          placeholder="Ex: 10"
                          className="w-full rounded-lg border border-gray-300 p-3 pr-10 font-black text-green-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">%</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 font-medium">Este desconto é calculado automaticamente e exibido como gatilho mental na vitrine e na Landing Page de cada produto.</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 mt-auto flex items-center justify-between border-t border-gray-200 bg-white p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <span className="text-xs text-gray-400 font-medium">
                  Última edição por: <strong className="text-gray-700 uppercase">{usuarioDb?.nome_completo || 'Sistema'}</strong>
                </span>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-black text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 shadow-lg hover:shadow-blue-600/30"
                >
                  {salvando ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      A SALVAR NO SERVIDOR...
                    </>
                  ) : (
                    <>
                      <span>💾</span> SALVAR CONFIGURAÇÕES GLOBAIS
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </>
  );
}
