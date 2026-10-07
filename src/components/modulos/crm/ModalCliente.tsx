'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

export interface ClienteCRM {
  id?: string;
  nome: string;
  whatsapp: string;
  cpf_rg: string;
  email: string;
  data_nascimento: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  aceita_marketing: boolean;
  observacoes_internas: string;
  tags: string[];
  auditoria?: any;
}

interface ModalClienteProps {
  aberto: boolean;
  clienteEmEdicao?: ClienteCRM | null;
  aoFechar: () => void;
}

export default function ModalCliente({ 
  aberto, 
  clienteEmEdicao, 
  aoFechar 
}: ModalClienteProps) {
  
  const { 
    usuarioDb, 
    usuarioAuth 
  } = useAuthStore();

  // Estados Base
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpfRg, setCpfRg] = useState('');
  const [email, setEmail] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');

  // Estados de Endereço
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');

  // Estados de Preferências e CRM
  const [aceitaMarketing, setAceitaMarketing] = useState(true);
  const [observacoes, setObservacoes] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Estados de Controle de UI
  const [carregando, setCarregando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      if (clienteEmEdicao) {
        setNome(clienteEmEdicao.nome || '');
        setWhatsapp(clienteEmEdicao.whatsapp || '');
        setCpfRg(clienteEmEdicao.cpf_rg || '');
        setEmail(clienteEmEdicao.email || '');
        setDataNascimento(clienteEmEdicao.data_nascimento || '');
        
        setCep(clienteEmEdicao.cep || '');
        setLogradouro(clienteEmEdicao.logradouro || '');
        setNumero(clienteEmEdicao.numero || '');
        setComplemento(clienteEmEdicao.complemento || '');
        setBairro(clienteEmEdicao.bairro || '');
        setCidade(clienteEmEdicao.cidade || '');
        setUf(clienteEmEdicao.uf || '');
        
        setAceitaMarketing(clienteEmEdicao.aceita_marketing !== false);
        setObservacoes(clienteEmEdicao.observacoes_internas || '');
        setTagsInput((clienteEmEdicao.tags || []).join(', '));
      } else {
        limparFormulario();
      }
      setErro(null);
    }
  }, [aberto, clienteEmEdicao]);

  if (!aberto) return null;

  const limparFormulario = () => {
    setNome('');
    setWhatsapp('');
    setCpfRg('');
    setEmail('');
    setDataNascimento('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setUf('');
    setAceitaMarketing(true);
    setObservacoes('');
    setTagsInput('');
  };

  const lidarComMudancaCep = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setCep(valor);

    const cepLimpo = valor.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      setErro(null);
      
      try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const dados = await resposta.json();
        
        if (dados.erro) {
          setErro('CEP não encontrado na base do ViaCEP.');
        } else {
          setLogradouro(dados.logradouro || '');
          setBairro(dados.bairro || '');
          setCidade(dados.localidade || '');
          setUf(dados.uf || '');
          // O foco vai naturalmente para o número após o autopreenchimento
        }
      } catch (err: any) {
        console.error('[ERRO VIACEP]', err);
        setErro('Falha de comunicação com o serviço de CEP.');
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const lidarComEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      setErro('O Nome do cliente é o único campo obrigatório.');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const arrayTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const payloadBase = {
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
        cpf_rg: cpfRg.trim(),
        email: email.trim(),
        data_nascimento: dataNascimento.trim(),
        cep: cep.trim(),
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        complemento: complemento.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: uf.trim().toUpperCase(),
        aceita_marketing: aceitaMarketing,
        observacoes_internas: observacoes.trim(),
        tags: arrayTags,
      };

      if (clienteEmEdicao && clienteEmEdicao.id) {
        // Atualizar Cliente Existente
        const docRef = doc(bancoDeDados, 'clientes', clienteEmEdicao.id);
        await updateDoc(docRef, {
          ...payloadBase,
          'auditoria.atualizado_por_id': usuarioAuth?.uid,
          'auditoria.atualizado_por_nome': usuarioDb?.nome_completo,
          'auditoria.atualizado_em': serverTimestamp(),
        });
      } else {
        // Criar Novo Cliente
        await addDoc(collection(bancoDeDados, 'clientes'), {
          ...payloadBase,
          auditoria: {
            criado_por_id: usuarioAuth?.uid || 'desconhecido',
            criado_por_nome: usuarioDb?.nome_completo || 'Operador',
            criado_em: serverTimestamp(),
            atualizado_em: serverTimestamp(),
          }
        });
      }

      aoFechar();

    } catch (err: any) {
      console.error('[ERRO SALVAR CLIENTE]', err);
      setErro(`Falha ao registrar cliente: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity"
    >
      <div 
        className="w-full max-w-4xl rounded-xl bg-white shadow-2xl overflow-hidden border border-indigo-500 flex flex-col max-h-[90vh] animate-fade-in"
      >
        
        {/* Cabeçalho */}
        <div 
          className="bg-indigo-600 px-6 py-4 flex items-center justify-between shrink-0"
        >
          <h2 
            className="text-xl font-bold text-white flex items-center gap-2"
          >
            <span 
              className="text-2xl"
            >
              👥
            </span> 
            {clienteEmEdicao ? 'Editar Cliente' : 'Novo Cliente (Cadastro Progressivo)'}
          </h2>
          <button 
            onClick={aoFechar} 
            className="text-indigo-200 hover:text-white transition text-3xl leading-none"
            title="Fechar Modal"
          >
            &times;
          </button>
        </div>

        {/* Regra Anti-Silêncio */}
        {erro && (
          <div 
            className="bg-red-50 p-4 border-b border-red-200 text-sm font-semibold text-red-700 shrink-0 break-words"
          >
            ⚠️ <strong>Atenção:</strong> {erro}
          </div>
        )}

        {/* Formulário (Corpo com Scroll) */}
        <form 
          onSubmit={lidarComEnvio} 
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div 
            className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8"
          >
            
            {/* Bloco 1: Dados Base (Progressivos) */}
            <div>
              <h3 
                className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2 flex items-center gap-2"
              >
                1. Informações Básicas
                <span 
                  className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider"
                >
                  Apenas Nome é obrigatório
                </span>
              </h3>
              
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <div 
                  className="md:col-span-2 lg:col-span-1"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Nome Completo *
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    placeholder="Ex: João da Silva"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  />
                </div>
                
                <div>
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    WhatsApp (Opcional)
                  </label>
                  <input 
                    type="tel" 
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(e.target.value)} 
                    placeholder="Ex: 5533999999999"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono" 
                  />
                </div>
                
                <div>
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    CPF ou RG (Opcional)
                  </label>
                  <input 
                    type="text" 
                    value={cpfRg} 
                    onChange={(e) => setCpfRg(e.target.value)} 
                    placeholder="Documento de Identificação"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono" 
                  />
                </div>
                
                <div>
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    E-mail (Opcional)
                  </label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="cliente@email.com"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  />
                </div>
                
                <div>
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Data de Nascimento (Opcional)
                  </label>
                  <input 
                    type="date" 
                    value={dataNascimento} 
                    onChange={(e) => setDataNascimento(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition text-gray-600" 
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Endereço Inteligente (ViaCEP) */}
            <div>
              <h3 
                className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2"
              >
                2. Endereço & Logística
              </h3>
              
              <div 
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
              >
                <div 
                  className="md:col-span-1"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    CEP (Autopreenchimento)
                  </label>
                  <div 
                    className="relative"
                  >
                    <input 
                      type="text" 
                      value={cep} 
                      onChange={lidarComMudancaCep} 
                      placeholder="Somente números..."
                      maxLength={9}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono" 
                    />
                    {buscandoCep && (
                      <div 
                        className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
                      >
                      </div>
                    )}
                  </div>
                </div>
                
                <div 
                  className="md:col-span-2"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Logradouro / Rua
                  </label>
                  <input 
                    type="text" 
                    value={logradouro} 
                    onChange={(e) => setLogradouro(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50" 
                  />
                </div>
                
                <div 
                  className="md:col-span-1"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Número
                  </label>
                  <input 
                    type="text" 
                    value={numero} 
                    onChange={(e) => setNumero(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  />
                </div>

                <div 
                  className="md:col-span-1"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Complemento
                  </label>
                  <input 
                    type="text" 
                    value={complemento} 
                    onChange={(e) => setComplemento(e.target.value)} 
                    placeholder="Apto, Sala..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                  />
                </div>
                
                <div 
                  className="md:col-span-1"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Bairro
                  </label>
                  <input 
                    type="text" 
                    value={bairro} 
                    onChange={(e) => setBairro(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50" 
                  />
                </div>
                
                <div 
                  className="md:col-span-1"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Cidade
                  </label>
                  <input 
                    type="text" 
                    value={cidade} 
                    onChange={(e) => setCidade(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50" 
                  />
                </div>
                
                <div 
                  className="md:col-span-1"
                >
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    UF
                  </label>
                  <input 
                    type="text" 
                    value={uf} 
                    onChange={(e) => setUf(e.target.value.toUpperCase())} 
                    maxLength={2}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-gray-50 font-bold uppercase" 
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Inteligência e CRM */}
            <div>
              <h3 
                className="text-lg font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2"
              >
                3. Perfil Comercial (CRM)
              </h3>
              
              <div 
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div 
                  className="space-y-4"
                >
                  <div>
                    <label 
                      className="block text-xs font-bold text-gray-700 mb-1"
                    >
                      Tags de Segmentação (Separadas por vírgula)
                    </label>
                    <input 
                      type="text" 
                      value={tagsInput} 
                      onChange={(e) => setTagsInput(e.target.value)} 
                      placeholder="Ex: VIP, Balcão, Revendedor..."
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                    />
                    <p 
                      className="text-[10px] text-gray-400 mt-1"
                    >
                      Use tags para filtrar relatórios de campanhas futuras.
                    </p>
                  </div>

                  <div 
                    className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg"
                  >
                    <label 
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <input 
                        type="checkbox" 
                        checked={aceitaMarketing} 
                        onChange={(e) => setAceitaMarketing(e.target.checked)} 
                        className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" 
                      />
                      <span 
                        className="text-xs text-indigo-900 font-semibold leading-snug"
                      >
                        O cliente concorda em receber ofertas, avisos de garantia e atualizações promocionais via WhatsApp / E-mail (LGPD).
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label 
                    className="block text-xs font-bold text-gray-700 mb-1"
                  >
                    Observações Internas (Invisível para o cliente)
                  </label>
                  <textarea 
                    value={observacoes} 
                    onChange={(e) => setObservacoes(e.target.value)} 
                    rows={5}
                    placeholder="Preferências, histórico de comportamento, restrições financeiras..."
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition custom-scrollbar resize-none bg-yellow-50" 
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Rodapé e Ações */}
          <div 
            className="border-t border-gray-100 bg-gray-50 p-6 shrink-0 flex justify-end gap-3"
          >
            <button 
              type="button" 
              onClick={aoFechar} 
              disabled={carregando}
              className="px-6 py-2.5 rounded-xl font-bold text-gray-600 border border-gray-300 hover:bg-gray-100 transition active:scale-95 bg-white"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={carregando}
              className="px-8 py-2.5 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {carregando ? (
                <>
                  <div 
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  >
                  </div>
                  A Gravar...
                </>
              ) : (
                'Salvar Cliente'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
