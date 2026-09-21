import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/global/AuthProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'We Have | Sistema Integrado',
  description: 'Gestão Operacional, PDV e Assistência Técnica',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      {/* A fonte Inter é injetada globalmente mantendo a legibilidade limpa (KISS) */}
      <body className={`${inter.variable} bg-gray-50 font-sans antialiased`}>
        
        {/* 
          Envelopamento de Segurança (RBAC):
          Todas as rotas (exceto /login e rotas públicas mapeadas no middleware)
          estarão protegidas e exigirão escuta ativa do Firebase Auth.
        */}
        <AuthProvider>
          {children}
        </AuthProvider>

      </body>
    </html>
  );
}
