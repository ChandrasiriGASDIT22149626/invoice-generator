import { AppState, Branch } from './types';

// =========================================================================
// IMAGES & ASSETS
// =========================================================================
export const LOGIN_LOGO_URL = 'https://i.ibb.co/99r2M7MQ/Login.png';
export const INVOICE_LOGO_URL = 'https://i.ibb.co/4wWvv9wb/Invoice.png';
export const INVOICE_QR_URL = 'https://i.ibb.co/TMNCc9qn/QR-NB.png';
export const SIGNATURE_URL = 'https://i.ibb.co/gMgZSTmc/SIGNATURE.jpg';

// =========================================================================
// GOOGLE SHEETS INTEGRATION
// =========================================================================
// See services/mockService.ts for the Apps Script code to deploy.
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzo8JHefzPfgS4do2PaTk-NV2bV3RGjLJT8pXPW0ZLrEE0Ll1u11zxJUkYRNn2Z6dw/exec';

// URL for fetching history (GET request) - same as above
export const HISTORY_API_URL = 'https://script.google.com/macros/s/AKfycbzo8JHefzPfgS4do2PaTk-NV2bV3RGjLJT8pXPW0ZLrEE0Ll1u11zxJUkYRNn2Z6dw/exec';
// =========================================================================

export const BRANCHES: Branch[] = [
    { name: 'Negombo', code: '10', address: 'No. 268/5, Kurunduwatta, Kochikade, Negombo', phone: 'HOTLINE: 077 468 9388' },
    { name: 'Dehiwala', code: '20', address: 'No. 01, P.T De Silva Ave, Station Rd, Dehiwala', phone: 'HOTLINE: 077 468 9388' },
    { name: 'Dematagoda', code: '30', address: 'Dematagoda Branch Address', phone: 'HOTLINE: 077 468 9388' },
    { name: 'Wennappuwa', code: '40', address: 'Wennappuwa Branch Address', phone: 'HOTLINE: 077 468 9388' },
];

export const BRANCH_CREDENTIALS: Record<string, string> = {
    'Negombo': 'GGX202610',
    'Dehiwala': 'GGX202620',
    'Dematagoda': 'GGX202630',
    'Wennappuwa': 'GGX202640'
};

export const INITIAL_STATE: AppState = {
    branch: null,
    country: '',
    service: 'EXPRESS',
    actWt: 0,
    volWt: 0,
    senderPh: '',
    senderName: '',
    consName: '',
    consPh: '',
    consEmail: '',
    consAddr: '',
    consCity: '',
    consZip: '',
    totalBoxes: 1,
    items: [{ id: '1', description: '', qty: 1 }],
    vacQty: 0,
    vacPrice: 0,
    boxQty: 0,
    boxPrice: 0,
    insurance: 0,
    payMethod: 'Cash',
    amountPaid: 0,
};

export const COUNTRIES = [
    "United Kingdom", "United States", "Australia", "Canada", "United Arab Emirates", 
    "Qatar", "Saudi Arabia", "Japan", "South Korea", "Italy", "France", "Germany"
];