// src/services/sharingService.ts

// Usa tmpfiles.org, um serviço de upload de arquivos que suporta CORS e não requer chave de API.
const UPLOAD_API_URL = 'https://tmpfiles.org/api/v1/upload';

/**
 * Converte uma string data URL em um objeto Blob.
 * @param dataUrl A data URL a ser convertida.
 * @returns Uma promessa que resolve para um Blob.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    if (!res.ok) {
        throw new Error('Falha ao converter data URL para Blob.');
    }
    return res.blob();
}

/**
 * Faz upload de uma imagem para um serviço de hospedagem e retorna um link compartilhável.
 * @param imageDataUrl - A string data URL (base64) da imagem.
 * @returns Uma promessa que resolve para a URL da imagem.
 */
export async function createShareableLink(imageDataUrl: string): Promise<string> {
  try {
    const imageBlob = await dataUrlToBlob(imageDataUrl);
    
    const formData = new FormData();
    const fileExtension = imageBlob.type.split('/')[1] || 'png';
    const fileName = `foto-cabine-pd.${fileExtension}`;
    // A API do 'tmpfiles.org' espera que o campo se chame 'file'
    formData.append('file', imageBlob, fileName);

    const response = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro do serviço de upload:', response.status, errorText);
      throw new Error(errorText || `O serviço de compartilhamento retornou um erro: ${response.status}.`);
    }
    
    const result = await response.json();

    if (result.status === 'success' && result.data?.url) {
      // A URL retornada é uma página de aterrissagem. 
      // Construímos a URL de download direto substituindo o início.
      // Ex: https://tmpfiles.org/123/file.png -> https://tmpfiles.org/dl/123/file.png
      const directUrl = result.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
      return directUrl;
    } else {
      console.error("Resposta inválida do serviço de upload (tmpfiles.org):", result);
      throw new Error("A resposta do serviço de compartilhamento foi inválida.");
    }

  } catch (error) {
    console.error("Erro ao criar link compartilhável:", error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // This is a generic network error.
        throw new Error("Erro de rede. Verifique sua conexão e desative bloqueadores de anúncios ou VPN que possam estar interferindo.");
    }
    
    // Re-lança outros erros para serem tratados pela UI
    if (error instanceof Error) {
        throw error;
    }

    throw new Error("Ocorreu um erro desconhecido ao criar o link de compartilhamento.");
  }
}
