import { RateResult, InvoiceData, HistoryEntry, LineItem } from '../types';
import { calculateShipmentRate } from './rateEngine';
import { GOOGLE_SCRIPT_URL, HISTORY_API_URL, BRANCHES } from '../constants';

// Mock database for customer lookup
const CUSTOMER_DB: Record<string, string> = {
    '94771234567': 'John Doe',
    '94719876543': 'Jane Smith'
};

export const findCustomer = async (phone: string): Promise<string | null> => {
    // Simulate network delay
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
        if (!HISTORY_API_URL || HISTORY_API_URL.includes('PASTE_YOUR_NEW_WEB_APP_URL_HERE')) {
             console.warn("History fetch skipped: valid HISTORY_API_URL not found.");
             return [];
        }

        // Add timestamp to prevent browser caching
        const cacheBuster = `?t=${new Date().getTime()}`;
        const response = await fetch(HISTORY_API_URL + cacheBuster);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle case where script returns error object
        if (data.result === 'error') {
            console.error("Google Script Error:", data.message);
            return [];
        }

        const rawList = Array.isArray(data) ? data : (data.data || []);
        
        return rawList.map((item: any) => {
            // Reconstruct the branch object fully if possible
            const matchedBranch = BRANCHES.find(b => b.name === item.branchName) || { 
                name: item.branchName || 'Unknown', 
                code: '00', 
                address: '', 
                phone: '' 
            };

            // Parse Items JSON if available, otherwise fallback to summary or empty
            let parsedItems: LineItem[] = [];
            try {
                if (item.itemsJson && item.itemsJson !== '[]') {
                    parsedItems = JSON.parse(item.itemsJson);
                } else if (typeof item.items === 'string') {
                    // Legacy fallback
                    parsedItems = [{ id: '1', description: item.items, qty: 1 }];
                }
            } catch (e) {
                parsedItems = [{ id: '1', description: item.items || '', qty: 1 }];
            }

            return {
                ...item,
                branch: matchedBranch,
                items: parsedItems.length > 0 ? parsedItems : [{ id: '1', description: '', qty: 1 }],
                
                // FORCE STRING TYPE for Phone Numbers to prevent .replace errors
                senderPh: String(item.senderPh || ''),
                consPh: String(item.consPh || ''),
                senderName: String(item.senderName || ''),

                // New Optional Field
                consEmail: String(item.consEmail || ''),

                // Numeric Casts for Safety
                actWt: Number(item.actWt) || 0,
                volWt: Number(item.volWt) || 0,
                chgWt: Number(item.chgWt) || 0,
                ratePerKg: Number(item.ratePerKg) || 0,
                total: Number(item.freight) || 0,
                
                totalBoxes: Number(item.totalBoxes) || 1,
                
                vacQty: Number(item.vacQty) || 0,
                vacPrice: Number(item.vacPrice) || 0,
                boxQty: Number(item.boxQty) || 0,
                boxPrice: Number(item.boxPrice) || 0,
                insurance: Number(item.insurance) || 0,
                
                grandTotal: Number(item.grandTotal) || 0,
                amountPaid: Number(item.amountPaid) || 0,
                balanceDue: Number(item.balanceDue) || 0,

                // String fields
                consAddr: item.consAddr || '',
                consCity: item.consCity || '',
                consZip: item.consZip || '',
                payMethod: item.payMethod || 'Cash'
            } as HistoryEntry;
        });

    } catch (error) {
        console.error("Failed to fetch history:", error);
        return [];
    }
};

/* 
============================================================================
GOOGLE APPS SCRIPT CODE (UPDATED V8 - CONFIGURABLE SHEET NAME)
============================================================================
1. Open your Google Sheet -> Extensions -> Apps Script
2. Replace existing code with this ENTIRE block
3. Run 'setup' function once.
4. Deploy > Manage Deployments > Edit > New Version > Deploy
============================================================================

// --- CONFIGURATION ---
var SHEET_NAME = "Shipments"; // <--- CHANGE THIS IF YOUR TAB IS NAMED 'Sheet1'
// ---------------------

function setup() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = doc.insertSheet(SHEET_NAME);
  }
  
  // Define Headers (30 Columns)
  var headers = [
    'Date', 'Invoice No', 'Branch Name', 'Destination', 'Service', 
    'Sender Name', 'Sender Ph', 'Cons Name', 'Cons Ph', 'Cons Email', 'Cons Address', 'Cons City', 'Cons Zip',
    'Items Summary', 'Items JSON', 'Total Boxes',
    'Act Wt', 'Vol Wt', 'Chg Wt', 'Rate Per Kg', 'Base Freight',
    'Vac Qty', 'Vac Price', 'Box Qty', 'Box Price', 'Insurance',
    'Grand Total', 'Paid', 'Balance', 'Pay Method'
  ];
  
  // Set Headers in First Row safely
  var currentHeaders = [];
  if (sheet.getLastColumn() > 0) {
    currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  // Update headers if count doesn't match
  if (currentHeaders.length < headers.length) {
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
    headerRange.setFontWeight("bold").setBackground("#cffafe"); 
  }
}

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); 

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      setup();
      sheet = doc.getSheetByName(SHEET_NAME);
    }

    // --- GET Request (Fetch History) ---
    if (!e.postData) {
      var lastRow = sheet.getLastRow();
      
      if (lastRow < 2) {
        return ContentService.createTextOutput(JSON.stringify([]))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // SAFELY Get all data using getDataRange to avoid "Range not found" errors
      var data = sheet.getDataRange().getValues();
      
      // Remove header row
      data.shift(); 
      
      var result = data.map(function(row) {
        // Use safe access (row[index] || '') in case column doesn't exist yet
        return {
           date: row[0],
           invoiceNo: row[1],
           branchName: row[2],
           country: row[3],
           service: row[4],
           
           senderName: row[5],
           senderPh: row[6],
           consName: row[7],
           consPh: row[8],
           consEmail: row[9] || '', // Added
           consAddr: row[10] || '',
           consCity: row[11] || '',
           consZip: row[12] || '',
           
           items: row[13],      // Summary string
           itemsJson: row[14] || '[]',  // Full structure
           totalBoxes: row[15] || 1,
           
           actWt: row[16] || 0,
           volWt: row[17] || 0,
           chgWt: row[18] || 0,
           ratePerKg: row[19] || 0,
           freight: row[20] || 0,
           
           vacQty: row[21] || 0,
           vacPrice: row[22] || 0,
           boxQty: row[23] || 0,
           boxPrice: row[24] || 0,
           insurance: row[25] || 0,
           
           grandTotal: row[26] || 0,
           amountPaid: row[27] || 0,
           balanceDue: row[28] || 0,
           payMethod: row[29] || 'Cash'
        };
      });
      
      return ContentService.createTextOutput(JSON.stringify(result.reverse()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- POST Request (Save Invoice) ---
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);

    // Create Human Readable Item List
    var itemsList = "";
    if (data.items && Array.isArray(data.items)) {
      itemsList = data.items.map(function(item) {
        return item.description + ' (' + item.qty + ')';
      }).join(', ');
    }

    // JSON Stringify Items for exact restore
    var itemsJson = JSON.stringify(data.items || []);

    // Ensure we are appending to the right columns. 
    sheet.appendRow([
      "'" + (data.date || new Date().toLocaleDateString()),
      data.invoiceNo,
      data.branch ? data.branch.name : 'N/A',
      data.country,
      data.service,
      
      data.senderName,
      data.senderPh,
      data.consName,
      data.consPh,
      data.consEmail || '', // Added
      data.consAddr || '',
      data.consCity || '',
      data.consZip || '',
      
      itemsList,
      itemsJson,
      data.totalBoxes || 1,
      
      data.actWt || 0,
      data.volWt || 0,
      data.chgWt || 0,
      data.ratePerKg || 0,
      data.total || 0, // Base freight
      
      data.vacQty || 0,
      data.vacPrice || 0,
      data.boxQty || 0,
      data.boxPrice || 0,
      data.insurance || 0,
      
      data.grandTotal || 0,
      data.amountPaid || 0,
      data.balanceDue || 0,
      data.payMethod || 'Cash'
    ]);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
*/

export const saveInvoice = async (data: InvoiceData): Promise<boolean> => {
    try {
        if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes('PASTE_YOUR_NEW_WEB_APP_URL_HERE')) {
            console.warn("Google Cloud Sync skipped: URL not configured.");
            return true; 
        }

        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(data)
        });
        
        console.log("Synced to Cloud:", data.invoiceNo);
        return true;
    } catch (error) {
        console.error("Cloud Sync Error:", error);
        return true;
    }
};