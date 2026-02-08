import React, { useRef, useState, useEffect } from 'react';
import { AppState, RateResult, LineItem } from '../types';
import { findCustomer } from '../services/mockService';
import { extractShipmentDetails } from '../services/aiService';
import { getAvailableCountries } from '../services/rateEngine';
import { Plus, Trash2, Package, MapPin, Calculator, Camera, Loader2, Sparkles, Globe, Printer, Box, Upload, ScanLine, RotateCcw } from 'lucide-react';

interface FormViewProps {
    data: AppState;
    onChange: (field: keyof AppState, value: any) => void;
    onBulkChange: (updates: Partial<AppState>) => void;
    calculation: RateResult;
    onGenerate: () => void;
    onClear: () => void;
    isProcessing: boolean;
}

export const FormView: React.FC<FormViewProps> = ({ data, onChange, onBulkChange, calculation, onGenerate, onClear, isProcessing }) => {
    const senderNameRef = useRef<HTMLInputElement>(null);
    const senderPhRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [availableCountries, setAvailableCountries] = useState<string[]>([]);

    useEffect(() => {
        const countries = getAvailableCountries();
        setAvailableCountries(countries);
        if (senderNameRef.current) {
            senderNameRef.current.focus();
        }
    }, []);

    // Global Paste Listener for Smart Scan
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const file = e.clipboardData?.files?.[0];
            if (file && file.type.startsWith('image/')) {
                processFile(file);
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [isAnalyzing]); // Re-bind if analyzing state changes to prevent double submission

    const processFile = async (file: File) => {
        if (isAnalyzing) return;
        
        setIsAnalyzing(true);
        setIsDragging(false);

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                const base64Data = base64String.split(',')[1];
                const mimeType = file.type;

                try {
                    const updates = await extractShipmentDetails(base64Data, mimeType);
                    onBulkChange(updates);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } catch (err) {
                    alert("Failed to analyze image. Please try again.");
                } finally {
                    setIsAnalyzing(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error(error);
            setIsAnalyzing(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Only disable if we are leaving the main container
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    };

    const updateItem = (index: number, field: keyof LineItem, value: any) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        onChange('items', newItems);
    };

    const addItem = () => {
        onChange('items', [...data.items, { id: Date.now().toString(), description: '', qty: 1 }]);
    };

    const removeItem = (index: number) => {
        if (data.items.length === 1) return;
        const newItems = data.items.filter((_, i) => i !== index);
        onChange('items', newItems);
    };

    const handleCustomerLookup = async () => {
        const phone = data.senderPh ? String(data.senderPh) : '';
        if (phone.length > 5) {
            const name = await findCustomer(phone);
            if (name) onChange('senderName', name);
        }
    };

    const validateAndSubmit = () => {
        const errors: string[] = [];
        if (!data.country) errors.push("Destination Country");
        if (!data.service) errors.push("Service Type");
        if (!data.actWt || data.actWt <= 0) errors.push("Actual Weight");
        if (!data.senderName) errors.push("Sender Name");
        if (!data.senderPh) errors.push("Sender Phone (WhatsApp)");
        if (!data.consName) errors.push("Consignee Name");
        if (!data.consPh) errors.push("Consignee Phone");
        if (!data.consAddr) errors.push("Consignee Address");
        if (!data.consZip) errors.push("Consignee Zip Code");

        if (errors.length > 0) {
            alert(`MISSING MANDATORY FIELDS:\n\n• ${errors.join('\n• ')}`);
            return;
        }

        onGenerate();
    };

    const setZipNA = () => onChange('consZip', '00000');

    const vacTotal = data.vacQty * data.vacPrice;
    const boxTotal = data.boxQty * data.boxPrice;
    const grandTotal = calculation.total + vacTotal + boxTotal + data.insurance;

    // Stylistic constants
    const cardClass = "bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md";
    const sectionHeaderClass = "flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800";
    const sectionTitleClass = "text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight";
    const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1";
    const inputWrapperClass = "relative";
    const inputClass = "w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";
    const selectClass = `${inputClass} appearance-none cursor-pointer bg-[url('https://api.iconify.design/lucide/chevron-down.svg?color=%2394a3b8')] bg-no-repeat bg-[right_1rem_center] bg-[length:1.25em]`;

    return (
        <div 
            className="space-y-6 pb-24 relative min-h-[500px]"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-brand-500/10 backdrop-blur-sm border-4 border-dashed border-brand-500/50 rounded-3xl flex flex-col items-center justify-center text-brand-600 dark:text-brand-400 animate-in fade-in duration-200 pointer-events-none">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-full shadow-2xl mb-4">
                        <Upload className="w-16 h-16 animate-bounce" />
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tight drop-shadow-sm">Drop Image to Scan</h3>
                    <p className="font-bold opacity-75 mt-2">Supports Shipping Labels & Invoices</p>
                </div>
            )}
            
            {/* AI Action Bar */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                    <ScanLine className="w-4 h-4" />
                    <span>Drop image or Paste (Ctrl+V) anywhere</span>
                </div>
                <div>
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzing}
                        className="group flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white pl-4 pr-5 py-2.5 rounded-full font-bold text-sm shadow-lg hover:shadow-brand-500/25 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Scanning Image...</span>
                            </>
                        ) : (
                            <>
                                <div className="bg-white/20 p-1.5 rounded-full group-hover:scale-110 transition-transform">
                                    <Camera className="w-4 h-4" />
                                </div>
                                <span>Smart Scan</span>
                                <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 1. Shipment Section */}
            <section className={cardClass}>
                <div className={sectionHeaderClass}>
                    <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-600 dark:text-brand-400">
                        <Globe className="w-5 h-5" />
                    </div>
                    <h2 className={sectionTitleClass}>1. Shipment Details</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Destination <span className="text-red-500">*</span></label>
                        <input 
                            list="countries" 
                            className={`${inputClass} ${!data.country ? 'border-orange-300 dark:border-orange-900/50' : ''}`}
                            placeholder="Type or select country..."
                            value={data.country || ''}
                            onChange={(e) => onChange('country', e.target.value)}
                        />
                        <datalist id="countries">
                            {availableCountries.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className={labelClass}>Service Level <span className="text-red-500">*</span></label>
                        <select 
                            className={selectClass}
                            value={data.service}
                            onChange={(e) => onChange('service', e.target.value)}
                        >
                            <option value="EXPRESS">EXPRESS (Priority)</option>
                            <option value="ECONOMY">ECONOMY (Standard)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Actual Weight (KG) <span className="text-red-500">*</span></label>
                        <input 
                            type="number" 
                            className={`${inputClass} font-mono`}
                            value={data.actWt || ''}
                            onChange={(e) => onChange('actWt', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Volumetric Weight (KG)</label>
                        <input 
                            type="number" 
                            className={`${inputClass} font-mono`}
                            value={data.volWt || ''}
                            onChange={(e) => onChange('volWt', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                </div>
                
                {/* Rate Preview Card */}
                <div className="mt-6 bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                            <Calculator className="w-5 h-5" />
                         </div>
                         <div>
                             <div className="text-xs font-bold text-slate-500 uppercase">Chargeable Weight</div>
                             <div className="text-lg font-black text-slate-800 dark:text-slate-200">{calculation.chgWt} KG</div>
                         </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-500 uppercase">Base Rate</div>
                        <div className="text-xl font-black text-brand-600 dark:text-brand-400">
                            {(calculation.total).toLocaleString('en-LK', {style: 'currency', currency: 'LKR'})}
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Customer Section */}
            <section className={cardClass}>
                <div className={sectionHeaderClass}>
                    <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-600 dark:text-brand-400">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <h2 className={sectionTitleClass}>2. Customer Info</h2>
                </div>

                <div className="space-y-6">
                    {/* Sender */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-400"></div> Sender Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Sender Name <span className="text-red-500">*</span></label>
                                <input 
                                    ref={senderNameRef}
                                    className={inputClass}
                                    value={data.senderName || ''}
                                    onChange={(e) => onChange('senderName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>WhatsApp Number <span className="text-red-500">*</span></label>
                                <input 
                                    ref={senderPhRef}
                                    type="tel" 
                                    className={inputClass}
                                    placeholder="9477..."
                                    value={data.senderPh || ''}
                                    onChange={(e) => onChange('senderPh', e.target.value)}
                                    onBlur={handleCustomerLookup}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Consignee */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h3 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div> Consignee Details
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                                <input 
                                    className={inputClass}
                                    value={data.consName || ''}
                                    onChange={(e) => onChange('consName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                                <input 
                                    type="tel"
                                    className={inputClass}
                                    value={data.consPh || ''}
                                    onChange={(e) => onChange('consPh', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelClass}>Email Address <span className="text-slate-400 font-normal normal-case ml-1">(Optional)</span></label>
                                <input 
                                    type="email"
                                    className={inputClass}
                                    placeholder="example@email.com"
                                    value={data.consEmail || ''}
                                    onChange={(e) => onChange('consEmail', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>Street Address <span className="text-red-500">*</span></label>
                                <input 
                                    className={inputClass}
                                    value={data.consAddr || ''}
                                    onChange={(e) => onChange('consAddr', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>City</label>
                                    <input 
                                        className={inputClass}
                                        value={data.consCity || ''}
                                        onChange={(e) => onChange('consCity', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Zip Code <span className="text-red-500">*</span></label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="tel"
                                            className={`${inputClass} font-mono`}
                                            value={data.consZip || ''}
                                            onChange={(e) => onChange('consZip', e.target.value)}
                                        />
                                        <button 
                                            onClick={setZipNA}
                                            className="px-4 bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                                            title="Auto-fill 00000"
                                        >
                                            N/A
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

             {/* 3. Items Section */}
             <section className={cardClass}>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-600 dark:text-brand-400">
                            <Package className="w-5 h-5" />
                        </div>
                        <h2 className={sectionTitleClass}>3. Items & Packing</h2>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">Box Count</span>
                         <input 
                            type="number"
                            className="w-12 h-8 text-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-sm font-bold text-slate-900 dark:text-white"
                            value={data.totalBoxes}
                            onChange={(e) => onChange('totalBoxes', parseInt(e.target.value) || 1)}
                         />
                    </div>
                </div>
                
                <div className="space-y-3">
                    {data.items.map((item, idx) => (
                        <div key={item.id} className="flex gap-3 group">
                             <div className="flex-1">
                                <input 
                                    className={`${inputClass} bg-white dark:bg-slate-950`}
                                    placeholder={`Item #${idx + 1} Description`}
                                    value={item.description}
                                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                />
                             </div>
                             <div className="w-24">
                                <input 
                                    type="number"
                                    className={`${inputClass} text-center bg-white dark:bg-slate-950`}
                                    placeholder="Qty"
                                    value={item.qty}
                                    onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value))}
                                />
                             </div>
                             {data.items.length > 1 && (
                                <button 
                                    onClick={() => removeItem(idx)} 
                                    className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ))}
                    <button 
                        onClick={addItem}
                        className="w-full h-11 mt-2 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-center items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Another Item
                    </button>
                </div>
            </section>

            {/* 4. Charges Section */}
            <section className={cardClass}>
                <div className={sectionHeaderClass}>
                    <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-600 dark:text-brand-400">
                        <Box className="w-5 h-5" />
                    </div>
                    <h2 className={sectionTitleClass}>4. Additional Charges</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Vacuum */}
                    <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                         <h3 className={labelClass}>Vacuum Service</h3>
                         <div className="flex gap-3 mt-3">
                             <div className="w-24">
                                 <input type="number" placeholder="Qty" className={`${inputClass} text-center bg-white dark:bg-slate-950`} value={data.vacQty || ''} onChange={e => onChange('vacQty', parseFloat(e.target.value)||0)} />
                             </div>
                             <div className="flex-1 relative">
                                <span className="absolute left-3 top-3 text-slate-400 text-xs font-bold">LKR</span>
                                <input type="number" placeholder="Unit Price" className={`${inputClass} pl-12 text-right bg-white dark:bg-slate-950`} value={data.vacPrice || ''} onChange={e => onChange('vacPrice', parseFloat(e.target.value)||0)} />
                             </div>
                         </div>
                    </div>
                    
                    {/* Box Charge */}
                    <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                         <h3 className={labelClass}>Box Charge</h3>
                         <div className="flex gap-3 mt-3">
                             <div className="w-24">
                                 <input type="number" placeholder="Qty" className={`${inputClass} text-center bg-white dark:bg-slate-950`} value={data.boxQty || ''} onChange={e => onChange('boxQty', parseFloat(e.target.value)||0)} />
                             </div>
                             <div className="flex-1 relative">
                                <span className="absolute left-3 top-3 text-slate-400 text-xs font-bold">LKR</span>
                                <input type="number" placeholder="Unit Price" className={`${inputClass} pl-12 text-right bg-white dark:bg-slate-950`} value={data.boxPrice || ''} onChange={e => onChange('boxPrice', parseFloat(e.target.value)||0)} />
                             </div>
                         </div>
                    </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                         <label className={labelClass}>Insurance Premium</label>
                         <div className="relative">
                            <span className="absolute left-3 top-3 text-slate-400 text-xs font-bold">LKR</span>
                            <input type="number" className={`${inputClass} pl-12 font-mono`} value={data.insurance || ''} onChange={e => onChange('insurance', parseFloat(e.target.value)||0)} />
                         </div>
                    </div>
                    <div>
                        <label className={labelClass}>Payment Method</label>
                        <select className={selectClass} value={data.payMethod} onChange={e => onChange('payMethod', e.target.value)}>
                            <option>Cash</option>
                            <option>Card</option>
                            <option>Credit</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-6 z-10">
                <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
                    <div className="flex-1 w-full md:w-auto">
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Amount</div>
                            <div className="text-3xl font-black tracking-tight">
                                {grandTotal.toLocaleString('en-LK', {style: 'currency', currency: 'LKR'})}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                placeholder="Enter Amount Paid"
                                className="w-full bg-slate-800 dark:bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                                value={data.amountPaid || ''}
                                onChange={(e) => onChange('amountPaid', parseFloat(e.target.value)||0)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button 
                            onClick={onClear}
                            className="p-4 bg-slate-800 hover:bg-red-900/80 border border-slate-700 hover:border-red-700 text-slate-300 hover:text-white rounded-xl transition-colors active:scale-95 group"
                            title="Reset Form"
                         >
                            <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
                         </button>
                        <button 
                            onClick={validateAndSubmit}
                            disabled={isProcessing}
                            className="flex-1 md:flex-none w-full md:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="animate-spin w-5 h-5" />
                                    <span>PROCESSING...</span>
                                </>
                            ) : (
                                <>
                                    <Printer className="w-5 h-5" />
                                    <span>GENERATE INVOICE</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};