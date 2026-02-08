import React, { useState, useEffect, useCallback } from 'react';
import { FormView } from './components/FormView';
import { InvoiceView } from './components/InvoiceView';
import { LoginOverlay } from './components/LoginOverlay';
import { PreviewModal } from './components/PreviewModal';
import { HistoryView } from './components/HistoryView';
import { DashboardView } from './components/DashboardView'; // Imported
import { calculateRate, saveInvoice } from './services/mockService';
import { AppState, RateResult, InvoiceData, Branch, HistoryEntry } from './types';
import { INITIAL_STATE } from './constants';
import { Moon, Sun, LogOut, Calendar, Clock, FileText, Building2, History, LayoutDashboard } from 'lucide-react';

// View type update
type ViewState = 'dashboard' | 'form' | 'invoice' | 'history';

const App: React.FC = () => {
  // 1. Auto-Save Init: Try to load from local storage
  const [formData, setFormData] = useState<AppState>(() => {
      try {
          const saved = localStorage.getItem('ggx_draft_v1');
          return saved ? JSON.parse(saved) : INITIAL_STATE;
      } catch (e) {
          return INITIAL_STATE;
      }
  });

  const [calculation, setCalculation] = useState<RateResult>({ total: 0, ratePerKg: 0, chgWt: 0 });
  const [view, setView] = useState<ViewState>('dashboard');
  const [isSaving, setIsSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [dailySequence, setDailySequence] = useState(1);
  const [isAutoPrinting, setIsAutoPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 2. Auto-Save Effect
  useEffect(() => {
      // Only save if we are authenticated and have a branch
      if (isAuthenticated && formData.branch) {
          localStorage.setItem('ggx_draft_v1', JSON.stringify(formData));
      }
  }, [formData, isAuthenticated]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const { country, service, actWt, volWt } = formData;
    if (country && actWt > 0) {
        calculateRate(country, service, actWt, volWt).then(setCalculation);
    } else {
        setCalculation({ total: 0, ratePerKg: 0, chgWt: 0 });
    }
  }, [formData.country, formData.service, formData.actWt, formData.volWt]);

  const handleInputChange = useCallback((field: keyof AppState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleBulkChange = useCallback((updates: Partial<AppState>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleLogin = (branch: Branch) => {
      setFormData(prev => ({ ...prev, branch }));
      setIsAuthenticated(true);
      setView('dashboard'); // Go to dashboard on login
  };

  const handleLogout = () => {
      if (window.confirm("Are you sure you want to logout? Local draft will be cleared.")) {
          setIsAuthenticated(false);
          setFormData(INITIAL_STATE);
          localStorage.removeItem('ggx_draft_v1');
          setView('dashboard');
      }
  };

  const generateInvoiceNumber = (branchCode: string) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const sequence = dailySequence.toString().padStart(3, '0');
      return `${branchCode}${year}${month}${day}-${sequence}`;
  };

  const handleGenerate = () => {
      if (!formData.branch) {
          alert("System Error: No Branch Selected.");
          return;
      }
      setShowPreview(true);
  };

  const handleConfirmGenerate = async () => {
    if (!formData.branch) return;

    setIsSaving(true);
    
    const finalTotal = 
        calculation.total + 
        (formData.vacQty * formData.vacPrice) + 
        (formData.boxQty * formData.boxPrice) + 
        formData.insurance;

    const invoiceNo = generateInvoiceNumber(formData.branch.code);

    const invoiceData: InvoiceData = {
        ...formData,
        ...calculation,
        grandTotal: finalTotal,
        balanceDue: finalTotal - formData.amountPaid,
        invoiceNo: invoiceNo,
        date: new Date().toLocaleDateString()
    };

    try {
        await saveInvoice(invoiceData);
        setFormData(prev => ({ ...prev, invoiceNo: invoiceData.invoiceNo }));
        // Clear draft on successful save
        localStorage.removeItem('ggx_draft_v1');
        setShowPreview(false);
        setView('invoice');
        setIsAutoPrinting(true); 
    } catch (error) {
        alert("Error saving invoice. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleAutoComplete = () => {
      setDailySequence(prev => prev + 1);
      const currentBranch = formData.branch;
      // Headless reset: clear everything but keep branch
      const newState = JSON.parse(JSON.stringify(INITIAL_STATE));
      newState.branch = currentBranch;
      
      setFormData(newState);
      setCalculation({ total: 0, ratePerKg: 0, chgWt: 0 });
      setIsAutoPrinting(false);
      setView('dashboard'); // Return to dashboard after completion
  };

  const handleReset = () => {
    if (view === 'invoice') {
        handleAutoComplete();
        return;
    }

    if (window.confirm("Start a new shipment? Unsaved data will be lost.")) {
        const currentBranch = formData.branch;
        const newState = JSON.parse(JSON.stringify(INITIAL_STATE));
        newState.branch = currentBranch;
        
        setFormData(newState);
        setCalculation({ total: 0, ratePerKg: 0, chgWt: 0 });
        setView('form');
    }
  };

  const handleBack = () => {
      setView('form');
  };

  const handleRestoreFromHistory = (entry: HistoryEntry) => {
      setFormData({
          ...INITIAL_STATE,
          branch: formData.branch, 
          country: entry.country,
          service: entry.service,
          actWt: entry.actWt || 0,
          volWt: entry.volWt || 0,
          senderPh: entry.senderPh,
          senderName: entry.senderName,
          consName: entry.consName,
          consPh: entry.consPh,
          consEmail: entry.consEmail || '',
          consAddr: entry.consAddr || '',
          consCity: entry.consCity || '',
          consZip: entry.consZip || '',
          totalBoxes: entry.totalBoxes || 1,
          items: entry.items || [],
          vacQty: entry.vacQty || 0,
          vacPrice: entry.vacPrice || 0,
          boxQty: entry.boxQty || 0,
          boxPrice: entry.boxPrice || 0,
          insurance: entry.insurance || 0,
          payMethod: entry.payMethod,
          amountPaid: entry.amountPaid,
          invoiceNo: entry.invoiceNo
      });

      setCalculation({
          total: entry.total || 0,
          ratePerKg: entry.ratePerKg || 0,
          chgWt: entry.chgWt || 0
      });

      setIsAutoPrinting(false);
      setView('invoice');
  };

  if (!isAuthenticated) {
      return <LoginOverlay onLogin={handleLogin} />;
  }

  const getNextInvoiceNo = () => {
      if (!formData.branch) return '---';
      const year = currentTime.getFullYear();
      const month = (currentTime.getMonth() + 1).toString().padStart(2, '0');
      const day = currentTime.getDate().toString().padStart(2, '0');
      const sequence = dailySequence.toString().padStart(3, '0');
      return `${formData.branch.code}${year}${month}${day}-${sequence}`;
  };
  
  const nextInvoiceNo = getNextInvoiceNo();

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 font-sans selection:bg-brand-500/20 selection:text-brand-700">
      
      {showPreview && (
          <PreviewModal 
            data={formData}
            calculation={calculation}
            onConfirm={handleConfirmGenerate}
            onCancel={() => setShowPreview(false)}
            isProcessing={isSaving}
          />
      )}

      {/* Main Content Area */}
      <div className={`print:hidden`}>
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            
            {/* Header Section */}
            <header className="mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            <Building2 className="w-3 h-3" />
                            <span>Authenticated Branch</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            GGX <span className="text-brand-600 dark:text-brand-500">{formData.branch?.name}</span>
                        </h1>
                    </div>
                    
                    <div className="flex gap-3">
                         {/* Navigation Pills */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                             <button
                                onClick={() => setView('dashboard')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${view === 'dashboard' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <LayoutDashboard size={16} />
                                <span className="hidden md:inline">Dashboard</span>
                            </button>
                            <button
                                onClick={() => setView('form')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'form' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                New Invoice
                            </button>
                            <button
                                onClick={() => setView('history')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${view === 'history' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <History size={16} />
                                History
                            </button>
                        </div>
                        
                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 mx-2"></div>

                        <button 
                            onClick={toggleTheme}
                            className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-brand-500/50 outline-none"
                            aria-label="Toggle Theme"
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-semibold focus:ring-2 focus:ring-red-500/50 outline-none"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* Quick Info Bar - Only visible in Form View */}
                {view === 'form' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 animate-in slide-in-from-top-2">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-brand-600 dark:text-brand-400">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Today's Date</div>
                                <div className="font-bold text-slate-700 dark:text-slate-200">{currentTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                             <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                                <Clock size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Current Time</div>
                                <div className="font-bold text-slate-700 dark:text-slate-200 font-mono tabular-nums">{currentTime.toLocaleTimeString()}</div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 col-span-2 md:col-span-1">
                             <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                                <FileText size={20} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Next Invoice Sequence</div>
                                <div className="font-bold text-slate-700 dark:text-slate-200 font-mono tracking-wider">{nextInvoiceNo}</div>
                            </div>
                        </div>
                    </div>
                )}
            </header>
            
            {/* Conditional Views */}
            <div className={view === 'dashboard' ? 'block' : 'hidden'}>
                <DashboardView branch={formData.branch} onNavigate={(target) => setView(target)} />
            </div>

            <div className={view === 'form' ? 'block' : 'hidden'}>
                <FormView 
                    data={formData} 
                    onChange={handleInputChange} 
                    onBulkChange={handleBulkChange}
                    calculation={calculation}
                    onGenerate={handleGenerate}
                    onClear={handleReset}
                    isProcessing={isSaving}
                />
            </div>
            
            <div className={view === 'history' ? 'block' : 'hidden'}>
                <HistoryView onRestore={handleRestoreFromHistory} />
            </div>

        </div>
      </div>

      {/* Invoice View (Fullscreen) */}
      {(view === 'invoice') && (
        <InvoiceView 
            data={formData} 
            calculation={calculation}
            onBack={handleBack}
            onNew={handleReset}
            autoPrint={isAutoPrinting}
            onAutoComplete={handleAutoComplete}
        />
      )}
    </div>
  );
};

export default App;