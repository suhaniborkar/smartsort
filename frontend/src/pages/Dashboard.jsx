import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, LogOut, Award, Clock, History, Trophy } from 'lucide-react';
import axios from 'axios';

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [history, setHistory] = useState([]);
    const [points, setPoints] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        // Fetch user history
        axios.get(`http://127.0.0.1:5000/history/${parsedUser.email}`)
            .then(res => {
                setHistory(res.data.history);
                setPoints(res.data.points);
            })
            .catch(console.error);

        // Fetch leaderboard
        axios.get('http://127.0.0.1:5000/leaderboard')
            .then(res => setLeaderboard(res.data.leaderboard))
            .catch(console.error);
    }, [navigate]);

    if (!user) return null;

    return (
        <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-6 glass-panel p-6">
                <div>
                    <h1 className="text-3xl font-display font-bold">Welcome back, <span className="text-primary">{user.name.split(' ')[0]}</span></h1>
                    <p className="text-text-muted">{user.district}, {user.state}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 text-primary px-6 py-3 rounded-xl border border-primary/30 flex items-center gap-2 font-display text-xl font-bold">
                        <Award size={24} /> {points} PTS
                    </div>
                    <button onClick={() => navigate('/scan')} className="primary-button">
                        <Camera size={20} /> Scan Waste
                    </button>
                    <button onClick={() => { localStorage.removeItem('user'); navigate('/'); }} className="glass-button p-3">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Recent Scans */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="md:col-span-2 glass-panel p-6"
                >
                    <h2 className="text-2xl font-display font-semibold mb-6 flex items-center gap-2">
                        <History className="text-primary" /> Recent History
                    </h2>

                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <div className="text-center p-12 text-text-muted border border-dashed border-white/10 rounded-xl">
                                <Clock className="mx-auto mb-4 opacity-50" size={40} />
                                <p>No scans yet. Start your journey by scanning an item!</p>
                            </div>
                        ) : (
                            history.map((scan, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-black/20 border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
                                    <div>
                                        <h3 className="font-semibold text-lg">{scan.item}</h3>
                                        <div className="flex gap-2 text-sm text-text-muted mt-1">
                                            <span className={`px-2 py-0.5 rounded text-xs uppercase ${scan.category === 'dry' ? 'bg-blue-500/20 text-blue-400' :
                                                    scan.category === 'wet' ? 'bg-green-500/20 text-green-400' :
                                                        scan.category === 'ewaste' ? 'bg-purple-500/20 text-purple-400' :
                                                            'bg-red-500/20 text-red-400'
                                                }`}>
                                                {scan.category}
                                            </span>
                                            <span>{scan.time_label}</span>
                                        </div>
                                    </div>
                                    <div className="text-primary font-bold">+{scan.points} pts</div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Leaderboard */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-6"
                >
                    <h2 className="text-2xl font-display font-semibold mb-6 flex items-center gap-2">
                        <Trophy className="text-yellow-400" /> Leaderboard
                    </h2>
                    <div className="space-y-4">
                        {leaderboard.map((lbUser, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-black/20">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-black' :
                                            i === 1 ? 'bg-gray-300 text-black' :
                                                i === 2 ? 'bg-amber-600 text-white' : 'bg-surfaceBorder text-text-muted'
                                        }`}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{lbUser.name}</div>
                                        <div className="text-xs text-text-muted">{lbUser.state}</div>
                                    </div>
                                </div>
                                <div className="font-display font-bold text-primary">{lbUser.points}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
