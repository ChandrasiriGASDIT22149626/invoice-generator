import { GoogleGenAI, Type } from "@google/genai";
import { AppState } from '../types';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractShipmentDetails(base64Data: string, mimeType: string): Promise<Partial<AppState>> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { 
                        inlineData: { 
                            mimeType: mimeType, 
                            data: base64Data 
                        } 
                    },
                    { 
                        text: `Analyze this image for logistics information (shipping labels, handwritten notes, or digital screenshots). 
                        Extract the following details if visible:
                        - Sender Name and Phone
                        - Consignee Name, Phone, Email, Address, City, Zip Code
                        - Destination Country (Infer from address if needed)
                        - Actual Weight (actWt) and Volumetric Weight (volWt)
                        - Total number of boxes/packages (totalBoxes). Look for "Pcs", "Boxes", or count items if listed.
                        - List of items with quantities
                        
                        For the address, try to combine street/house details into 'consAddr'.
                        Return a JSON object.` 
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        senderName: { type: Type.STRING, nullable: true },
                        senderPh: { type: Type.STRING, nullable: true },
                        consName: { type: Type.STRING, nullable: true },
                        consPh: { type: Type.STRING, nullable: true },
                        consEmail: { type: Type.STRING, nullable: true },
                        consAddr: { type: Type.STRING, nullable: true },
                        consCity: { type: Type.STRING, nullable: true },
                        consZip: { type: Type.STRING, nullable: true },
                        country: { type: Type.STRING, nullable: true },
                        actWt: { type: Type.NUMBER, nullable: true },
                        volWt: { type: Type.NUMBER, nullable: true },
                        totalBoxes: { type: Type.INTEGER, nullable: true },
                        items: {
                            type: Type.ARRAY,
                            nullable: true,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    description: { type: Type.STRING },
                                    qty: { type: Type.NUMBER }
                                }
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return {};

        const result = JSON.parse(text);
        
        // Sanitize and return partial state
        const updates: Partial<AppState> = {};
        
        if (result.senderName) updates.senderName = result.senderName;
        if (result.senderPh) updates.senderPh = result.senderPh;
        if (result.consName) updates.consName = result.consName;
        if (result.consPh) updates.consPh = result.consPh;
        if (result.consEmail) updates.consEmail = result.consEmail;
        if (result.consAddr) updates.consAddr = result.consAddr;
        if (result.consCity) updates.consCity = result.consCity;
        if (result.consZip) updates.consZip = result.consZip;
        if (result.country) updates.country = result.country;
        if (result.actWt) updates.actWt = result.actWt;
        if (result.volWt) updates.volWt = result.volWt;
        if (result.totalBoxes) updates.totalBoxes = result.totalBoxes;
        
        if (result.items && Array.isArray(result.items) && result.items.length > 0) {
            updates.items = result.items.map((item: any) => ({
                id: Date.now().toString() + Math.random(),
                description: item.description || '',
                qty: item.qty || 1
            }));
        }

        return updates;

    } catch (error) {
        console.error("AI Analysis failed:", error);
        throw error;
    }
}