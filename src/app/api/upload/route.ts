import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem fornecida no corpo da requisição.' }, { status: 400 });
    }

    // A chave deve estar configurada nas Variáveis de Ambiente da Vercel
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    
    if (!IMGBB_API_KEY) {
      console.error('[ERRO SERVIDOR] IMGBB_API_KEY ausente.');
      return NextResponse.json({ error: 'Chave da API do ImgBB não configurada no servidor.' }, { status: 500 });
    }

    const imgbbFormData = new FormData();
    imgbbFormData.append('image', file);

    const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: imgbbFormData,
    });

    const imgbbData = await imgbbResponse.json();

    if (!imgbbResponse.ok || !imgbbData.success) {
      throw new Error(imgbbData.error?.message || 'Falha ao processar o upload no ImgBB.');
    }

    // Retorna o link direto da imagem renderizada
    return NextResponse.json({ url: imgbbData.data.url }, { status: 200 });

  } catch (error: any) {
    console.error('[ERRO API UPLOAD IMGBB]', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor de upload.' }, { status: 500 });
  }
}
