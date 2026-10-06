/**
 * Gera um ID de Comanda Inteligente para rastreabilidade omnichannel.
 * Formato: [PREFIXO]-[DDMMAA]-[SEQ_3_DIGITOS]-[HHMM]
 * Exemplo: PB-061026-001-1141
 * 
 * @param fluxo - O nome do fluxo operacional (ex: 'PDV Balcão')
 * @param sequencia - Número sequencial atómico da comanda no dia
 * @returns string formatada do ID Inteligente
 */
export function gerarIdComanda(fluxo: string, sequencia: number): string {
  let prefixo = 'XX';
  
  switch (fluxo) {
    case 'PDV Balcão':
      prefixo = 'PB';
      break;
    case 'Demanda/Encomenda':
      prefixo = 'DE';
      break;
    case 'Venda Direta (WhatsApp)':
      prefixo = 'VD';
      break;
    case 'Loja Virtual':
      prefixo = 'LV';
      break;
    default:
      prefixo = 'XX';
      break;
  }

  const agora = new Date();
  
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = String(agora.getFullYear()).slice(-2);
  const dataFormatada = `${dia}${mes}${ano}`;

  const seqStr = String(sequencia).padStart(3, '0');

  const hora = String(agora.getHours()).padStart(2, '0');
  const min = String(agora.getMinutes()).padStart(2, '0');
  const horaFormatada = `${hora}${min}`;

  return `${prefixo}-${dataFormatada}-${seqStr}-${horaFormatada}`;
}
