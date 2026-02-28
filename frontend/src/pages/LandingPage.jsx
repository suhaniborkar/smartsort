import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, ArrowRight, Activity, Users, Recycle, Globe2 } from 'lucide-react';
import axios from 'axios';

export default function LandingPage() {
    const [isLogin, setIsLogin] = useState(false);
    const [stats, setStats] = useState({ items_sorted: 0, recycled_properly: 0, eco_users: 0 });
    const [formData, setFormData] = useState({ name: '', email: '', password: '', state: '', district: '' });
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch global stats
        axios.get('http://127.0.0.1:5000/stats')
            .then(res => setStats(res.data))
            .catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLogin ? '/signin' : '/signup';
        try {
            const res = await axios.post(`http://127.0.0.1:5000${endpoint}`, formData);
            if (res.data.success) {
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/dashboard');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6">
            {/* Decorative blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center z-10 mb-12"
            >
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Leaf className="w-12 h-12 text-primary" />
                    <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight">Smart<span className="text-primary">Sort</span></h1>
                </div>
                <p className="text-2xl text-text-muted font-light tracking-wide">Scan. Sort. Sustain.</p>
            </motion.div>

            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 z-10 items-center">

                {/* Left Side: Stats and Info */}
                <motion.div
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="space-y-6"
                >
                    <div className="glass-panel p-8">
                        <h2 className="text-3xl font-display font-semibold mb-6 flex items-center gap-2">
                            <Globe2 className="text-primary" /> Global Impact
                        </h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 text-text-muted mb-2"><Recycle size={18} /> Sorted</div>
                                <div className="text-4xl font-display font-bold text-primary">{stats.items_sorted}</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2 text-text-muted mb-2"><Activity size={18} /> Recycled</div>
                                <div className="text-4xl font-display font-bold text-blue-400">{stats.recycled_properly}</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-white/5 col-span-2">
                                <div className="flex items-center gap-2 text-text-muted mb-2"><Users size={18} /> Eco Warriors</div>
                                <div className="text-4xl font-display font-bold text-white">{stats.eco_users}</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side: Auth Form */}
                <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="glass-panel p-8 md:p-12 relative overflow-hidden group"
                >
                    {/* Subtle moving glow inside the card */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => setIsLogin(false)}
                            className={`text-xl font-display pb-2 border-b-2 transition-all ${!isLogin ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
                        >
                            Join Us
                        </button>
                        <button
                            onClick={() => setIsLogin(true)}
                            className={`text-xl font-display pb-2 border-b-2 transition-all ${isLogin ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
                        >
                            Welcome Back
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {!isLogin && (
                                <motion.div
                                    initial={{ h: 0, opacity: 0 }} animate={{ h: 'auto', opacity: 1 }} exit={{ h: 0, opacity: 0 }}
                                    className="space-y-4"
                                >
                                    <input type="text" placeholder="Full Name" required className="glass-input"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" placeholder="State" required className="glass-input"
                                            value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                                        <input type="text" placeholder="District" required className="glass-input"
                                            value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <input type="email" placeholder="Email Address" required className="glass-input"
                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        <input type="password" placeholder="Password" required className="glass-input"
                            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />

                        <button type="submit" className="primary-button w-full mt-6 text-lg">
                            {isLogin ? 'Enter Dashboard' : 'Start Journey'} <ArrowRight size={20} />
                        </button>
                    </form>

                </motion.div>

            </div>
        </div>
    );
}
