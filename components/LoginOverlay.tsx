import React, { useState } from 'react';
import { BRANCHES, BRANCH_CREDENTIALS, LOGIN_LOGO_URL } from '../constants';
import { Branch } from '../types';
import { Lock, ArrowRight, Building2, AlertCircle } from 'lucide-react';

interface LoginOverlayProps {
    onLogin: (branch: Branch) => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = ({ onLogin }) => {
    const [selectedBranchName, setSelectedBranchName] = useState<string>(BRANCHES[0].name);
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const validCode = BRANCH_CREDENTIALS[selectedBranchName];
        
        if (accessCode === validCode) {
            const branch = BRANCHES.find(b => b.name === selectedBranchName);
            if (branch) {
                onLogin(branch);
            }
        } else {
            setError('Invalid Access Code');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 overflow-hidden">
                
                {/* Header Graphic */}
                <div className="h-2 bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-600"></div>
                
                <div className="p-8 md:p-10">
                    <div className="text-center mb-10">
                        <img 
                            src={LOGIN_LOGO_URL} 
                            alt="Company Logo" 
                            className="h-32 md:h-40 mx-auto mb-6 object-contain"
                        />
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">GGX INVOICE MANAGER</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Secure Branch Authorization</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Select Branch</label>
                            <div className="relative group">
                                <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                <select 
                                    className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-semibold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                                    value={selectedBranchName}
                                    onChange={(e) => setSelectedBranchName(e.target.value)}
                                >
                                    {BRANCHES.map(b => (
                                        <option key={b.code} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-4 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Access Code</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                <input 
                                    type="password" 
                                    className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400"
                                    placeholder="Enter secure code..."
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-xl text-sm font-bold animate-pulse">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            className="w-full h-14 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span>ACCESS DASHBOARD</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-950 p-4 text-center border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Go Global Express System v20.0</p>
                </div>
            </div>
        </div>
    );
};