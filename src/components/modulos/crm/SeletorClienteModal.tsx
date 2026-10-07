'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { bancoDeDados } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/useAuthStore';

export interface ClienteSelecionado {
  id: string;
  nome: string;
  whatsapp: string;
  cpf_rg: string;
}

interface SeletorClienteModalProps {
  aberto: boolean;
  aoFechar: () => void;
  aoSelecionar: (cliente: ClienteSelecionado) => void;
}

export default function SeletorClienteModal({ 
  aberto, 
  aoFechar, 
  aoSelecionar 
}: SeletorClienteModalProps) {
  
  const { 
    usuarioDb, 
    usuarioAuth 
  } = useAuthStore();

  // Estados da Base
  const [clientes, setClientes] = useState<ClienteSelecionado[]>([]);
  const [carregandoBase, setCarregandoBase] = useState(true);
  
  // Estados de Busca e UI
  const [termoBusca, setTermoBusca] = useState('');
  const [modoExpress, setModoExpress] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  
  // Estados do Cadastro Express
  const [nomeNovo, setNomeNovo] = useState('');
  const [whatsappNovo, setWhatsappNovo] = useState('');
  const [salvandoExpress, setSalvandoExpress] = useState(false);

  // Escuta a coleção de clientes
  useEffect(() => {
    if (!aberto) return;

    const q = query(
      collection(bancoDeDados, 'clientes'), 
      orderBy('nome', 'asc')
    );

    const desinscrever = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((doc) => ({
          id: doc.id,
          nome: doc.data().nome || 'Sem Nome',
          whatsapp: doc.data().whatsapp || '',
          cpf_rg: doc.data().cpf_rg || ''
        })) as ClienteSelecionado[];
        
        setClientes(dados);
        setCarregandoBase(false);
      },
      (err: any) => {
        console.error('[ERRO SELETOR CLIENTES]', err);
        setErro('Falha ao carregar a base de clientes.');
        setCarregandoBase(false);
      }
    );

    return () => desinscrever();
  }, [aberto]);

  // Efeito de Limpeza ao fechar ou trocar de modo
  useEffect(() => {
    if (aberto) {
      setTermoBusca('');
      setNomeNovo('');
      setWhatsappNovo('');
      setErro(null);
    }
  }, [aberto, modoExpress]);

  if (!aberto) return null;

  const clientesFiltrados = clientes.filter(c => {
    const termo = termoBusca.toLowerCase();
    const nomeOk = c.nome.toLowerCase().includes(termo);
    const wppOk = c.whatsapp.includes(termo);
    const cpfOk = c.cpf_rg.includes(termo);
    return nomeOk || wppOk || cpfOk;
  });

  const lidarComCadastroExpress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeNovo.trim() || !whatsappNovo.trim()) {
      setErro('Nome e WhatsApp são obrigatórios para o cadastro rápido.');
      return;
    }

    setErro(null);
    setSalvandoExpress(true);

    try {
      const payloadExpress = {
        nome: nomeNovo.trim(),
        whatsapp: whatsappNovo.trim(),
        cpf_rg: '',
        email: '',
        data_nascimento: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        aceita_marketing: true,
        observacoes_internas: 'Cadastrado no balcão via Modo Express.',
        tags: ['Balcão Express'],
        auditoria: {
          criado_por_id: usuarioAuth?.uid || 'desconhecido',
          criado_por_nome: usuarioDb?.nome_completo || 'Operador Oculto',
          criado_em: serverTimestamp(),
          atualizado_em: serverTimestamp(),
        }
      };

      const docRef = await addDoc(collection(bancoDeDados, 'clientes'), payloadExpress);

      const novoCliente: ClienteSelecionado = {
        id: docRef.id,
        nome: payloadExpress.nome,
        whatsapp: payloadExpress.whatsapp,
        cpf_rg: ''
      };

      setSalvandoExpress(false);
      aoSelecionar(novoCliente);
      aoFechar();

    } catch (err: any) {
      console.error('[ERRO CADASTRO EXPRESS]', err);
      setErro(`Falha ao registrar cliente: ${err.message}`);
      setSalvandoExpress(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-sm transition-opacity"
    >
      <div 
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden border border-indigo-500 flex flex-col max-h-[85vh] animate-fade-in"
      >
        
        {/* CABEÇALHO */}
        <div 
          className="bg-indigo-600 px-5 py-4 flex items-center justify-between shrink-0"
        >
          <h2 
            className="text-lg font-bold text-white flex items-center gap-2"
          >
            <span>
              👥
            </span> 
            Vincular Cliente
          </h2>
          <button 
            onClick={aoFechar} 
            className="text-indigo-200 hover:text-white transition text-2xl leading-none"
            title="Fechar"
          >
            &times;
          </button>
        </div>

        {/* REGRA ANTI-SILÊNCIO */}
        {erro && (
          <div 
            className="bg-red-50 p-3 border-b border-red-200 text-xs font-semibold text-red-700 shrink-0"
          >
            ⚠️ {erro}
          </div>
        )}

        {/* SISTEMA DE ABAS (BUSCA VS NOVO) */}
        <div 
          className="flex border-b border-gray-200 bg-gray-50 shrink-0"
        >
          <button 
            onClick={() => setModoExpress(false)}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              !modoExpress 
                ? 'bg-white text-indigo-700 border-b-2 border-indigo-600' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            Buscar na Base
          </button>
          <button 
            onClick={() => setModoExpress(true)}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              modoExpress 
                ? 'bg-white text-emerald-700 border-b-2 border-emerald-600' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            + Novo Express
          </button>
        </div>

        {/* MODO: BUSCA DE CLIENTES */}
        {!modoExpress ? (
          <div 
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div 
              className="p-4 border-b border-gray-100 shrink-0"
            >
              <input 
                type="text" 
                placeholder="Pesquisar por nome, WhatsApp ou CPF..." 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white" 
              />
            </div>
            
            <div 
              className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50"
            >
              {carregandoBase ? (
                <div 
                  className="flex flex-col items-center justify-center py-10"
                >
                  <div 
                    className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-3"
                  >
                  </div>
                  <p 
                    className="text-xs font-bold text-gray-400"
                  >
                    A carregar CRM...
                  </p>
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div 
                  className="text-center py-10 text-gray-400 font-medium text-sm"
                >
                  Nenhum cliente localizado.
                </div>
              ) : (
                <div 
                  className="flex flex-col gap-2"
                >
                  {clientesFiltrados.map((cliente) => (
                    <button 
                      key={cliente.id}
                      onClick={() => {
                        aoSelecionar(cliente);
                        aoFechar();
                      }}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left group"
                    >
                      <div>
                        <h4 
                          className="text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors"
                        >
                          {cliente.nome}
                        </h4>
                        <div 
                          className="flex items-center gap-3 mt-1 text-[10px] font-mono text-gray-500"
                        >
                          {cliente.whatsapp && (
                            <span 
                              className="flex items-center gap-1"
                            >
                              📱 {cliente.whatsapp}
                            </span>
                          )}
                          {cliente.cpf_rg && (
                            <span 
                              className="flex items-center gap-1"
                            >
                              🪪 {cliente.cpf_rg}
                            </span>
                          )}
                        </div>
                      </div>
                      <span 
                        className="text-indigo-600 text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        VINCULAR
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODO: CADASTRO EXPRESS */
          <form 
            onSubmit={lidarComCadastroExpress} 
            className="flex flex-col flex-1"
          >
            <div 
              className="p-6 flex-1 flex flex-col gap-5 bg-white"
            >
              <div>
                <label 
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Nome Completo *
                </label>
                <input 
                  required 
                  type="text" 
                  value={nomeNovo} 
                  onChange={(e) => setNomeNovo(e.target.value)} 
                  placeholder="Ex: João Silva"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" 
                />
              </div>
              
              <div>
                <label 
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  WhatsApp de Contato *
                </label>
                <input 
                  required 
                  type="tel" 
                  value={whatsappNovo} 
                  onChange={(e) => setWhatsappNovo(e.target.value)} 
                  placeholder="Ex: 5533999999999"
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition font-mono" 
                />
              </div>

              <div 
                className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3"
              >
                <p 
                  className="text-[10px] text-emerald-800 font-medium"
                >
                  Ao salvar, o cliente será automaticamente vinculado ao carrinho de compras atual. Perfil completo poderá ser editado depois no Módulo CRM.
                </p>
              </div>
            </div>

            <div 
              className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0"
            >
              <button 
                type="submit" 
                disabled={salvandoExpress}
                className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-black text-white transition hover:bg-emerald-700 active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {salvandoExpress ? (
                  <>
                    <div 
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    >
                    </div>
                    A SALVAR...
                  </>
                ) : (
                  'SALVAR E VINCULAR'
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
