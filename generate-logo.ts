import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

async function generateLogo() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = "A professional, minimalist app logo for an application named 'Registro Asistencia Remota'. The design should reflect security and efficiency, incorporating subtle elements of a camera lens (photo capture) and a map pin (location/GPS). Clean lines, modern corporate colors like deep blue and emerald green, white background, vector art style.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      console.error('No candidates returned');
      return;
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        const buffer = Buffer.from(base64EncodeString, 'base64');
        const outputPath = path.join(process.cwd(), 'public', 'logo.png');
        fs.writeFileSync(outputPath, buffer);
        console.log('Logo generated successfully at', outputPath);
        break;
      }
    }
  } catch (error) {
    console.error('Error generating logo:', error);
  }
}

generateLogo();
