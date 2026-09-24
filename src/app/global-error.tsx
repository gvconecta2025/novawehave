'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', borderTop: '8px solid #dc2626', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '60px', display: 'block', marginBottom: '20px' }}>⚠️</span>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#111827', marginBottom: '10px' }}>FALHA CRÍTICA NA RAIZ</h1>
            <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px' }}>Lei Anti-Silêncio: Exceção Global Interceptada</p>
            
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', textAlign: 'left', marginBottom: '30px' }}>
              <p style={{ fontFamily: 'monospace', color: '#7f1d1d', fontSize: '14px', wordBreak: 'break-word' }}>
                {error.message || 'Erro de renderização não identificado.'}
              </p>
            </div>
            
            <button 
              onClick={() => reset()} 
              style={{ backgroundColor: '#dc2626', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
