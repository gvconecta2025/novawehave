'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

interface ModalNovaOSProps {
  aberto: boolean;
  aoFechar: () => void;
}

export default function ModalNovaOS({ aberto, aoFechar }: ModalNovaOSProps) {
  const { usuarioDb, usuarioAuth } = useAuthStore();
  
  const [clienteNome, setClienteNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [modelo, setModelo] = useState('');
  const [defeito, setDefeito] = useState('');
  const [senhaAparelho, setSenhaAparelho] = useState('');
  const [aceitouLgpd, setAceitouLgpd] = useState(false); // Lei 3: Consentimento LGPD
  
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    // Validação estrita da Checkbox LGPD (Obrigatória)
    if (!aceitouLgpd) {
      setErro('Atenção: É obrigatório o consentimento da Política de Privacidade (LGPD) pelo cliente.');
      return;
    }

    setCarregando(true);

    try {
      const payloadOS = {
        fluxo_operacional: 'Assistência Técnica',
        cor_hexadecimal: '#8B5CF6', // Roxo (We Have Resolve)
        status_atual: 'Entrada/Check-list',
        valor_total: 0, // Inicia zerado, atualizado no orçamento
        dados_os: {
          cliente_nome: clienteNome,
          telefone: telefone,
          modelo_aparelho: modelo,
          relato_defeito: defeito,
          senha_aparelho: senhaAparelho || null, // Guardado, mas ofuscado na UI do Balcão
          tecnico_id: null, // Será assumido por um técnico na Visão em Túnel
        },
        lgpd: {
          consentimento_fornecido: aceitouLgpd,
          data_aceite: serverTimestamp(),
        },
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Usuário Não Identificado',
          criado_em: serverTimestamp(),
          deletado_em: null
        }
      };

      await addDoc(collection(bancoDeDados, 'comandas'), payloadOS);
      
      setClienteNome('');
      setTelefone('');
      setModelo('');
      setDefeito('');
      setSenhaAparelho('');
      setAceitouLgpd(false);
      aoFechar();
      
      alert('🔧 Ordem de Serviço registrada com sucesso! Imprima a via do cliente.');
    } catch (erroFirebase) {
      console.error('[ERRO GRAVAÇÃO OS]', erroFirebase);
      setErro('Falha ao registrar a Ordem de Serviço. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden border border-purple-500">
        
        <div className="bg-purple-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🔧</span> Nova Ordem de Serviço
          </h2>
          <button onClick={aoFechar} className="text-purple-200 hover:text-white transition text-2xl leading-none">
            &times;
          </button>
        </div>

        {erro && (
          <div className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700">
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={lidarComEnvio} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Cliente *</label>
              <input required type="text" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ex: João Silva" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp (Para Notificações) *</label>
              <input required type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="(33) 99999-9999" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Modelo do Aparelho *</label>
            <input required type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ex: iPhone 13 Pro Max" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Defeito Relatado pelo Cliente *</label>
            <textarea required value={defeito} onChange={(e) => setDefeito(e.target.value)} rows={3} className="w-full border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="O ecrã não liga, bateria viciada..." />
          </div>

          {/* Área Restrita LGPD e Segurança Visual */}
          <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg mt-2">
            <h3 className="text-sm font-bold text-purple-900 mb-3 border-b border-purple-100 pb-2">Proteção de Dados do Cliente</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Senha de Desbloqueio (Opcional)</label>
              <input 
                type="password" // Proteção contra "Shoulder Surfing" no balcão
                value={senhaAparelho} 
                onChange={(e) => setSenhaAparelho(e.target.value)} 
                className="w-full md:w-1/2 border border-gray-300 rounded p-2.5 focus:ring-2 focus:ring-purple-500 outline-none" 
                placeholder="••••••••" 
                title="A senha será mascarada no ecrã."
              />
            </div>
            
            <div className="flex items-start gap-3">
              <input 
                type="checkbox" 
                id="lgpd" 
                required // Exigência HTML5
                checked={aceitouLgpd} 
                onChange={(e) => setAceitouLgpd(e.target.checked)} 
                className="mt-1 w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer" 
              />
              <label htmlFor="lgpd" className="text-sm text-gray-700 cursor-pointer select-none">
                <strong>Obrigatório:</strong> O cliente autoriza expressamente o acesso ao aparelho para fins exclusivos de testes e concorda com a <a href="#" className="text-purple-600 underline">Política de Privacidade (LGPD)</a>.
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <button type="button" onClick={aoFechar} disabled={carregando} className="px-5 py-2.5 rounded font-semibold text-gray-600 hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={carregando || !aceitouLgpd} 
              className="px-6 py-2.5 rounded font-bold text-white bg-purple-600 hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {carregando ? 'Registando...' : 'Criar Ordem de Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
