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

    const MIN_ROWS = 8;
    const filledRowsCount = data.items.length;
    const effectiveItemCount = filledRowsCount; 
    const emptyRowsCount = Math.max(0, MIN_ROWS - effectiveItemCount);
    const emptyRows = new Array(emptyRowsCount).fill(null);

    // Responsive Scale Logic
    useEffect(() => {
        const handleResize = () => {
            const viewportWidth = window.innerWidth;
            const targetWidth = 850; // A4 width (794px) + margin
            if (viewportWidth < targetWidth) {
                // Scale down to fit, leaving a small margin
                const scale = (viewportWidth - 20) / 794; 
                setZoomScale(scale);
            } else {
                setZoomScale(1);
            }
        };

        handleResize(); // Initial calculation
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (autoPrint) {
            const executeAutoSequence = async () => {
                await new Promise(resolve => setTimeout(resolve, 800));
                await performDownloadPDF();
                
                const opened = performWhatsAppTrigger();
                
                // If opened successfully, proceed to finish. 
                // If blocked, we wait for user manual action in the blocked UI.
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
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: 1200, 
                scrollX: 0,
                scrollY: 0,
                onclone: (documentClone) => {
                    const element = documentClone.querySelector('.invoice-container') as HTMLElement;
                    if (element) {
                        element.style.padding = '40px'; 
                        element.style.transform = 'none'; 
                    }
                }
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
            // 4x6 Inches = 101.6mm x 152.4mm
            const pdf = new jsPDF('p', 'mm', [100, 150]); 
            pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);
            pdf.save(`GGX_Label_${data.invoiceNo}.pdf`);
        } catch (error) {
            console.error("Label Generation failed:", error);
        } finally {
            setIsLabelPrinting(false);
        }
    };

    const getWhatsAppUrl = () => {
        const val = data.senderPh;
        const rawPhone = (val !== null && val !== undefined) ? String(val) : '';
        let phone = rawPhone.replace(/[^0-9]/g, '');

        if (phone.startsWith('0')) {
            phone = '94' + phone.substring(1);
        } else if (phone.length === 9) {
            phone = '94' + phone;
        }
        
        const message = `*GO GLOBAL EXPRESS INVOICE*\n\n` +
            `Invoice No: ${data.invoiceNo || '---'}\n` +
            `Date: ${new Date().toLocaleDateString()}\n\n` +
            `*Customer:* ${data.senderName}\n` +
            `*Consignee:* ${data.consName} (${data.country})\n\n` +
            `*Shipment Details:*\n` +
            `Weight: ${calculation.chgWt} KG\n` +
            `Boxes: ${data.totalBoxes}\n\n` +
            `*TOTAL: LKR ${grandTotal.toLocaleString('en-LK', {minimumFractionDigits: 2})}*\n` +
            `Paid: LKR ${data.amountPaid.toLocaleString('en-LK', {minimumFractionDigits: 2})}\n` +
            `Due: LKR ${balance.toLocaleString('en-LK', {minimumFractionDigits: 2})}\n\n` +
            `Thank you for shipping with us!\n` +
            `Hotline: 077 468 9388`;
        
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    };

    const performWhatsAppTrigger = () => {
        try {
            const waUrl = getWhatsAppUrl();
            const win = window.open(waUrl, '_blank');
            if (!win) {
                console.warn("WhatsApp popup blocked by browser.");
                setWhatsappBlocked(true);
                return false;
            }
            return true;
        } catch (error) {
            console.error("WhatsApp Error:", error);
            alert("Could not open WhatsApp. Please check the phone number.");
            return false;
        }
    };

    const handleManualWhatsApp = () => {
        performWhatsAppTrigger();
        setWhatsappBlocked(false);
        if (autoPrint && onAutoComplete) {
            setTimeout(onAutoComplete, 1000);
        }
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen transition-colors duration-200 py-8 print:p-0 print:m-0 print:bg-white print:min-h-0 print:h-auto print:overflow-visible">
             {/* Floating Toolbar */}
             {!autoPrint && (
                 <div className="print:hidden no-print fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-[90vw] md:w-auto overflow-x-auto">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between md:justify-center gap-2 animate-in slide-in-from-bottom-6 duration-500 mx-auto w-max">
                        <button onClick={onBack} className="flex flex-col items-center gap-1 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                            <ArrowLeft size={20} />
                            <span className="text-[10px] font-bold uppercase">Edit</span>
                        </button>
                        
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        <button onClick={performDownloadPDF} disabled={isDownloading} className="flex flex-col items-center gap-1 px-4 py-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-colors disabled:opacity-50">
                            {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />} 
                            <span className="text-[10px] font-bold uppercase">Save PDF</span>
                        </button>

                        <button onClick={performPrintLabel} disabled={isLabelPrinting} className="flex flex-col items-center gap-1 px-4 py-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-colors disabled:opacity-50">
                             {isLabelPrinting ? <Loader2 size={20} className="animate-spin" /> : <StickyNote size={20} />}
                             <span className="text-[10px] font-bold uppercase">Print Label</span>
                        </button>

                        <button onClick={() => performWhatsAppTrigger()} className="flex flex-col items-center gap-1 px-4 py-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors">
                            <Wand2 size={20} />
                            <span className="text-[10px] font-bold uppercase">WhatsApp</span>
                        </button>
                        
                        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        <button onClick={onNew} className="flex flex-col items-center gap-1 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                            <div className="font-black text-lg leading-none">+</div>
                            <span className="text-[10px] font-bold uppercase">New</span>
                        </button>
                    </div>
                </div>
             )}
             
             {/* Auto Print Loading Overlay */}
             {autoPrint && !whatsappBlocked && (
                 <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white print:hidden no-print">
                     <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md flex flex-col items-center">
                        <Loader2 className="w-12 h-12 animate-spin mb-4 text-brand-400" />
                        <h2 className="text-2xl font-bold tracking-tight">Processing Documents</h2>
                        <p className="text-slate-300 mt-2 text-sm font-medium">Generating PDF & Opening WhatsApp...</p>
                     </div>
                 </div>
             )}

             {/* WhatsApp Blocked Manual Action Modal */}
             {whatsappBlocked && (
                <div className="fixed inset-0 z-[80] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-300 print:hidden no-print">
                    <div className="bg-white/10 p-8 rounded-3xl border border-white/20 shadow-2xl max-w-sm w-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                            <CheckCircle2 className="w-10 h-10 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 relative z-10">Invoice Ready!</h2>
                        <p className="text-slate-300 mb-8 text-sm leading-relaxed relative z-10">
                            The PDF has been downloaded. Please click below to send the WhatsApp confirmation.
                        </p>
                        <button onClick={handleManualWhatsApp} className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-900/20 relative z-10">
                            Open WhatsApp
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
             )}

            {/* Hidden Container for 4x6 Label Generation */}
            <div className="fixed -left-[9999px] top-0 overflow-hidden">
                <div 
                    ref={labelRef} 
                    style={{ width: '100mm', height: '150mm' }} 
                    className="bg-white p-4 border flex flex-col box-border font-sans relative"
                >
                     {/* Header */}
                     <div className="bg-black text-white p-3 text-center mb-4">
                         <h1 className="text-3xl font-black uppercase tracking-widest">{data.service}</h1>
                     </div>
                     
                     {/* Zones */}
                     <div className="flex-1 flex flex-col gap-4">
                         {/* To Address */}
                         <div className="border-2 border-black p-3 rounded-lg flex-1">
                             <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Deliver To:</div>
                             <div className="text-xl font-bold uppercase leading-tight mb-2">{data.consName}</div>
                             <div className="text-sm font-semibold leading-snug">
                                 {data.consAddr}<br/>
                                 {data.consCity}, {data.consZip}<br/>
                                 <span className="font-black text-lg mt-1 block">{data.country.toUpperCase()}</span>
                             </div>
                             <div className="mt-2 pt-2 border-t border-gray-300 text-sm font-mono font-bold">
                                 Tel: {data.consPh}
                             </div>
                         </div>
                         
                         {/* Details Grid */}
                         <div className="grid grid-cols-2 gap-3 h-24">
                             <div className="border-2 border-black p-2 rounded-lg flex flex-col justify-center items-center text-center bg-gray-100">
                                 <div className="text-[10px] uppercase font-bold text-gray-500">Weight</div>
                                 <div className="text-3xl font-black">{calculation.chgWt} <span className="text-sm">KG</span></div>
                             </div>
                             <div className="border-2 border-black p-2 rounded-lg flex flex-col justify-center items-center text-center bg-gray-100">
                                 <div className="text-[10px] uppercase font-bold text-gray-500">Boxes</div>
                                 <div className="text-3xl font-black">{data.totalBoxes}</div>
                             </div>
                         </div>

                         {/* Footer / Barcode Area */}
                         <div className="border-t-4 border-black pt-2 text-center mt-auto">
                              <div className="flex justify-between items-end mb-2">
                                  <div className="text-left">
                                      <div className="text-[10px] font-bold">AWB / Invoice No:</div>
                                      <div className="font-mono font-black text-lg">{data.invoiceNo}</div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-[10px] font-bold">{new Date().toLocaleDateString()}</div>
                                      <div className="text-[10px] font-bold">GGX-LBL</div>
                                  </div>
                              </div>
                              {/* Simulate Barcode with Lines */}
                              <div className="h-12 w-full flex justify-between items-stretch overflow-hidden opacity-80">
                                  {Array.from({length: 40}).map((_,i) => (
                                      <div key={i} style={{width: Math.random() > 0.5 ? '4px' : '1px'}} className="bg-black h-full"></div>
                                  ))}
                              </div>
                         </div>
                     </div>
                </div>
            </div>

            {/* Paper Preview Container with Responsive Scaling */}
            <div className="flex justify-center w-full overflow-x-hidden origin-top print:block print:w-full print:overflow-visible">
                <div style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top center',
                    marginBottom: zoomScale < 1 ? `-${(1 - zoomScale) * 100}%` : 0, 
                    transition: 'transform 0.2s ease-out'
                }}>
                    {/* Invoice Print Section */}
                    <div id="invoice-print-section" ref={invoiceRef} className="invoice-container bg-white text-black p-8 pt-6 shadow-xl border border-slate-200 relative w-[210mm] min-w-[210mm] min-h-[297mm] print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-0 print:h-auto print:w-full">
                        
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                            <div className="w-[25%] flex justify-start">
                                <img src={INVOICE_LOGO_URL} alt="Company Logo" className="h-40 object-contain" />
                            </div>
                            <div className="w-[50%] text-center flex flex-col items-center justify-center">
                                <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter leading-none whitespace-nowrap">GO GLOBAL EXPRESS</h1>
                                <p className="text-xl font-black text-gray-500 uppercase tracking-widest mt-1 mb-3">COURIERS</p>
                                <div className="space-y-1 text-center">
                                    <p className="text-[10px] font-bold text-gray-800">{data.branch?.address}</p>
                                    <p className="text-[11px] font-black text-gray-900">{data.branch?.phone}</p>
                                    <p className="text-[10px] font-bold text-gray-800">Email: expressgoglobal@gmail.com</p>
                                    <p className="text-[9px] text-gray-600 font-bold pt-1">Branches : Negombo | Dehiwala | Dematagoda | Wennappuwa</p>
                                </div>
                            </div>
                            <div className="w-[25%] flex flex-col items-end">
                                <img src={INVOICE_QR_URL} alt="QR Code" className="h-28 mb-1 object-contain" />
                                <div className="bg-blue-900 text-white text-[10px] font-bold px-4 py-1 mt-1 inline-block rounded-sm print:bg-blue-900 print:text-white" style={{ WebkitPrintColorAdjust: 'exact' }}>Import | Export</div>
                            </div>
                        </div>

                        {/* Meta Row */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-xs w-1/3 font-bold text-gray-800">
                                <div>AWB # ........................................................</div>
                                <div className="mt-2">Carrier : ........................................................</div>
                            </div>
                            <div className="bg-black text-white text-xl font-bold px-8 py-2 uppercase tracking-[0.2em] print:bg-black print:text-white" style={{ WebkitPrintColorAdjust: 'exact' }}>
                                INVOICE
                            </div>
                            <div className="text-xs text-right w-1/3 text-gray-800">
                                <div><strong>NO.</strong> <span className="font-mono text-sm ml-2 font-black">{data.invoiceNo}</span></div>
                                <div className="mt-2"><strong>Date :</strong> <span className="ml-2 font-black">{new Date().toLocaleDateString()}</span></div>
                            </div>
                        </div>

                        {/* Form Table */}
                        <table className="w-full border-collapse mb-6 text-xs text-black">
                            <tbody>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 w-[130px] uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Sender :</td>
                                    <td colSpan={3} className="border border-black px-2 py-1.5 align-middle font-bold">{data.senderName}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Tel :</td>
                                    <td colSpan={3} className="border border-black px-2 py-1.5 align-middle font-bold">{data.senderPh}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Consignee :</td>
                                    <td colSpan={3} className="border border-black px-2 py-1.5 align-middle font-bold">{data.consName}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Tel / Email :</td>
                                    <td colSpan={3} className="border border-black px-2 py-1.5 align-middle font-bold">
                                        <div className="flex flex-col">
                                            <span>{data.consPh}</span>
                                            {data.consEmail && (
                                                <span className="font-normal text-[10px] text-gray-700 lowercase mt-0.5">{data.consEmail}</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Address :</td>
                                    <td colSpan={3} className="border border-black px-2 py-1.5 align-middle font-bold">{data.consAddr}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>City :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold">{data.consCity}</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 w-[130px] uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Value :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold"></td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Country :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold">{data.country}</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Zip Code :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold">{data.consZip}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Actual Weight :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold">{data.actWt} KG</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>No Boxes :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold">{data.totalBoxes}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Chargeable Wt :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold">{calculation.chgWt} KG</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Insurance :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold text-black font-black">{data.insurance > 0 ? data.insurance.toFixed(2) : ''}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black px-2 py-1.5 border-r-0"></td>
                                    <td className="border border-black px-2 py-1.5 border-l-0"></td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold bg-gray-100 uppercase print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Packing Charges :</td>
                                    <td className="border border-black px-2 py-1.5 align-middle font-bold text-black font-black">{packingCharges > 0 ? packingCharges.toFixed(2) : ''}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Items Table */}
                        <table className="w-full border-collapse mb-1 text-xs text-black">
                            <thead>
                                <tr className="bg-gray-100 print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>
                                    <th className="border border-black px-2 py-1.5 w-[5%] font-black text-black">NO</th>
                                    <th className="border border-black px-2 py-1.5 w-[50%] font-black text-black">Description</th>
                                    <th className="border border-black px-2 py-1.5 w-[10%] font-black text-black">Qty</th>
                                    <th className="border border-black px-2 py-1.5 w-[15%] font-black text-black">Rate</th>
                                    <th className="border border-black px-2 py-1.5 w-[20%] font-black text-black">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item, i) => (
                                    <tr key={item.id}>
                                        <td className="border border-black px-2 py-1.5 text-center font-bold">{i + 1}</td>
                                        <td className="border border-black px-2 py-1.5 font-bold">{item.description}</td>
                                        <td className="border border-black px-2 py-1.5 text-center font-bold">{item.qty}</td>
                                        <td className="border border-black px-2 py-1.5 text-center font-bold">-</td>
                                        <td className="border border-black px-2 py-1.5 text-center font-bold">-</td>
                                    </tr>
                                ))}
                                {emptyRows.map((_, i) => (
                                    <tr key={`empty-${i}`}>
                                        <td className="border border-black px-2 py-1.5 h-6"></td>
                                        <td className="border border-black px-2 py-1.5"></td>
                                        <td className="border border-black px-2 py-1.5"></td>
                                        <td className="border border-black px-2 py-1.5"></td>
                                        <td className="border border-black px-2 py-1.5"></td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={5} className="border border-black px-2 py-2 font-bold text-left bg-gray-100 print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>
                                        Total Words: ..........................................................................................................................................
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Bottom Section */}
                        <div className="flex border border-black border-t-0 text-[10px] text-black">
                            {/* Conditions */}
                            <div className="flex-[2] p-3 border-r border-black">
                                <strong className="font-black uppercase">Conditions Of sales :</strong>
                                <ol className="list-decimal pl-4 mt-1 space-y-1 font-bold">
                                    <li>Go Global Express takes no responsibility for the shipments held in customs and other Parts.</li>
                                    <li>If a shipment is returned due to bad address, consignee not available or refusal, return charges apply per box.</li>
                                    <li>Go Global Express does not accept Dangerous Goods, Perfumes, Flammable Items, Batteries, Etc.</li>
                                    <li>Please refer overleaf for terms & condition on the shipment.</li>
                                </ol>
                                <p className="mt-4 font-black text-center uppercase">I hereby Agree to all terms & conditions of Go Global Express Couriers (PVT)Ltd.</p>
                            </div>

                            {/* Totals */}
                            <div className="flex-1">
                                <table className="w-full border-collapse h-full">
                                    <tbody>
                                        <tr>
                                            <td className="border-b border-black p-1.5 pl-2 font-bold w-1/2 text-black">Invoice Value</td>
                                            <td className="border-b border-black p-1.5 pr-2 text-right font-black text-black">{(calculation.total + packingCharges).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td className="border-b border-black p-1.5 pl-2 font-bold text-black">Insurance</td>
                                            <td className="border-b border-black p-1.5 pr-2 text-right font-black text-black">{data.insurance > 0 ? data.insurance.toFixed(2) : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="border-b border-black p-1.5 pl-2 font-black bg-gray-100 uppercase text-black print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>Total</td>
                                            <td className="border-b border-black p-1.5 pr-2 text-right font-black bg-gray-100 text-black print:bg-gray-100" style={{ WebkitPrintColorAdjust: 'exact' }}>{grandTotal.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td className="border-b border-black p-1.5 pl-2 font-bold text-black">Advance</td>
                                            <td className="border-b border-black p-1.5 pr-2 text-right font-black text-black">{data.amountPaid.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-1.5 pl-2 font-black uppercase text-black">Balance</td>
                                            <td className="p-1.5 pr-2 text-right font-black text-black">{balance.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="flex justify-between mt-16 px-10">
                            <div className="text-center w-56">
                                <div className="border-t border-dotted border-black pt-2 font-bold text-xs uppercase">Customer's Signature</div>
                            </div>
                            <div className="text-center w-56 relative">
                                 <div className="absolute -top-12 left-0 right-0 flex justify-center pointer-events-none">
                                    <img 
                                        src={SIGNATURE_URL}
                                        alt="Authorized Signature"
                                        className="h-16 object-contain mix-blend-multiply opacity-90"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                 </div>
                                <div className="border-t border-dotted border-black pt-2 font-bold text-xs uppercase relative z-10">Issuer's Signature</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}