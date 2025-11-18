
import { GoogleGenAI, Modality } from "@google/genai";
import { ImageData } from '../types';

const MODEL_NAME = 'gemini-2.5-flash-image';

export async function transformImage(
  imageData: ImageData,
  prompt: string
): Promise<string> {
  // Ensure the API key is available
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
            parts: [
                {
                    inlineData: {
                        data: imageData.base64,
                        mimeType: imageData.mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }
    
    throw new Error("Nenhuma imagem foi gerada. Tente novamente.");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Erro ao transformar imagem: ${error.message}`);
    }
    throw new Error("Ocorreu um erro desconhecido ao transformar a imagem.");
  }
}
