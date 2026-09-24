'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';
import { comprimirImagemWebP } from '@/lib/utils/image';
import MenuLateral from '@/components/modulos/pdv/MenuLateral';
import Link from 'next/link';

export default function WorkspaceConfiguracoes() {
  const { perfilRbac, usuarioDb, usuarioAuth, carregando: authCarregando } = useAuthStore();
  
  // Campos do Formulário CMS
  const [whatsappLoja, setWhatsappLoja] = useState('');
  const [bannersVitrineUrls, setBannersVitrineUrls] = useState<string[]>([]);
  const [descontoPix, setDescontoPix] = useState<number | string>('');
  
  // Estados de Controlo
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);
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
          setBannersVitrineUrls(dados.banners_vitrine_urls || []);
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

  // AÇÃO 3: Lógica de Upload e Compressão WebP para Banners da Loja
  const lidarComUploadBanners = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setFazendoUpload(true);
    setErro(null);

    const novosUrls: string[] = [];
    const files = Array.from(e.target.files);

    for (const file of files) {
      try {
        const ficheiroWebP = await comprimirImagemWebP(file);
        
        const formData = new FormData();
        formData.append('image', ficheiroWebP);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro desconhecido ao carregar imagem do banner.');
        
        novosUrls.push(data.url);
      } catch (err: any) {
        console.error('[FALHA UPLOAD WEBP BANNER]', err);
        setErro(`Falha ao comprimir/carregar o banner ${file.name}: ${err.message}`);
      }
    }

    setBannersVitrineUrls(prev => [...prev, ...novosUrls]);
    setFazendoUpload(false);
  };

  const removerBanner = (urlParaRemover: string) => {
    setBannersVitrineUrls(prev => prev.filter(url => url !== urlParaRemover));
  };

  const lidarComSalvamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setSalvando(true);

    try {
      const docRef = doc(bancoDeDados, 'configuracoes', 'geral');
      
      const payloadConfiguracoes = {
        whatsapp_loja: whatsappLoja.replace(/\D/g, ''),
        banners_vitrine_urls: bannersVitrineUrls,
        desconto_pix_percentual: Number(descontoPix) || 0,
        auditoria: {
          atualizado_por_id: usuarioAuth?.uid || 'desconhecido',
          atualizado_por_nome: usuarioDb?.nome_completo || 'Admin',
          atualizado_em: serverTimestamp(),
        }
      };

      await setDoc(docRef, payloadConfiguracoes, { merge: true });
      
      setSucesso('✅ Configurações globais e banners salvas com sucesso!');
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
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 p-8">
        <div className="flex max-w-md flex-col items-center text-center">
          <span className="mb-4 text-6xl">⛔</span>
          <h1 className="mb-2 text-2xl font-black">Acesso Restrito</h1>
          <Link href="/pdv" className="mt-4 rounded bg-blue-600 px-6 py-2.5 font-bold text-white">Voltar ao PDV</Link>
        </div>
      </div>
    );
  }

  return (
    // AÇÃO 1: Wrapper Flex Global do App Shell
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <MenuLateral />
      
      <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8 transition-all duration-300 relative">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Configurações Globais</h1>
            <p className="text-gray-500 mt-1">Gestão de variáveis do sistema, integrações e CMS da Loja Pública.</p>
          </div>
        </header>

        {erro && <div className="mb-4 shrink-0 rounded border-l-4 border-red-500 bg-red-50 p-4 font-semibold text-red-800 shadow-sm">{erro}</div>}
        {sucesso && <div className="mb-4 shrink-0 rounded border-l-4 border-green-500 bg-green-50 p-4 font-semibold text-green-800 shadow-sm">{sucesso}</div>}

        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col custom-scrollbar">
          {carregando ? (
            <div className="flex h-full items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>
          ) : (
            <form onSubmit={lidarComSalvamento} className="flex-1 flex flex-col">
              <div className="p-8 space-y-10 flex-1">
                
                <section className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="text-2xl">📱</span> Omnichannel (O2O) & Contactos
                  </h2>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 md:w-1/2">
                    <label className="mb-2 block text-sm font-bold text-gray-700">WhatsApp de Vendas (DDI + DDD + Número)</label>
                    <input required type="text" value={whatsappLoja} onChange={(e) => setWhatsappLoja(e.target.value)} placeholder="Ex: 5533999999999" className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-blue-100 font-mono" />
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="text-2xl">🖼️</span> Banners da Loja Pública (Carrossel)
                  </h2>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Imagens do Carrossel (Formato Panorâmico 3:1)</label>
                    <input type="file" accept="image/*" multiple onChange={lidarComUploadBanners} disabled={fazendoUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer" />
                    
                    {fazendoUpload && <p className="text-sm font-bold text-blue-600 mt-3 animate-pulse">A comprimir e enviar banners...</p>}
                    
                    {bannersVitrineUrls.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bannersVitrineUrls.map((url, idx) => (
                          <div key={idx} className="relative aspect-[3/1] rounded-xl border border-gray-300 overflow-hidden group bg-gray-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Banner ${idx}`} className="h-full w-full object-cover" />
                            <button type="button" onClick={() => removerBanner(url)} className="absolute inset-0 bg-black/70 text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm backdrop-blur-sm">Remover Banner</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="text-2xl">💰</span> Regras de Negócio & Checkout
                  </h2>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 md:w-1/2">
                    <label className="mb-2 block text-sm font-bold text-gray-700">Desconto PIX (%) na Loja Pública</label>
                    <div className="relative">
                      <input required type="number" step="0.1" min="0" max="100" value={descontoPix} onChange={(e) => setDescontoPix(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 pr-10 font-black text-green-700 outline-none transition focus:ring-2 focus:ring-green-100" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">%</span>
                    </div>
                  </div>
                </section>
                
              </div>

              <div className="sticky bottom-0 bg-white p-6 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] border-t border-gray-200 shrink-0 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Editado por: <strong className="uppercase">{usuarioDb?.nome_completo || 'Sistema'}</strong></span>
                <button type="submit" disabled={salvando || fazendoUpload} className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-black text-white transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-70 shadow-lg">
                  {salvando ? 'A SALVAR...' : '💾 SALVAR CONFIGURAÇÕES'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
