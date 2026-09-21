import { redirect } from 'next/navigation';

export default function RotaRaiz() {
  // Captura o usuário que acessa o link principal e envia para a segurança do Login
  redirect('/login');
}
