
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ImageData } from './types';
import { IMAGE_STYLES } from './constants';
import { transformImage } from './services/geminiService';
import { fileToImageData, blobToImageData, addWatermark, createCollage } from './utils/imageUtils';
import { createShareableLink } from './services/sharingService';

// Adiciona a propriedade QRCode ao objeto window para o TypeScript
declare global {
    interface Window {
        QRCode: any;
    }
}

const CameraIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const UploadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const SparklesIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 01-1.414 1.414L12 6.414l-2.293 2.293a1 1 0 01-1.414-1.414L10 4.707m-3.293 8.293a1 1 0 01-1.414 1.414L4 15.414l-2.293 2.293a1 1 0 01-1.414-1.414L2.293 14 0 11.707a1 1 0 011.414-1.414L4 12.586l2.293-2.293a1 1 0 011.414 1.414L5.414 14l2.293 2.293zM21 11.707a1 1 0 01-1.414 1.414L17.293 14l-2.293 2.293a1 1 0 01-1.414-1.414L15.586 13l-2.293-2.293a1 1 0 011.414-1.414L17 11.293l2.293-2.293a1 1 0 011.414 1.414L19.707 12 22 14.293z" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0119.5 19.5M20 20l-1.5-1.5A9 9 0 004.5 4.5" />
    </svg>
);

const QrIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <line x1="14" y1="14" x2="14.01" y2="14"></line>
        <line x1="17" y1="14" x2="21" y2="14"></line>
        <line x1="14" y1="17" x2="17" y2="17"></line>
        <line x1="19" y1="17" x2="21" y2="17"></line>
        <line x1="14" y1="21" x2="21" y2="21"></line>
    </svg>
);

interface CameraProps {
    onCapture: (imageData: ImageData) => void;
    onClose: () => void;
}

const Camera: React.FC<CameraProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        async function setupCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Erro ao acessar a câmera: ", err);
                setError("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
            }
        }
        setupCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const takePicture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        try {
                            const imageData = await blobToImageData(blob);
                            onCapture(imageData);
                        } catch (e) {
                            setError("Falha ao capturar a imagem.");
                        }
                    }
                }, 'image/jpeg');
            }
        }
    }, [onCapture]);

    const startCountdown = () => {
        if (countdown !== null) return;

        let count = 3;
        setCountdown(count);

        intervalRef.current = window.setInterval(() => {
            count -= 1;
            if (count > 0) {
                setCountdown(count);
            } else {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setCountdown(null);

                const videoContainer = videoRef.current?.parentElement;
                if (videoContainer) {
                    videoContainer.classList.add('flash-effect');
                    setTimeout(() => {
                        videoContainer.classList.remove('flash-effect');
                    }, 300);
                }
                
                takePicture();
            }
        }, 1000);
    };

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl p-8 text-center">
                    <h3 className="text-2xl font-bold text-red-400 mb-4">Erro de Câmera</h3>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
             <div className="relative w-full max-w-3xl mb-4">
                <video ref={videoRef} autoPlay playsInline className="w-full max-h-[70vh] rounded-2xl object-cover"></video>
                {countdown !== null && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-9xl font-bold text-white countdown-animation" style={{ textShadow: '0 0 20px rgba(0,0,0,0.8)' }} key={countdown}>
                            {countdown}
                        </span>
                    </div>
                )}
            </div>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="flex gap-4">
                <button 
                    onClick={startCountdown}
                    disabled={countdown !== null}
                    className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <CameraIcon className="h-6 w-6" /> Capturar
                </button>
                <button 
                    onClick={onClose}
                    disabled={countdown !== null}
                    className="flex items-center justify-center gap-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-full text-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

const Snowfall: React.FC = () => {
    const snowflakes = Array.from({ length: 50 }).map((_, i) => {
        const style = {
            left: `${Math.random() * 100}vw`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            animationDuration: `${Math.random() * 5 + 5}s`,
            animationDelay: `${Math.random() * 5}s`,
        };
        return <div key={i} className="snowflake" style={style}></div>;
    });
    return <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">{snowflakes}</div>;
};

const TwinklingLights: React.FC = () => {
    const lights = Array.from({ length: 70 }).map((_, i) => {
        const colors = ['#FFD700', '#FFFFFF', '#FFFAF0', '#FFFACD'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const style = {
            left: `${Math.random() * 100}vw`,
            top: `${Math.random() * 100}vh`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            backgroundColor: color,
            boxShadow: `0 0 3px ${color}, 0 0 5px ${color}`,
            animationDuration: `${Math.random() * 3 + 2}s`,
            animationDelay: `${Math.random() * 3}s`,
        };
        return <div key={i} className="twinkle-light" style={style}></div>;
    });
    return <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">{lights}</div>;
};

const QrCodeModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    useEffect(() => {
        const generateLinkAndQrCode = async () => {
            if (!imageUrl) return;

            setIsLoading(true);
            setError(null);

            try {
                const url = await createShareableLink(imageUrl);
                setShareUrl(url);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Falha ao criar link de compartilhamento.");
                setIsLoading(false);
            }
        };

        generateLinkAndQrCode();
    }, [imageUrl]);

    useEffect(() => {
        if (shareUrl && canvasRef.current) {
            if (window.QRCode) {
                window.QRCode.toCanvas(canvasRef.current, shareUrl, { width: 256, errorCorrectionLevel: 'H' }, (err: Error | null) => {
                    if (err) {
                        console.error("QR Code generation error:", err);
                        setError("Ocorreu um erro ao renderizar o QR code.");
                    }
                    setIsLoading(false);
                });
            } else {
                setError("A biblioteca de QR code não foi carregada.");
                setIsLoading(false);
            }
        }
    }, [shareUrl]);

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-yellow-200 mb-4 font-christmas">Baixar no Celular</h3>
                <p className="text-gray-300 mb-6">Aponte a câmera do seu celular para o QR code para abrir e salvar a imagem em alta qualidade.</p>
                <div className="bg-white p-4 rounded-lg inline-block min-h-[288px] w-[288px] flex items-center justify-center">
                    {isLoading && <p className="text-gray-600">Gerando link de 24h...</p>}
                    {error && !isLoading && (
                         <p className="text-red-500 font-semibold p-4">{error}</p>
                    )}
                    <canvas 
                        ref={canvasRef} 
                        aria-label="QR code para baixar imagem"
                        className={`${isLoading || error ? 'hidden' : ''}`}
                    ></canvas>
                </div>
                <p className="text-xs text-gray-400 mt-4 px-4">
                    Sua imagem é enviada para um link temporário e seguro que expira em 24 horas.
                </p>
                <button onClick={onClose} className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded-lg transition-transform transform hover:scale-105">
                    Fechar
                </button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const [showCamera, setShowCamera] = useState<boolean>(false);
    const [showQrModal, setShowQrModal] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);


    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                setGeneratedImage(null);
                setError(null);
                const imageData = await fileToImageData(file);
                setOriginalImage(imageData);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Falha ao carregar a imagem.");
            }
        }
    };

    const handleCapture = (imageData: ImageData) => {
        setGeneratedImage(null);
        setError(null);
        setOriginalImage(imageData);
        setShowCamera(false);
    };

    const handleGenerate = useCallback(async () => {
        if (!originalImage) {
            setError("Por favor, carregue uma imagem e selecione um estilo.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const generatedUrls: string[] = [];
            for (let i = 0; i < IMAGE_STYLES.length; i++) {
                const style = IMAGE_STYLES[i];
                setLoadingMessage(`Gerando ${style.name}... (${i + 1}/${IMAGE_STYLES.length})`);
                const resultUrl = await transformImage(originalImage, style.prompt);
                generatedUrls.push(resultUrl);
            }

            setLoadingMessage('Criando sua montagem...');
            const collageUrl = await createCollage(generatedUrls);
            const watermarkedUrl = await addWatermark(collageUrl);
            setGeneratedImage(watermarkedUrl);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
        } finally {
            setIsLoading(false);
            setLoadingMessage(null);
        }
    }, [originalImage]);

    const handleReset = () => {
        setOriginalImage(null);
        setGeneratedImage(null);
        setError(null);
        setIsLoading(false);
        setShowCamera(false);
        setShowQrModal(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const isGenerationComplete = generatedImage && !isLoading;

    return (
        <div className="min-h-screen bg-[#0c1427] text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
             <Snowfall />
             <TwinklingLights />
             {showCamera && <Camera onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
             {showQrModal && generatedImage && <QrCodeModal imageUrl={generatedImage} onClose={() => setShowQrModal(false)} />}
             {!isOnline && (
                <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-black font-semibold text-center p-2 z-50 shadow-lg">
                    Você está offline. A transformação de imagens não funcionará.
                </div>
            )}
            <header className="w-full max-w-5xl text-center mb-8 mt-8 sm:mt-0 z-10">
                <h1 className="text-5xl sm:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-300 mb-2 font-christmas">
                    Cabine de Fotos do P&D
                </h1>
                <p className="text-lg text-gray-300">
                    Sua foto, seu filme de Natal. Deixe a magia acontecer!
                </p>
            </header>

            <main className="w-full max-w-5xl flex-grow z-10">
                {isGenerationComplete ? (
                     <div className="text-center animate-fade-in max-w-4xl mx-auto">
                        <h3 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-300 font-christmas">Sua Magia de Natal! ✨</h3>
                        <p className="text-gray-300 mb-6">Sua montagem para stories foi criada com sucesso.</p>

                        <img src={generatedImage} alt="Generated" className="rounded-2xl shadow-lg mx-auto mb-8 max-h-[90vh] object-contain border-4 border-yellow-300/50" />
                        
                        <div className="flex flex-wrap gap-4 justify-center">
                             <a
                                href={generatedImage!}
                                download={`foto-cabine-pd-stories.png`}
                                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full text-lg transition-transform transform hover:scale-105"
                            >
                                <DownloadIcon className="h-6 w-6" />
                                Baixar
                            </a>
                             <button
                                onClick={() => setShowQrModal(true)}
                                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full text-lg transition-transform transform hover:scale-105"
                            >
                                <QrIcon className="h-6 w-6" />
                                QR Code
                            </button>
                            <button
                                onClick={handleGenerate}
                                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-3 px-6 rounded-full text-lg transition-transform transform hover:scale-105"
                            >
                                <SparklesIcon className="h-6 w-6" />
                                Gerar Novamente
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-full text-lg transition-transform transform hover:scale-105"
                            >
                                <RefreshIcon className="h-6 w-6" />
                                Começar de Novo
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Step 1: Upload Image */}
                        <div className="bg-green-900/40 p-6 rounded-2xl border border-yellow-500/30 backdrop-blur-sm">
                            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-3 text-yellow-100">
                                <span className="bg-red-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">1</span>
                                Escolha sua Foto
                            </h2>
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="w-full md:w-1/2 flex items-center justify-center h-[435px] bg-slate-800/50 rounded-lg overflow-hidden border-2 border-dashed border-gray-600">
                                    {originalImage ? (
                                        <img src={originalImage.url} alt="Preview" className="h-full w-full object-contain" />
                                    ) : (
                                        <div className="text-gray-400 text-center">
                                            <CameraIcon className="h-16 w-16 mx-auto mb-2 text-gray-500" />
                                            Sua foto aparecerá aqui
                                        </div>
                                    )}
                                </div>
                                <div className="w-full md:w-1/2 space-y-4">
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                    <button onClick={() => setShowCamera(true)} className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105">
                                        <CameraIcon className="h-6 w-6" /> Tirar Foto
                                    </button>
                                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 bg-green-800 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition">
                                        <UploadIcon className="h-6 w-6" /> Enviar Arquivo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Generate */}
                        <div className="text-center pt-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <SparklesIcon className="h-12 w-12 text-yellow-400 animate-spin" />
                                    <p className="text-lg text-gray-300">{loadingMessage || 'A magia está acontecendo...'}</p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerate}
                                    disabled={!originalImage || isLoading || !isOnline}
                                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-4 px-10 rounded-full text-xl transition-transform transform hover:scale-105 shadow-lg shadow-red-500/30 disabled:shadow-none"
                                >
                                    <span className="flex items-center gap-3">
                                        <SparklesIcon className="h-6 w-6" />
                                        Transformar
                                    </span>
                                </button>
                            )}
                            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                        </div>
                    </div>
                )}
            </main>
             <footer className="w-full max-w-5xl text-center mt-8 text-gray-500 text-sm z-10">
                <p>Criado com a API Gemini do Google. As imagens são geradas por IA.</p>
            </footer>
        </div>
    );
};

export default App;
