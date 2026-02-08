import React from 'react';
import { AppState, RateResult } from '../types';
import { X, Check, Loader2, ArrowRight } from 'lucide-react';

interface PreviewModalProps {
    data: AppState;
    calculation: RateResult;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ data, calculation, onConfirm, onCancel, isProcessing }) => {
    const vacTotal = data.vacQty * data.vacPrice;
    const boxTotal = data.boxQty * data.boxPrice;
    const grandTotal = calculation.total + vacTotal + boxTotal + data.insurance;
    const balance = grandTotal - data.amountPaid;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Confirm Details</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Please verify all information before printing</p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    
                    {/* Route & Weight */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 bg-brand-50 dark:bg-brand-900/10 p-5 rounded-xl border border-brand-100 dark:border-brand-900/30 flex justify-between items-center">
                            <div>
                                <div className="text-[10px] uppercase font-bold text-brand-600/70 dark:text-brand-400/70 mb-1">Destination</div>
                                <div className="text-2xl font-black text-brand-700 dark:text-brand-300">{data.country}</div>
                                <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/50 text-brand-600 mt-1">{data.service}</div>
                            </div>
                            <div className="text-right">
                                 <div className="text-[10px] uppercase font-bold text-brand-600/70 dark:text-brand-400/70 mb-1">Weight</div>
                                 <div className="text-3xl font-black text-brand-700 dark:text-brand-300">{calculation.chgWt} <span className="text-lg">KG</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Parties Grid */}
                    <div className="grid md:grid-cols-2 gap-6 relative">
                        {/* Connector Line (Desktop) */}
                        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800 z-10">
                            <h3 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-wider">Sender</h3>
                            <div className="space-y-1">
                                <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{data.senderName}</p>
                                <p className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 inline-block">{data.senderPh}</p>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-100 dark:border-slate-800 z-10">
                            <h3 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-wider">Consignee</h3>
                            <div className="space-y-1">
                                <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{data.consName}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{data.consPh}</p>
                                {data.consEmail && <p className="text-xs text-slate-500 dark:text-slate-500">{data.consEmail}</p>}
                                <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                    {data.consAddr}<br/>
                                    {data.consCity}, {data.consZip}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-slate-900 dark:bg-black text-white rounded-xl p-6 shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
                         
                         <div className="relative z-10 space-y-3">
                             <div className="flex justify-between text-sm text-slate-300">
                                 <span>Freight Charges</span>
                                 <span className="font-bold">{calculation.total.toLocaleString('en-LK', {minimumFractionDigits: 2})}</span>
                             </div>
                             {(vacTotal > 0 || boxTotal > 0) && (
                                 <div className="flex justify-between text-sm text-slate-300">
                                    <span>Packing Charges</span>
                                    <span className="font-bold">{(vacTotal + boxTotal).toLocaleString('en-LK', {minimumFractionDigits: 2})}</span>
                                </div>
                             )}
                             {data.insurance > 0 && (
                                <div className="flex justify-between text-sm text-slate-300">
                                    <span>Insurance</span>
                                    <span className="font-bold">{data.insurance.toLocaleString('en-LK', {minimumFractionDigits: 2})}</span>
                                </div>
                             )}
                             
                             <div className="border-t border-white/10 my-3 pt-3 flex justify-between items-center">
                                 <span className="font-black text-xl uppercase tracking-tight">Grand Total</span>
                                 <span className="font-black text-3xl text-brand-400">{grandTotal.toLocaleString('en-LK', {style: 'currency', currency: 'LKR'})}</span>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4 pt-2">
                                 <div className="bg-white/10 rounded-lg p-2 px-3">
                                     <div className="text-[10px] uppercase font-bold text-slate-400">Paid ({data.payMethod})</div>
                                     <div className="text-lg font-bold text-green-400">{data.amountPaid.toLocaleString('en-LK', {minimumFractionDigits: 2})}</div>
                                 </div>
                                 <div className="bg-white/10 rounded-lg p-2 px-3 border border-red-500/30">
                                     <div className="text-[10px] uppercase font-bold text-red-300">Balance Due</div>
                                     <div className="text-lg font-bold text-red-400">{balance.toLocaleString('en-LK', {minimumFractionDigits: 2})}</div>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex gap-4">
                    <button 
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1 py-3.5 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Review Again
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="flex-[2] py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                <span>CONFIRM INVOICE</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};