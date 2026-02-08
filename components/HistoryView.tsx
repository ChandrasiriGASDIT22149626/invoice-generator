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
            const sorted = data.sort((a, b) => {
                if (a.invoiceNo && b.invoiceNo) {
                    return b.invoiceNo.localeCompare(a.invoiceNo);
                }
                return 0;
            });
            setHistory(sorted);
        } catch (e) {
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const term = searchTerm.toLowerCase();
            return (
                (item.invoiceNo?.toLowerCase().includes(term)) ||
                (item.consName?.toLowerCase().includes(term)) ||
                (item.senderPh?.toLowerCase().includes(term)) ||
                (item.senderName?.toLowerCase().includes(term)) ||
                (item.country?.toLowerCase().includes(term)) ||
                (item.date?.toLowerCase().includes(term))
            );
        });
    }, [history, searchTerm]);

    // Analytics Calculation
    const stats = useMemo(() => {
        return filteredHistory.reduce((acc, curr) => ({
            revenue: acc.revenue + (curr.grandTotal || 0),
            weight: acc.weight + (curr.chgWt || 0),
            boxes: acc.boxes + (curr.totalBoxes || 0),
            count: acc.count + 1
        }), { revenue: 0, weight: 0, boxes: 0, count: 0 });
    }, [filteredHistory]);

    // Export to CSV Logic
    const handleExportCSV = () => {
        const headers = ['Date', 'Invoice No', 'Sender', 'Sender Ph', 'Consignee', 'Cons Email', 'Country', 'Weight (Kg)', 'Boxes', 'Total (LKR)', 'Paid', 'Balance'];
        const rows = filteredHistory.map(item => [
            item.date,
            item.invoiceNo,
            `"${item.senderName}"`, // Quote strings to handle commas
            item.senderPh,
            `"${item.consName}"`,
            item.consEmail || '', // Added Email
            item.country,
            item.chgWt,
            item.totalBoxes,
            item.grandTotal,
            item.amountPaid,
            item.balanceDue
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `GGX_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleWhatsApp = (invoice: HistoryEntry) => {
        const val = invoice.senderPh;
        const rawPhone = (val !== null && val !== undefined) ? String(val) : '';
        let phone = rawPhone.replace(/[^0-9]/g, '');

        if (phone.startsWith('0')) {
            phone = '94' + phone.substring(1);
        } else if (phone.length === 9) {
            phone = '94' + phone;
        }

        const grandTotal = invoice.grandTotal || 0;
        const paid = invoice.amountPaid || 0;
        const balance = invoice.balanceDue || (grandTotal - paid);

        const message = `*GO GLOBAL EXPRESS INVOICE (COPY)*\n\n` +
            `Invoice No: ${invoice.invoiceNo || '---'}\n` +
            `Date: ${invoice.date || '---'}\n\n` +
            `*Customer:* ${invoice.senderName}\n` +
            `*Consignee:* ${invoice.consName} (${invoice.country})\n\n` +
            `*Shipment Details:*\n` +
            `Weight: ${invoice.chgWt} KG\n` +
            `Boxes: ${invoice.totalBoxes}\n\n` +
            `*TOTAL: LKR ${grandTotal.toLocaleString('en-LK', {minimumFractionDigits: 2})}*\n` +
            `Paid: LKR ${paid.toLocaleString('en-LK', {minimumFractionDigits: 2})}\n` +
            `Due: LKR ${balance.toLocaleString('en-LK', {minimumFractionDigits: 2})}\n\n` +
            `Thank you for shipping with us!\n` +
            `Hotline: 077 468 9388`;

        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Invoice History</h1>
                    <p className="text-slate-500 text-sm mt-1">Archive & Business Intelligence</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportCSV}
                        className="h-12 px-4 flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
                        title="Download as Excel/CSV"
                    >
                        <Table className="w-4 h-4" />
                        <span className="hidden md:inline">Export List</span>
                    </button>
                    <button 
                        onClick={loadHistory}
                        className="h-12 w-12 flex items-center justify-center bg-slate-200 dark:bg-slate-800 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                        title="Refresh History"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Analytics Dashboard (Live Stats) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-2 top-2 p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-500 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Revenue</div>
                    <div className="text-lg md:text-2xl font-black text-slate-800 dark:text-slate-100">
                        {stats.revenue.toLocaleString('en-LK', {style: 'currency', currency: 'LKR', maximumFractionDigits: 0})}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">Based on filtered view</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-2 top-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-500 group-hover:scale-110 transition-transform">
                        <Scale className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Weight</div>
                    <div className="text-lg md:text-2xl font-black text-slate-800 dark:text-slate-100">
                        {stats.weight.toLocaleString()} <span className="text-sm text-slate-400 font-bold">KG</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">Actual billable weight</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-2 top-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-500 group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Boxes</div>
                    <div className="text-lg md:text-2xl font-black text-slate-800 dark:text-slate-100">
                        {stats.boxes}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">Packages handled</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-2 top-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Shipments</div>
                    <div className="text-lg md:text-2xl font-black text-slate-800 dark:text-slate-100">
                        {stats.count}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1">Total invoices found</div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                 <div className="relative w-full">
                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by Invoice No, Name, Phone, or Date (YYYY-MM-DD)..." 
                        className="w-full h-12 pl-10 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all shadow-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-500" />
                    <p className="animate-pulse">Syncing with Cloud Database...</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
                            {hasError ? (
                                <div className="max-w-md mx-auto">
                                    <div className="inline-flex p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                                        <AlertTriangle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Connection Issue</h3>
                                    <p className="text-slate-500 mb-4">Could not fetch invoices. This usually happens if the Google Script permission is not set to "Anyone".</p>
                                </div>
                            ) : (
                                <div className="max-w-md mx-auto">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No Invoices Found</h3>
                                    <p className="text-slate-500 text-sm mb-6">If you have data in your Google Sheet but don't see it here, please update your Apps Script with the latest V5 code (see services/mockService.ts).</p>
                                    <button 
                                        onClick={loadHistory}
                                        className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg text-sm transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        filteredHistory.map((item, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all group flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-mono text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                            {item.invoiceNo || 'PENDING'}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase">{item.date}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        {item.consName} 
                                        <ArrowRight className="w-4 h-4 text-slate-400" /> 
                                        <span className="text-brand-600 dark:text-brand-400">{item.country}</span>
                                    </h3>
                                    <div className="text-sm text-slate-500 mt-1">
                                        Sender: <span className="font-semibold">{item.senderName}</span> ({item.senderPh})
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-4 md:pt-0">
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white">
                                            {(item.grandTotal || 0).toLocaleString('en-LK', {style: 'currency', currency: 'LKR'})}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedInvoice(item)}
                                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Details Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">INVOICE DETAILS</h2>
                                <p className="text-sm font-mono text-brand-600 dark:text-brand-400 font-bold">{selectedInvoice.invoiceNo}</p>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-red-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            {/* Breakdown Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Freight</div>
                                    <div className="font-black text-slate-800 dark:text-slate-200">
                                        {(selectedInvoice.total || 0).toLocaleString('en-LK', {minimumFractionDigits: 2})}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Packing</div>
                                    <div className="font-black text-slate-800 dark:text-slate-200">
                                        {((selectedInvoice.vacQty * selectedInvoice.vacPrice) + (selectedInvoice.boxQty * selectedInvoice.boxPrice) || 0).toLocaleString('en-LK', {minimumFractionDigits: 2})}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Insurance</div>
                                    <div className="font-black text-slate-800 dark:text-slate-200">
                                        {(selectedInvoice.insurance || 0).toLocaleString('en-LK', {minimumFractionDigits: 2})}
                                    </div>
                                </div>
                                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-900/30">
                                    <div className="text-xs text-brand-600 dark:text-brand-400 uppercase font-bold mb-1">Grand Total</div>
                                    <div className="font-black text-brand-700 dark:text-brand-300">
                                        {(selectedInvoice.grandTotal || 0).toLocaleString('en-LK', {minimumFractionDigits: 2})}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Customer Info */}
                            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl">
                                <h3 className="text-xs font-black uppercase text-slate-400 mb-2">Customer & Consignee</h3>
                                <p className="text-sm mb-1"><span className="font-bold">From:</span> {selectedInvoice.senderName} ({selectedInvoice.senderPh})</p>
                                <p className="text-sm"><span className="font-bold">To:</span> {selectedInvoice.consName}</p>
                                <p className="text-xs text-slate-500 mt-1 ml-6">{selectedInvoice.consAddr}, {selectedInvoice.consCity}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => handleWhatsApp(selectedInvoice)}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Resend WhatsApp
                            </button>
                            <button 
                                onClick={() => onRestore(selectedInvoice)}
                                className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-900/20"
                            >
                                <Download className="w-5 h-5" />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};