export interface Branch {
    name: string;
    code: string;
    address: string;
    phone: string;
}

export interface LineItem {
    id: string;
    description: string;
    qty: number;
}

export interface AppState {
    // Branch
    branch: Branch | null;
    
    // Shipment
    country: string;
    service: 'EXPRESS' | 'ECONOMY';
    actWt: number;
    volWt: number;
    
    // Customer
    senderPh: string;
    senderName: string;
    consName: string;
    consPh: string;
    consEmail: string; // Added optional email
    consAddr: string;
    consCity: string;
    consZip: string;
    
    // Items
    totalBoxes: number;
    items: LineItem[];
    
    // Charges
    vacQty: number;
    vacPrice: number;
    boxQty: number;
    boxPrice: number;
    insurance: number;
    payMethod: 'Cash' | 'Card' | 'Credit';
    amountPaid: number;

    // Generated
    invoiceNo?: string;
}

export interface RateResult {
    total: number;
    ratePerKg: number;
    chgWt: number;
}

export interface InvoiceData extends AppState, RateResult {
    invoiceNo: string;
    date: string;
    grandTotal: number;
    balanceDue: number;
}

export interface HistoryEntry extends InvoiceData {
    // Extends InvoiceData
}