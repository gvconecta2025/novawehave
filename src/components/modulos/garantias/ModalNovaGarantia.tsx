'use client';

import { useState } from 'react';
import { 
  addDoc, 
  collection, 
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

interface ModalNovaGarantiaProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function ModalNovaGarantia({ aberto, aoFechar }: ModalNovaGarantiaProps) {
  const { 
    usuarioDb, 
    usuarioAuth 
  } = useAuthStore();
  
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [produtoDefeituoso, setProdutoDefeituoso] = useState('');
  const [motivo, setMotivo] = useState('');
  const [termoAceite, setTermoAceite] = useState(false);
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return null;
  }

  const limparFormulario = () => {
    setNomeCliente('');
    setTelefone('');
    setProdutoDefeituoso('');
    setMotivo('');
    setTermoAceite(false);
  };

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!termoAceite) {
      setErro('O aceite da política de prazos e análise técnica (LGPD) é obrigatório.');
      return;
    }

    setCarregando(true);

    try {
      const payloadGarantia = {
        fluxo_operacional: 'Garantia/Troca',
        status_atual: 'Em Análise (Fila)',
        cor_hexadecimal: '#EF4444', 
        dados_garantia: {
          cliente_nome: nomeCliente.trim(),
          telefone: telefone.trim(),
          produto_defeito: produtoDefeituoso.trim(),
          motivo_troca: motivo.trim(),
          termo_aceite: termoAceite,
        },
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Operador Oculto',
          criado_em: serverTimestamp(),
        }
      };

      await addDoc(collection(bancoDeDados, 'comandas'), payloadGarantia);
      
      limparFormulario();
      aoFechar();
      
      alert('🛡️ Registro de Garantia criado com sucesso. O produto já está na fila de análise!');
      
    } catch (err: any) {
      console.error('[ERRO CRIAR GARANTIA]', err);
      setErro(`Falha ao registar a garantia no sistema: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity"
    >
      <div 
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden border border-red-500 flex flex-col max-h-[90vh]"
      >
        
        {/* Cabeçalho */}
        <div 
          className="bg-red-600 px-6 py-4 flex justify-between items-center shrink-0"
        >
          <h2 
            className="text-xl font-bold text-white flex items-center gap-2"
          >
            <span>
              🛡️
            </span> 
            Registrar Nova Garantia / RMA
          </h2>
          <button 
            onClick={aoFechar} 
            className="text-red-200 hover:text-white transition text-3xl leading-none"
            title="Fechar Formulário"
          >
            &times;
          </button>
        </div>

        {/* Regra Anti-Silêncio */}
        {erro && (
          <div 
            className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700 shrink-0 break-words"
          >
            ⚠️ <strong>Diagnóstico:</strong> {erro}
          </div>
        )}

        {/* Corpo do Formulário */}
        <form 
          onSubmit={lidarComEnvio} 
          className="p-6 overflow-y-auto flex-1 custom-scrollbar"
        >
          
          <div 
            className="space-y-4"
          >
            
            {/* Bloco: Dados do Cliente */}
            <div 
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label 
                  className="block text-sm font-bold text-gray-700 mb-1"
                >
                  Nome do Cliente *
                </label>
                <input 
                  required 
                  type="text" 
                  value={nomeCliente} 
                  onChange={(e) => setNomeCliente(e.target.value)} 
                  placeholder="Nome completo..."
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none transition text-sm" 
                />
              </div>

              <div>
                <label 
                  className="block text-sm font-bold text-gray-700 mb-1"
                >
                  WhatsApp de Contato *
                </label>
                <input 
                  required 
                  type="tel" 
                  value={telefone} 
                  onChange={(e) => setTelefone(e.target.value)} 
                  placeholder="Ex: 5533999999999"
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none transition text-sm font-mono" 
                />
              </div>
            </div>

            {/* Bloco: Dados do Produto e Defeito */}
            <div>
              <label 
                className="block text-sm font-bold text-gray-700 mb-1 mt-2"
              >
                Produto/Modelo Defeituoso *
              </label>
              <input 
                required 
                type="text" 
                value={produtoDefeituoso} 
                onChange={(e) => setProdutoDefeituoso(e.target.value)} 
                placeholder="Qual é o produto que apresentou falha?"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none transition text-sm" 
              />
            </div>

            <div>
              <label 
                className="block text-sm font-bold text-gray-700 mb-1 mt-2"
              >
                Motivo do Acionamento (Relato do Cliente) *
              </label>
              <textarea 
                required 
                rows={4}
                value={motivo} 
                onChange={(e) => setMotivo(e.target.value)} 
                placeholder="Descreva detalhadamente o defeito relatado..."
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none transition text-sm resize-none custom-scrollbar" 
              />
            </div>

            {/* Bloco: Conformidade e LGPD */}
            <div 
              className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded-xl"
            >
              <label 
                className="flex items-start gap-3 cursor-pointer"
              >
                <input 
                  type="checkbox" 
                  checked={termoAceite} 
                  onChange={(e) => setTermoAceite(e.target.checked)} 
                  className="mt-1 h-4 w-4 rounded text-red-600 focus:ring-red-500 border-gray-300" 
                />
                <span 
                  className="text-xs text-gray-600 leading-relaxed font-medium"
                >
                  Confirmo que o cliente está ciente da política de garantia, dos prazos legais para análise técnica e que consinto com a recolha destes dados para contacto e rastreio, em estrita conformidade com a <strong>LGPD</strong>.
                </span>
              </label>
            </div>
            
          </div>

          {/* Rodapé Fixo do Formulário */}
          <div 
            className="sticky bottom-0 bg-white pt-6 border-t border-gray-100 mt-6 flex justify-end gap-3 shrink-0"
          >
            <button 
              type="button" 
              onClick={aoFechar} 
              disabled={carregando} 
              className="px-6 py-2.5 rounded-xl font-bold text-gray-600 border border-gray-300 hover:bg-gray-50 transition active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={carregando || !termoAceite} 
              className="px-8 py-2.5 rounded-xl font-black text-white bg-red-600 hover:bg-red-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
            >
              {carregando ? 'A Processar...' : 'Registrar RMA'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
