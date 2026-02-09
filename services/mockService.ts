import { RateResult, InvoiceData, HistoryEntry, LineItem } from '../types';
import { calculateShipmentRate } from './rateEngine';
import { GOOGLE_SCRIPT_URL, HISTORY_API_URL, BRANCHES } from '../constants';

// Mock database for customer lookup
const CUSTOMER_DB: Record<string, string> = {
    '94771234567': 'John Doe',
    '94719876543': 'Jane Smith'
};

export const findCustomer = async (phone: string): Promise<string | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return CUSTOMER_DB[cleanPhone] || null;
};

export const calculateRate = async (country: string, service: string, actWt: number, volWt: number): Promise<RateResult> => {
    const result = calculateShipmentRate(country, service, actWt, volWt);
    return {
        chgWt: result.chgWt,
        ratePerKg: result.ratePerKg,
        total: result.total
    };
};

export const fetchInvoiceHistory = async (): Promise<HistoryEntry[]> => {
    try {
        if (!HISTORY_API_URL || HISTORY_API_URL.includes('PASTE_YOUR_URL')) {
             return [];
        }

        const cacheBuster = `?t=${new Date().getTime()}`;
        const response = await fetch(HISTORY_API_URL + cacheBuster);
        
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        const rawList = Array.isArray(data) ? data : (data.data || []);
        
        return rawList.map((item: any) => ({
            ...item,
            branch: BRANCHES.find(b => b.name === item.branchName) || { name: item.branchName, code: '00', address: '', phone: '' },
            items: item.itemsJson ? JSON.parse(item.itemsJson) : [],
            senderPh: String(item.senderPh || ''),
            actWt: Number(item.actWt) || 0,
            grandTotal: Number(item.grandTotal) || 0,
            date: item.date // Now consistently YYYY-MM-DD from the backend
        })) as HistoryEntry[];
    } catch (error) {
        console.error("Failed to fetch history:", error);
        return [];
    }
};

/**
 * FIXED saveInvoice
 * Removed 'no-cors' to allow reading the response from Google.
 * Standardized date format to ensure Dashboard stats match History.
 */
export const saveInvoice = async (data: InvoiceData): Promise<boolean> => {
    try {
        if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR_URL')) {
            return true; 
        }

        // Standardize date to YYYY-MM-DD for the database
        const payload = {
            ...data,
            date: new Date().toISOString().split('T')[0]
        };

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Required for Google Script POST
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const result = await response.json();
        return result.result === 'success';
    } catch (error) {
        console.error("Cloud Sync Error:", error);
        return false; // UI can now show an error message
    }
};