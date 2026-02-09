import React, { useState, useEffect, useMemo } from 'react';
import { HistoryEntry } from '../types';
import { fetchInvoiceHistory } from '../services/mockService';
import { Search, FileText, Download, MessageCircle, X, Loader2, ArrowRight, RefreshCw, AlertTriangle, TrendingUp, Package, Scale, Table } from 'lucide-react';

interface HistoryViewProps {
    onRestore: (entry: HistoryEntry) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onRestore }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<HistoryEntry | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        setHasError(false);
        try {
            const data = await fetchInvoiceHistory();
            // Sort by Invoice Number descending to show newest first
            const sorted = data.sort((a, b) => {
                if (a.invoiceNo && b.invoiceNo) {
                    return b.invoiceNo.localeCompare(a.invoiceNo, undefined, { numeric: true, sensitivity: 'base' });
                }
                return 0;
            });
            setHistory(sorted);
        } catch (e) {
            console.error("History Load Error:", e);
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic: Search across multiple fields
    const filteredHistory = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return history;

        return history.filter(item => 
            (item.invoiceNo?.toLowerCase().includes(term)) ||
            (item.consName?.toLowerCase().includes(term)) ||
            (item.senderPh?.toLowerCase().includes(term)) ||
            (item.senderName?.toLowerCase().includes(term)) ||
            (item.country?.toLowerCase().includes(term)) ||
            (item.date?.toLowerCase().includes(term))
        );
    }, [history, searchTerm]);

    // Analytics Calculation based on filtered results
    const stats = useMemo(() => {
        return filteredHistory.reduce((acc, curr) => ({
            revenue: acc.revenue + (Number(curr.grandTotal) || 0),
            weight: acc.weight + (Number(curr.chgWt) || 0),
            boxes: acc.boxes + (Number(curr.totalBoxes) || 0),
            count: acc.count + 1
        }), { revenue: 0, weight: 0, boxes: 0, count: 0 });
    }, [filteredHistory]);

    const handleExportCSV = () => {
        const headers = ['Date', 'Invoice No', 'Sender', 'Sender Ph', 'Consignee', 'Cons Email', 'Country', 'Weight (Kg)', 'Boxes', 'Total (LKR)', 'Paid', 'Balance'];
        const rows = filteredHistory.map(item => [
            item.date,
            item.invoiceNo,
            `"${item.senderName}"`,
            `'${item.senderPh}`, // Prepend ' to prevent Excel from scientific notation
            `"${item.consName}"`,
            item.consEmail || '',
            item.country,
            item.chgWt,
            item.totalBoxes,
            item.grandTotal,
            item.amountPaid,
            item.balanceDue
        ]);

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add BOM for Excel UTF-8 support
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `GGX_Archive_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleWhatsApp = (invoice: HistoryEntry) => {
        let phone = String(invoice.senderPh || '').replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '94' + phone.substring(1);
        else if (phone.length === 9) phone = '94' + phone;

        const message = `*GO GLOBAL EXPRESS INVOICE (COPY)*\n\n` +
            `Invoice No: ${invoice.invoiceNo}\n` +
            `Date: ${invoice.date}\n\n` +
            `*Customer:* ${invoice.senderName}\n` +
            `*Consignee:* ${invoice.consName} (${invoice.country})\n\n` +
            `*TOTAL: LKR ${Number(invoice.grandTotal).toLocaleString('en-LK', {minimumFractionDigits: 2})}*\n\n` +
            `Thank you for shipping with us!`;

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Invoice History</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Archive & Business Intelligence</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportCSV}
                        className="h-12 px-4 flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-900/20 active:scale-95"
                    >
                        <Table className="w-4 h-4" />
                        <span className="hidden md:inline">Export CSV</span>
                    </button>
                    <button 
                        onClick={loadHistory}
                        className="h-12 w-12 flex items-center justify-center bg-slate-200 dark:bg-slate-800 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Analytics Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'Revenue', val: stats.revenue.toLocaleString('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }), icon: TrendingUp, color: 'text-brand-500', bg: 'bg-brand-50' },
                    { label: 'Weight', val: `${stats.weight} KG`, icon: Scale, color: 'text-orange-500', bg: 'bg-orange-50' },
                    { label: 'Boxes', val: stats.boxes, icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'Shipments', val: stats.count, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className={`absolute right-2 top-2 p-2 ${stat.bg} dark:bg-opacity-10 rounded-lg ${stat.color}`}>
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">{stat.label}</div>
                        <div className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100">{stat.val}</div>
                    </div>
                ))}
            </div>

            <div className="mb-6">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search invoices, names, or dates..." 
                        className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-500" />
                    <p className="animate-pulse font-bold uppercase tracking-widest text-xs">Accessing Cloud Archive...</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <h3 className="text-lg font-bold text-slate-700">No Records Found</h3>
                        </div>
                    ) : (
                        filteredHistory.map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded">
                                            {item.invoiceNo}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">{item.date}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {item.consName} <ArrowRight className="inline w-4 h-4 text-slate-300 mx-1" /> <span className="text-brand-600">{item.country}</span>
                                    </h3>
                                    <p className="text-sm text-slate-500">Sender: {item.senderName}</p>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between border-t md:border-t-0 pt-4 md:pt-0">
                                    <div className="text-right">
                                        <div className="text-xl font-black">
                                            {Number(item.grandTotal).toLocaleString('en-LK', {style: 'currency', currency: 'LKR', maximumFractionDigits: 0})}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedInvoice(item)}
                                        className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-brand-600 transition-colors"
                                    >
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal for detail viewing... */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-black">INVOICE #{selectedInvoice.invoiceNo}</h2>
                            <button onClick={() => setSelectedInvoice(null)}><X /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Weight</label>
                                    <div className="font-bold">{selectedInvoice.chgWt} KG</div>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Service</label>
                                    <div className="font-bold">{selectedInvoice.service}</div>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl">
                                <p className="text-sm"><strong>From:</strong> {selectedInvoice.senderName} ({selectedInvoice.senderPh})</p>
                                <p className="text-sm"><strong>To:</strong> {selectedInvoice.consName} - {selectedInvoice.consAddr}</p>
                            </div>
                        </div>
                        <div className="p-6 border-t flex gap-3">
                            <button onClick={() => handleWhatsApp(selectedInvoice)} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><MessageCircle size={18}/> WhatsApp</button>
                            <button onClick={() => onRestore(selectedInvoice)} className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Download size={18}/> PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};