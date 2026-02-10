import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Violation } from '../types';

// Strict schema for violations only (no score/summary, calculated client-side)
const violationListSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    violations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["critical", "high", "medium", "low"] },
          wcag_criterion: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          visual_evidence: {
            type: Type.OBJECT,
            properties: {
              frame_timestamp: { type: Type.STRING },
              description: { type: Type.STRING },
              frame_image_url: { type: Type.STRING }
            }
          },
          code_evidence: {
            type: Type.OBJECT,
            properties: {
              file: { type: Type.STRING },
              line: { type: Type.INTEGER },
              snippet: { type: Type.STRING },
            }
          },
          reasoning: { type: Type.STRING },
          user_impact: { type: Type.STRING },
          suggested_fix: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              explanation: { type: Type.STRING },
            }
          }
        },
        required: ["severity", "wcag_criterion", "title", "description", "user_impact", "suggested_fix"]
      }
    }
  },
  required: ["violations"]
};

export const runAudit = async (frames: { timestamp: string, data: string }[], codeContent: string): Promise<{ violations: Violation[] }> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY.");
  }

  // Use Gemini 3 Pro (Preview) as per system instructions for complex reasoning
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts: any[] = [];
  
  parts.push({
    text: `SOURCE CODE CONTEXT:\n${codeContent}\n\n`
  });

  frames.forEach(frame => {
    parts.push({
        text: `Frame at timestamp ${frame.timestamp}:`
    });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: frame.data
      }
    });
  });

  const prompt = `
    You are an expert WCAG 2.1 AA accessibility auditor powered by Gemini 3 Pro.

    Your task is to analyze the provided video frames and source code to identify ALL accessibility violations.
    
    CRITICAL: DO NOT calculate an overall score. Just list the violations. We use a deterministic scoring algorithm client-side.

    For EACH violation found, determine the severity based on these guidelines:
    - "critical": Completely blocks access (e.g., missing alt text on primary images, keyboard traps, contrast < 3:1).
    - "high": Major barrier (e.g., contrast 3:1-4.4:1, broken heading hierarchy).
    - "medium": Usability impact (e.g., small touch targets 40-44px).
    - "low": Best practice violation.

    Analyze contrast, touch targets, focus indicators, semantic HTML, ARIA roles, and alt text.
    Correlate visual evidence with code evidence.
  `;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Corrected from gemini-3.0-pro to match system alias
    contents: {
        role: 'user',
        parts: parts
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: violationListSchema,
      temperature: 0.1, // Deterministic output
      topP: 0.95,
      topK: 40,
      thinkingConfig: { thinkingBudget: 2048 } // Re-enable thinking for complex reasoning
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  return JSON.parse(text) as { violations: Violation[] };
};