import React, { useEffect, useState } from 'react';
import { Branch, HistoryEntry } from '../types';
import { fetchInvoiceHistory } from '../services/mockService';
import { Plus, History, TrendingUp, Package, ArrowRight, Clock, Truck, FileText } from 'lucide-react';

interface DashboardViewProps {
    branch: Branch | null;
    onNavigate: (view: 'form' | 'history') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ branch, onNavigate }) => {
    const [stats, setStats] = useState({
        todayCount: 0,
        todayRevenue: 0,
        pendingCount: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDailyStats();
    }, []);

    const loadDailyStats = async () => {
        try {
            const history = await fetchInvoiceHistory();
            const todayStr = new Date().toLocaleDateString();
            
            const todayItems = history.filter(h => h.date === todayStr);
            
            setStats({
                todayCount: todayItems.length,
                todayRevenue: todayItems.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0),
                pendingCount: Math.floor(Math.random() * 5) // Mock "Processing" status
            });
        } catch (e) {
            console.error("Failed to load stats");
        } finally {
            setIsLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-brand-400 font-bold uppercase tracking-wider text-xs mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        System Online
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">
                        {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-white">{branch?.name}</span>
                    </h1>
                    <p className="text-slate-400 font-medium max-w-lg">
                        Welcome to the GGX Logistics Hub. Your daily performance overview and quick actions are ready.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-brand-600 dark:text-brand-400">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">Invoices Today</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {isLoading ? '...' : stats.todayCount}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">Today's Revenue</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {isLoading ? '...' : stats.todayRevenue.toLocaleString('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400">
                        <Truck className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">Pending Dispatch</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {isLoading ? '...' : stats.pendingCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-500" />
                Quick Actions
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
                <button 
                    onClick={() => onNavigate('form')}
                    className="group relative overflow-hidden bg-brand-600 hover:bg-brand-500 transition-all p-8 rounded-3xl text-left shadow-lg hover:shadow-brand-500/25 active:scale-[0.99]"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Plus className="w-32 h-32 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6">
                            <Plus className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">New Shipment</h3>
                        <p className="text-brand-100 font-medium">Create a new invoice, calculate rates, and generate labels.</p>
                        <div className="mt-8 flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                            Start Now <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </button>

                <button 
                    onClick={() => onNavigate('history')}
                    className="group relative overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 transition-all p-8 rounded-3xl text-left shadow-sm hover:shadow-xl active:scale-[0.99]"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <History className="w-32 h-32 transform -rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <div className="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 mb-6 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:text-brand-600 transition-colors">
                            <History className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Invoice History</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">View past shipments, reprint invoices, and export reports.</p>
                        <div className="mt-8 flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                            View Archive <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};