import React, { useRef, useState, useEffect } from 'react';
import { AppState, RateResult } from '../types';
import { ArrowLeft, Loader2, Wand2, Download, ArrowRight, CheckCircle2, StickyNote } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { INVOICE_LOGO_URL, INVOICE_QR_URL, SIGNATURE_URL } from '../constants';

interface InvoiceViewProps {
    data: AppState;
    calculation: RateResult;
    onBack: () => void;
    onNew: () => void;
    autoPrint?: boolean;
    onAutoComplete?: () => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ data, calculation, onBack, onNew, autoPrint, onAutoComplete }) => {
    const invoiceRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLabelPrinting, setIsLabelPrinting] = useState(false);
    const [whatsappBlocked, setWhatsappBlocked] = useState(false);
    const [zoomScale, setZoomScale] = useState(1);
    
    const vacTotal = data.vacQty * data.vacPrice;
    const boxTotal = data.boxQty * data.boxPrice;
    const packingCharges = vacTotal + boxTotal;
    const grandTotal = calculation.total + packingCharges + data.insurance;
    const balance = grandTotal - data.amountPaid;

    // Table padding logic
    const MIN_ROWS = 8;
    const filledRowsCount = data.items.length;
    const emptyRowsCount = Math.max(0, MIN_ROWS - filledRowsCount);
    const emptyRows = new Array(emptyRowsCount).fill(null);

    // Responsive Scale Logic for Mobile Preview
    useEffect(() => {
        const handleResize = () => {
            const viewportWidth = window.innerWidth;
            const targetWidth = 850; 
            if (viewportWidth < targetWidth) {
                const scale = (viewportWidth - 20) / 794; 
                setZoomScale(scale);
            } else {
                setZoomScale(1);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Automation Sequence
    useEffect(() => {
        if (autoPrint) {
            const executeAutoSequence = async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await performDownloadPDF();
                const opened = performWhatsAppTrigger();
                if (opened && onAutoComplete) {
                    setTimeout(onAutoComplete, 1500);
                }
            };
            executeAutoSequence();
        }
    }, [autoPrint]);

    const performDownloadPDF = async () => {
        if (!invoiceRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 3, 
                useCORS: true, // Crucial for external logos
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`GGX_Invoice_${data.invoiceNo}.pdf`);
        } catch (error) {
            console.error("PDF Generation failed:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const performPrintLabel = async () => {
        if (!labelRef.current) return;
        setIsLabelPrinting(true);
        try {
            const canvas = await html2canvas(labelRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', [101.6, 152.4]); // Exact 4x6 inch
            pdf.addImage(imgData, 'PNG', 0, 0, 101.6, 152.4);
            pdf.save(`GGX_Label_${data.invoiceNo}.pdf`);
        } catch (error) {
            console.error("Label Generation failed:", error);
        } finally {
            setIsLabelPrinting(false);
        }
    };

    const performWhatsAppTrigger = () => {
        try {
            let phone = String(data.senderPh || '').replace(/[^0-9]/g, '');
            if (phone.startsWith('0')) phone = '94' + phone.substring(1);
            else if (phone.length === 9) phone = '94' + phone;

            const message = `*GO GLOBAL EXPRESS INVOICE*\n\n` +
                `Invoice No: ${data.invoiceNo}\n` +
                `Date: ${new Date().toISOString().split('T')[0]}\n\n` +
                `*Consignee:* ${data.consName} (${data.country})\n` +
                `*Weight:* ${calculation.chgWt} KG\n` +
                `*TOTAL: LKR ${grandTotal.toLocaleString('en-LK')}*\n\n` +
                `Hotline: 077 468 9388`;
            
            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            const win = window.open(waUrl, '_blank');
            if (!win) {
                setWhatsappBlocked(true);
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen py-8 print:p-0 print:bg-white">
             {/* Toolbar */}
             {!autoPrint && (
                 <div className="print:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white/90 backdrop-blur p-2 rounded-2xl shadow-2xl border border-slate-200">
                    <button onClick={onBack} className="p-3 hover:bg-slate-100 rounded-xl flex flex-col items-center gap-1">
                        <ArrowLeft size={20} />
                        <span className="text-[10px] font-bold">EDIT</span>
                    </button>
                    <button onClick={performDownloadPDF} disabled={isDownloading} className="p-3 text-brand-600 hover:bg-brand-50 rounded-xl flex flex-col items-center gap-1">
                        {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                        <span className="text-[10px] font-bold">SAVE PDF</span>
                    </button>
                    <button onClick={performPrintLabel} disabled={isLabelPrinting} className="p-3 text-orange-600 hover:bg-orange-50 rounded-xl flex flex-col items-center gap-1">
                        {isLabelPrinting ? <Loader2 className="animate-spin" size={20} /> : <StickyNote size={20} />}
                        <span className="text-[10px] font-bold">LABEL</span>
                    </button>
                    <button onClick={performWhatsAppTrigger} className="p-3 text-green-600 hover:bg-green-50 rounded-xl flex flex-col items-center gap-1">
                        <Wand2 size={20} />
                        <span className="text-[10px] font-bold">WHATSAPP</span>
                    </button>
                    <button onClick={onNew} className="p-3 text-red-600 hover:bg-red-50 rounded-xl flex flex-col items-center gap-1">
                        <div className="font-bold">+</div>
                        <span className="text-[10px] font-bold">NEW</span>
                    </button>
                 </div>
             )}

             {/* WhatsApp Blocked Modal */}
             {whatsappBlocked && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur flex items-center justify-center p-6">
                    <div className="bg-white p-8 rounded-3xl max-w-sm text-center shadow-2xl">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold">Invoice Ready!</h2>
                        <p className="text-slate-500 my-4 text-sm">Popup was blocked. Click below to open WhatsApp manually.</p>
                        <button onClick={() => { performWhatsAppTrigger(); setWhatsappBlocked(false); }} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold">Open WhatsApp</button>
                    </div>
                </div>
             )}

            {/* Hidden Label (4x6) */}
            <div className="fixed -left-[9999px]">
                <div ref={labelRef} style={{ width: '101.6mm', height: '152.4mm' }} className="bg-white p-6 border flex flex-col">
                    <div className="bg-black text-white p-4 text-center text-3xl font-black mb-4">{data.service}</div>
                    <div className="border-4 border-black p-4 flex-1 rounded-lg">
                        <div className="text-xs font-bold uppercase text-gray-500">Deliver To:</div>
                        <div className="text-2xl font-black uppercase my-2">{data.consName}</div>
                        <p className="text-lg font-bold leading-tight">{data.consAddr}, {data.consCity}</p>
                        <div className="text-3xl font-black mt-4">{data.country.toUpperCase()}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="border-2 border-black p-2 text-center rounded">
                            <div className="text-xs font-bold">WEIGHT</div>
                            <div className="text-2xl font-black">{calculation.chgWt} KG</div>
                        </div>
                        <div className="border-2 border-black p-2 text-center rounded">
                            <div className="text-xs font-bold">BOXES</div>
                            <div className="text-2xl font-black">{data.totalBoxes}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* A4 Invoice Preview */}
            <div className="flex justify-center transition-transform" style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}>
                <div ref={invoiceRef} className="bg-white w-[210mm] min-h-[297mm] p-10 text-black shadow-lg">
                    {/* Header */}
                    <div className="flex justify-between border-b-2 border-black pb-6 mb-6">
                        <img src={INVOICE_LOGO_URL} crossOrigin="anonymous" className="h-32 object-contain" />
                        <div className="text-center">
                            <h1 className="text-3xl font-black text-blue-900">GO GLOBAL EXPRESS</h1>
                            <p className="font-bold text-gray-500 tracking-widest">COURIERS</p>
                            <p className="text-[10px] mt-2 max-w-xs">{data.branch?.address}</p>
                            <p className="text-sm font-black">{data.branch?.phone}</p>
                        </div>
                        <img src={INVOICE_QR_URL} crossOrigin="anonymous" className="h-24 object-contain" />
                    </div>

                    {/* Metadata */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-xs font-bold">AWB: ............................</div>
                        <div className="bg-black text-white px-6 py-2 font-black tracking-widest">INVOICE</div>
                        <div className="text-right">
                            <div className="font-mono font-bold">NO: {data.invoiceNo}</div>
                            <div className="text-xs">Date: {new Date().toISOString().split('T')[0]}</div>
                        </div>
                    </div>

                    {/* Parties Table */}
                    <table className="w-full border-collapse mb-6 text-xs">
                        <tbody>
                            <tr>
                                <td className="border border-black p-2 bg-gray-100 font-bold w-32">SENDER</td>
                                <td className="border border-black p-2 font-bold">{data.senderName} ({data.senderPh})</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 bg-gray-100 font-bold">CONSIGNEE</td>
                                <td className="border border-black p-2 font-bold">{data.consName} | {data.consPh}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-2 bg-gray-100 font-bold">ADDRESS</td>
                                <td className="border border-black p-2">{data.consAddr}, {data.consCity}, {data.country} - {data.consZip}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Technical Weight Info */}
                    <div className="grid grid-cols-3 gap-4 mb-6 text-center text-xs font-bold">
                        <div className="border border-black p-2">ACTUAL WT: {data.actWt} KG</div>
                        <div className="border border-black p-2">VOL WT: {data.volWt} KG</div>
                        <div className="border border-black p-2 bg-gray-100">CHARGEABLE WT: {calculation.chgWt} KG</div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full border-collapse text-xs mb-6">
                        <thead>
                            <tr className="bg-gray-100 border border-black font-black">
                                <th className="border border-black p-2 w-12">#</th>
                                <th className="border border-black p-2 text-left">DESCRIPTION</th>
                                <th className="border border-black p-2 w-20">QTY</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item, i) => (
                                <tr key={item.id} className="font-bold">
                                    <td className="border border-black p-2 text-center">{i + 1}</td>
                                    <td className="border border-black p-2">{item.description}</td>
                                    <td className="border border-black p-2 text-center">{item.qty}</td>
                                </tr>
                            ))}
                            {emptyRows.map((_, i) => (
                                <tr key={i}><td className="border border-black p-3" colSpan={3}></td></tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Bottom Totals */}
                    <div className="flex border border-black mt-auto">
                        <div className="flex-1 p-4 border-r border-black text-[9px] font-bold">
                            <p className="font-black mb-2">TERMS & CONDITIONS:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>No responsibility for customs delays.</li>
                                <li>Return charges apply for incorrect addresses.</li>
                                <li>No dangerous goods/liquids accepted.</li>
                            </ul>
                        </div>
                        <div className="w-64 text-xs">
                            {[
                                { l: 'Freight Value', v: calculation.total + packingCharges },
                                { l: 'Insurance', v: data.insurance },
                                { l: 'GRAND TOTAL', v: grandTotal, bold: true, bg: 'bg-gray-100' },
                                { l: 'Advance Paid', v: data.amountPaid },
                                { l: 'BALANCE DUE', v: balance, bold: true }
                            ].map((row, i) => (
                                <div key={i} className={`flex justify-between p-2 border-b border-black last:border-0 ${row.bg}`}>
                                    <span className={row.bold ? 'font-black' : ''}>{row.l}</span>
                                    <span className="font-black">{Number(row.v).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between mt-12 px-10">
                        <div className="text-center w-48 border-t border-dotted border-black pt-2 text-[10px] font-bold">CUSTOMER SIGNATURE</div>
                        <div className="text-center w-48 relative border-t border-dotted border-black pt-2 text-[10px] font-bold">
                            <img src={SIGNATURE_URL} crossOrigin="anonymous" className="absolute -top-10 left-1/2 -translate-x-1/2 h-12 mix-blend-multiply" />
                            ISSUER SIGNATURE
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}