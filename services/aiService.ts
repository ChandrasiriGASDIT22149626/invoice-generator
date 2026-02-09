import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppState } from "../types";

// Note: Use 'import.meta.env' for Vite projects
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

export async function extractShipmentDetails(
  base64Data: string,
  mimeType: string
): Promise<Partial<AppState>> {
  if (!API_KEY) {
    console.error("Gemini API Key is missing! Check your .env file or Vercel settings.");
    return {};
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
      Analyze this image (shipping label or invoice) and extract logistics data.
      Return ONLY a raw JSON object with these keys:
      {
        "senderName": string,
        "senderPh": string,
        "consName": string,
        "consPh": string,
        "consEmail": string,
        "consAddr": string,
        "consCity": string,
        "consZip": string,
        "country": string,
        "actWt": number,
        "volWt": number,
        "totalBoxes": number,
        "items": [{"description": string, "qty": number}]
      }
      If a field is missing, use null. Do not include any text other than the JSON.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    let text = response.text();

    // CRITICAL: Remove Markdown formatting if Gemini includes it
    if (text.includes("```")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    const parsed = JSON.parse(text);

    // Map the parsed data safely to AppState
    return {
      senderName: parsed.senderName || undefined,
      senderPh: parsed.senderPh || undefined,
      consName: parsed.consName || undefined,
      consPh: parsed.consPh || undefined,
      consEmail: parsed.consEmail || undefined,
      consAddr: parsed.consAddr || undefined,
      consCity: parsed.consCity || undefined,
      consZip: parsed.consZip || undefined,
      country: parsed.country || undefined,
      actWt: Number(parsed.actWt) || undefined,
      volWt: Number(parsed.volWt) || undefined,
      totalBoxes: Number(parsed.totalBoxes) || 1,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item: any) => ({
            id: crypto.randomUUID(),
            description: item.description || "Package Content",
            qty: Number(item.qty) || 1,
          }))
        : undefined,
    };
  } catch (err) {
    console.error("Gemini AI failed to process image:", err);
    return {};
  }
}