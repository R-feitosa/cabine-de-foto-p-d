// src/services/sharingService.ts

// Usa um serviço mais confiável (file.io) com melhores políticas de CORS para evitar erros de 'fetch'.
// O link gerado expira em 1 dia (?expires=1d).
const UPLOAD_API_URL = 'https://file.io?expires=1d';

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
    // A API do 'file.io' espera que o campo se chame 'file'
    formData.append('file', imageBlob, fileName);

    const response = await fetch(UPLOAD_API_URL, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro do serviço de upload:', response.status, result);
      throw new Error(result.message || `O serviço de compartilhamento retornou um erro: ${response.status}.`);
    }
    
    // Verifica a estrutura de resposta do file.io
    if (result.success && result.link) {
      return result.link;
    } else {
      console.error("Resposta inválida do serviço de upload (file.io):", result);
      throw new Error(result.message || "A resposta do serviço de compartilhamento foi inválida.");
    }

  } catch (error) {
    console.error("Erro ao criar link compartilhável:", error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error("Erro de rede. Verifique sua conexão e desative bloqueadores de anúncios ou VPN que possam estar interferindo.");
    }
    
    // Re-lança outros erros para serem tratados pela UI
    if (error instanceof Error) {
        throw error;
    }

    throw new Error("Ocorreu um erro desconhecido ao criar o link de compartilhamento.");
  }
}
