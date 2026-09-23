'use client';

import Link from 'next/link';
import { useState } from 'react';
// 1. IMPORTAÇÃO DO WIDGET ADICIONADA AQUI
import ComparadorWidget from '@/components/modulos/loja/ComparadorWidget';

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  const [busca, setBusca] = useState('');

  const lidarComBusca = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Buscando por: ${busca}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-sans text-gray-900">
      
      {/* Header Responsivo */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="bg-blue-600 px-4 py-1.5 text-center text-xs font-medium text-white sm:text-sm">
          Compre pelo site e retire na loja em até 2 horas! 🚀
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-black tracking-widest text-zinc-900">
              WE<span className="text-blue-600">HAVE</span>
            </h1>
          </Link>

          <form onSubmit={lidarComBusca} className="flex flex-1 sm:max-w-md">
            <div className="flex w-full items-center overflow-hidden rounded-full border border-gray-300 bg-gray-100 px-4 py-2 transition-colors focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
              <span className="text-gray-400">🔍</span>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="O que você procura hoje?"
                className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
              />
            </div>
          </form>

          <div className="hidden sm:flex sm:items-center sm:gap-4">
            <a 
              href="https://wa.me/5533999999999" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-bold text-gray-600 transition-colors hover:text-green-600"
            >
              <span className="text-xl">💬</span>
              Fale Conosco
            </a>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 relative">
        {children}
        
        {/* 2. INJEÇÃO DO COMPONENTE FLUTUANTE ADICIONADA AQUI */}
        <ComparadorWidget />
      </main>

      {/* Rodapé (Footer) */}
      <footer className="mt-16 bg-zinc-900 pt-12 text-zinc-300">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:grid-cols-2 md:grid-cols-4 sm:px-6 lg:px-8 pb-12">
          <div>
            <h2 className="text-2xl font-black tracking-widest text-white mb-4">
              WE<span className="text-blue-500">HAVE</span>
            </h2>
            <p className="text-sm text-zinc-400">
              Especialistas em tecnologia, assistência técnica premium e acessórios exclusivos.
            </p>
          </div>
          
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Institucional</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-blue-400 transition">Sobre Nós</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition">Nossas Lojas</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition">Trabalhe Conosco</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Atendimento</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-blue-400 transition">Trocas e Devoluções</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition">Política de Privacidade (LGPD)</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition">Termos de Serviço</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Segurança</h3>
            <div className="flex gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded bg-zinc-800 text-2xl" title="Site Seguro">🔒</span>
              <span className="flex h-12 w-12 items-center justify-center rounded bg-zinc-800 text-2xl" title="Pagamento Criptografado">💳</span>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 bg-black py-6 text-center text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} We Have Store. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
