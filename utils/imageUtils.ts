import { ImageData } from '../types';
import { LOGO_IMAGE_DATA_URL } from '../constants';

export const fileToImageData = (file: File): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const url = reader.result as string;
      const base64 = url.split(',')[1];
      const mimeType = url.match(/:(.*?);/)?.[1] || file.type || 'application/octet-stream';
      if (!base64 || !mimeType) {
        return reject(new Error("Falha ao processar o arquivo de imagem."));
      }
      resolve({ base64, mimeType, url });
    };
    reader.onerror = (error) => reject(error);
  });
};

export const blobToImageData = (blob: Blob): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const url = reader.result as string;
      const base64 = url.split(',')[1];
      const mimeType = blob.type || 'image/jpeg';
      if (!base64) {
        return reject(new Error("Falha ao processar o blob de imagem."));
      }
      resolve({ base64, mimeType, url });
    };
    reader.onerror = (error) => reject(error);
  });
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error("Falha ao carregar um recurso de imagem para a colagem."));
      img.src = src;
  });
};

export const createCollage = async (imageUrls: string[]): Promise<string> => {
    const STORY_WIDTH = 1080;
    const STORY_HEIGHT = 1920;

    const canvas = document.createElement('canvas');
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

    const images = await Promise.all(imageUrls.map(url => loadImage(url)));
    const heightPerImage = STORY_HEIGHT / images.length;
    let currentY = 0;

    for (const img of images) {
        const boxWidth = STORY_WIDTH;
        const boxHeight = heightPerImage;

        const imgRatio = img.width / img.height;
        const boxRatio = boxWidth / boxHeight;

        let sx, sy, sWidth, sHeight;

        // "object-fit: cover" logic
        if (imgRatio > boxRatio) {
            // Image is wider than the box, crop sides
            sHeight = img.height;
            sWidth = sHeight * boxRatio;
            sx = (img.width - sWidth) / 2;
            sy = 0;
        } else {
            // Image is taller or same ratio, crop top/bottom
            sWidth = img.width;
            sHeight = sWidth / boxRatio;
            sy = (img.height - sHeight) / 2;
            sx = 0;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, currentY, boxWidth, boxHeight);
        currentY += heightPerImage;
    }

    return canvas.toDataURL('image/jpeg', 0.9);
};


export const addWatermark = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    Promise.all([
      loadImage(imageUrl),
      loadImage(LOGO_IMAGE_DATA_URL)
    ]).then(([collageImage, logoImage]) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error("Não foi possível obter o contexto do canvas"));
      }

      canvas.width = collageImage.width;
      canvas.height = collageImage.height;
      ctx.drawImage(collageImage, 0, 0);

      // Watermark settings
      const padding = 30;
      const logoHeight = 40;
      const logoWidth = logoImage.width * (logoHeight / logoImage.height);

      ctx.globalAlpha = 0.6; // Discreet opacity

      // Draw logo
      const logoX = padding;
      const logoY = canvas.height - padding - logoHeight;
      ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
      
      // Add text next to the logo
      const watermarkText = "P&D RFeitosa Group";
      const fontSize = 28;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = 'middle';

      const spacing = 15;
      const textX = logoX + logoWidth + spacing;
      const textY = logoY + logoHeight / 2;
      
      ctx.fillText(watermarkText, textX, textY);
      
      ctx.globalAlpha = 1.0; // Reset global alpha

      resolve(canvas.toDataURL('image/png'));
    }).catch(err => {
      reject(new Error("Falha ao carregar imagens para adicionar marca d'água."));
    });
  });
};
