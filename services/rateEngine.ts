import { RATES_CSV } from './rateData';

interface RateRow {
    min: number;
    max: number;
    rate: number;
    type: 'BASE' | 'DOC' | 'ADDER' | 'FLAT_SLAB';
}

// Map structure: Service -> Country (Uppercase) -> Rate Rows
type RatesMap = Record<string, Record<string, RateRow[]>>;

let cachedRates: RatesMap | null = null;
let cachedCountries: string[] = [];

function parseRates() {
    if (cachedRates) return { rates: cachedRates, countries: cachedCountries };

    const rates: RatesMap = {};
    const countrySet = new Set<string>();

    const lines = RATES_CSV.trim().split('\n');
    // Skip header if it exists (starts with Country)
    const startIndex = lines[0].startsWith('Country') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quoted CSV values like "Korea, South"
        const parts: string[] = [];
        let inQuote = false;
        let current = '';
        for(let char of line) {
            if(char === '"') {
                inQuote = !inQuote;
            } else if(char === ',' && !inQuote) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);

        if (parts.length < 6) continue;

        const countryRaw = parts[0].trim().replace(/^"|"$/g, '');
        const service = parts[1].trim().toUpperCase();
        const min = parseFloat(parts[2]);
        const max = parseFloat(parts[3]);
        const rate = parseFloat(parts[4]);
        const type = parts[5].trim().toUpperCase() as RateRow['type'];

        const countryKey = countryRaw.toUpperCase();
        countrySet.add(countryRaw); // Keep original casing for display if first time

        if (!rates[service]) rates[service] = {};
        if (!rates[service][countryKey]) rates[service][countryKey] = [];

        rates[service][countryKey].push({ min, max, rate, type });
    }

    cachedRates = rates;
    // Sort countries alphabetically
    cachedCountries = Array.from(countrySet).sort();
    return { rates, countries: cachedCountries };
}

export function getAvailableCountries(): string[] {
    const { countries } = parseRates();
    return countries;
}

export function calculateShipmentRate(country: string, service: string, actWt: number, volWt: number): { total: number, chgWt: number, ratePerKg: number } {
    const { rates } = parseRates();
    const serviceKey = service.toUpperCase();
    const countryKey = country.toUpperCase();
    
    // Default response if no data found
    const zero = { total: 0, chgWt: 0, ratePerKg: 0 };

    if (!rates[serviceKey] || !rates[serviceKey][countryKey]) {
        return zero;
    }

    const rules = rates[serviceKey][countryKey];
    
    // 1. Determine Input Weight
    const inputWeight = Math.max(actWt, volWt);
    if (inputWeight <= 0) return zero;

    let finalTotal = 0;
    let finalChgWt = 0;

    // 2. Check for DOC special case (Express only typically, but logic is generic if CSV supports it)
    // Rule: Docs (<=0.5kg) -> Fixed Doc Rate.
    const docRule = rules.find(r => r.type === 'DOC');
    
    if (inputWeight <= 0.5 && docRule) {
        finalTotal = docRule.rate;
        finalChgWt = 0.5; // Fixed weight for doc billing usually, or actual. 
        // Logic implies fixed rate.
        return { total: finalTotal, chgWt: finalChgWt, ratePerKg: finalTotal / finalChgWt };
    }

    // 3. Universal Rule: Round weight UP to nearest whole kilogram
    finalChgWt = Math.ceil(inputWeight);

    // 4. Calculate based on Logic Type
    // Logic split by service type (Express vs Economy) is largely handled by the CSV structure (ADDER vs SLAB),
    // but the formulas need to match the specific rules provided.

    // Find applicable rules
    // Note: The CSV structure has ranges. We match the rounded weight to the ranges.
    
    // EXPRESS LOGIC:
    // Up to 10kg: Base + (Wt-1)*Adder
    // Above 10kg: Wt * SlabRate
    
    // ECONOMY LOGIC:
    // 1-4kg (or up to 5 in CSV): Base + (Wt-1)*Adder
    // 5kg+ (or per CSV): Wt * SlabRate

    // We can infer the logic from the available row types for the weight.
    
    // Try to find a FLAT_SLAB for this weight first (High priority for >10kg Express or >5kg Economy)
    const slabRule = rules.find(r => r.type === 'FLAT_SLAB' && finalChgWt > r.min && finalChgWt <= r.max);
    
    if (slabRule) {
        // "Total Weight x Rate"
        finalTotal = finalChgWt * slabRule.rate;
        return { total: finalTotal, chgWt: finalChgWt, ratePerKg: slabRule.rate };
    }

    // If no slab, check for Base + Adder logic
    // Usually applies for lower weights
    const baseRule = rules.find(r => r.type === 'BASE');
    
    // Find adder rule that *covers* this weight range (e.g. 1.01 - 10.0)
    // For weight 5, it falls in 1.01-10.0.
    const adderRule = rules.find(r => r.type === 'ADDER' && finalChgWt > r.min && finalChgWt <= r.max);

    if (baseRule) {
        // "1st Kg Rate + (Total Weight - 1) x Adder Rate"
        let cost = baseRule.rate;
        if (finalChgWt > 1) {
            // Use specific adder or fallback to generic logic? 
            // The logic implies a single 'Adder' rate for the range.
            const adderRate = adderRule ? adderRule.rate : 0;
            cost += (finalChgWt - 1) * adderRate;
        }
        finalTotal = cost;
        return { total: finalTotal, chgWt: finalChgWt, ratePerKg: finalTotal / finalChgWt };
    }

    return zero;
}
