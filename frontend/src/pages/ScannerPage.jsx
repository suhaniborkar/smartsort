import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image as ImageIcon, X, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import axios from 'axios';

export default function ScannerPage() {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!user.email) navigate('/');
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            alert("Could not access camera. Please upload an image instead.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            setCameraActive(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            canvasRef.current.toBlob((blob) => {
                handleImageSelection(new File([blob], "capture.jpg", { type: "image/jpeg" }));
                stopCamera();
            }, 'image/jpeg');
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleImageSelection(e.target.files[0]);
        }
    };

    const handleImageSelection = (file) => {
        setImage(file);
        setPreview(URL.createObjectURL(file));
        setResult(null);
    };

    const analyzeImage = async () => {
        if (!image) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('image', image);
        formData.append('email', user.email);

        try {
            // Step 1: Classify with Gemini
            const classRes = await axios.post('http://127.0.0.1:5000/classify', formData);
            const data = classRes.data;

            // Step 2: Save scan and award points
            await axios.post('http://127.0.0.1:5000/save-scan', {
                email: user.email,
                item: data.item,
                category: data.category,
                reason: data.reason,
                instructions: data.instructions
            });

            setResult(data);
        } catch (err) {
            console.error(err);
            alert("Failed to analyze image. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetScanner = () => {
        setImage(null);
        setPreview(null);
        setResult(null);
    };

    return (
        <div className="min-h-screen p-6 max-w-4xl mx-auto flex flex-col items-center justify-center">

            <button onClick={() => navigate('/dashboard')} className="self-start mb-6 text-text-muted hover:text-white flex items-center gap-2 transition-colors">
                <ArrowLeft size={20} /> Back to Dashboard
            </button>

            <div className="w-full glass-panel overflow-hidden relative">

                {/* Top Gradient */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-primary background-animate" />

                <div className="p-8 md:p-12">

                    {!preview && !cameraActive && (
                        <div className="text-center space-y-6">
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Camera className="w-12 h-12 text-primary" />
                            </div>
                            <h2 className="text-3xl font-display font-semibold">Scan an Item</h2>
                            <p className="text-text-muted max-w-md mx-auto">Take a photo of your waste to instantly know how to dispose of it and earn points.</p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                                <button onClick={startCamera} className="primary-button">
                                    <Camera size={20} /> Open Camera
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                <button onClick={() => fileInputRef.current.click()} className="glass-button px-6 py-3 flex items-center gap-2 justify-center">
                                    <ImageIcon size={20} /> Upload Image
                                </button>
                            </div>
                        </div>
                    )}

                    {cameraActive && (
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} className="hidden" />

                            {/* Overlay controls */}
                            <div className="absolute bottom-6 left-0 w-full flex justify-center gap-6">
                                <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white/20 border-4 border-white backdrop-blur flex items-center justify-center hover:bg-white/40 transition-all">
                                    <div className="w-6 h-6 rounded-full bg-primary" />
                                </button>
                                <button onClick={stopCamera} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500/80 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {preview && (
                        <div className="flex flex-col lg:flex-row gap-8 items-start">

                            <div className="w-full lg:w-1/2 relative rounded-xl overflow-hidden border border-white/10 group">
                                <img src={preview} alt="Preview" className="w-full h-auto max-h-[400px] object-cover" />

                                {loading && (
                                    <div className="absolute inset-0 bg-primary/20 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                                        <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                                        <p className="text-white font-medium animate-pulse">Gemini is analyzing...</p>
                                    </div>
                                )}

                                {/* Scanner line effect */}
                                {loading && (
                                    <motion.div
                                        initial={{ top: '0%' }} animate={{ top: '100%' }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-0 w-full h-1 bg-primary z-20 shadow-[0_0_20px_theme('colors.primary')]"
                                    />
                                )}

                                {!loading && !result && (
                                    <button onClick={resetScanner} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="w-full lg:w-1/2 flex flex-col justify-center h-full">
                                {!result && !loading && (
                                    <div className="text-center space-y-6">
                                        <h3 className="text-2xl font-display font-semibold">Ready to scan?</h3>
                                        <p className="text-text-muted">Our AI will identify the item and tell you exactly what to do with it.</p>
                                        <button onClick={analyzeImage} className="primary-button w-full">Analyze Image</button>
                                    </div>
                                )}

                                {result && (
                                    <AnimatePresence>
                                        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">

                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-text-muted text-sm uppercase tracking-wider mb-1">Identified Item</div>
                                                    <h2 className="text-3xl font-display font-bold">{result.item}</h2>
                                                </div>
                                                <div className={`px-4 py-2 rounded-lg font-bold uppercase tracking-wide text-sm ${result.category === 'dry' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                        result.category === 'wet' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                            result.category === 'ewaste' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                                'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    {result.category} Waste
                                                </div>
                                            </div>

                                            <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-4">
                                                <div className="flex gap-3 items-start">
                                                    <CheckCircle2 className="text-primary mt-1 flex-shrink-0" />
                                                    <div>
                                                        <div className="font-semibold mb-1">What to do:</div>
                                                        <p className="text-text-muted text-sm leading-relaxed">{result.instructions}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-start pt-3 border-t border-white/5">
                                                    <AlertTriangle className="text-yellow-400 mt-1 flex-shrink-0" />
                                                    <div>
                                                        <div className="font-semibold mb-1">Why?</div>
                                                        <p className="text-text-muted text-sm leading-relaxed">{result.reason}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-xl text-primary font-bold">
                                                🎉 +10 Points Earned!
                                            </div>

                                            <button onClick={resetScanner} className="glass-button w-full py-3">Scan Another Item</button>

                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
