import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppState } from "../types";

const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

export async function extractShipmentDetails(
  base64Data: string,
  mimeType: string
): Promise<Partial<AppState>> {

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      {
        text: `
Analyze this image for logistics information.

Extract:
- Sender Name and Phone
- Consignee Name, Phone, Email, Address, City, Zip Code
- Destination Country
- Actual Weight and Volumetric Weight
- Total number of boxes
- Item list with quantities

Return ONLY valid JSON.
`
      }
    ]);

    const text = result.response.text();
    if (!text) return {};

    const parsed = JSON.parse(text);

    return {
      senderName: parsed.senderName ?? undefined,
      senderPh: parsed.senderPh ?? undefined,
      consName: parsed.consName ?? undefined,
      consPh: parsed.consPh ?? undefined,
      consEmail: parsed.consEmail ?? undefined,
      consAddr: parsed.consAddr ?? undefined,
      consCity: parsed.consCity ?? undefined,
      consZip: parsed.consZip ?? undefined,
      country: parsed.country ?? undefined,
      actWt: parsed.actWt ?? undefined,
      volWt: parsed.volWt ?? undefined,
      totalBoxes: parsed.totalBoxes ?? undefined,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item: any) => ({
            id: crypto.randomUUID(),
            description: item.description || "",
            qty: item.qty || 1
          }))
        : undefined
    };

  } catch (err) {
    console.error("Gemini AI failed:", err);
    return {};
  }
}
