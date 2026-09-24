/**
 * Converte um ficheiro de imagem para WebP usando um canvas em memória.
 * Mantém um limite de resolução máxima (FHD) para garantir alta performance.
 */
export const comprimirImagemWebP = (ficheiro: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(ficheiro);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        // Redimensionamento proporcional se exceder os limites
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          return reject(new Error('Falha ao instanciar o contexto 2D do Canvas.'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const nomeSemExtensao = ficheiro.name.replace(/\.[^/.]+$/, "");
            const novoFicheiro = new File([blob], `${nomeSemExtensao}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(novoFicheiro);
          } else {
            reject(new Error("Falha ao gerar o blob da imagem WebP."));
          }
        }, 'image/webp', 0.8); // 80% de qualidade
      };
      
      img.onerror = (erro) => reject(erro);
    };
    
    reader.onerror = (erro) => reject(erro);
  });
};
