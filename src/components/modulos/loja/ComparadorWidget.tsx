'use client';

import Link from 'next/link';
import { useComparadorStore } from '@/store/useComparadorStore';

export default function ComparadorWidget() {
  const { produtos } = useComparadorStore();

  if (produtos.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 animate-bounce-short">
      <Link 
        href="/comparar"
        className="flex items-center gap-3 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-2xl transition hover:bg-blue-700 active:scale-95"
      >
        <span>⚖️ Comparar</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-blue-600">
          {produtos.length}
        </span>
      </Link>
    </div>
  );
}
