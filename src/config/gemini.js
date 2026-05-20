/*
 * Gemini API — set VITE_GEMINI_API_KEY in `.env` (see `.env.example`).
 * Optional: VITE_GEMINI_MODEL (see https://ai.google.dev/gemini-api/docs/models )
 *
 * Text + optional images (inline base64) streamed to the model.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/** Stable model on current Developer API; override with VITE_GEMINI_MODEL if needed. */
const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * @param {string} prompt - User text (may be empty if images-only).
 * @param {(s: string) => void} onPartial
 * @param {{ mimeType: string, data: string }[]} [images]
 */
async function streamReply(prompt, onPartial, images = []) {
  const text = typeof prompt === "string" ? prompt.trim() : "";
  const imageList = Array.isArray(images) ? images : [];

  if (!text && imageList.length === 0) {
    throw new Error("Enter a message or attach at least one image.");
  }
  if (!genAI) {
    throw new Error(
      'Missing API key. Create a `.env` file in the project root with:\nVITE_GEMINI_API_KEY=your_key'
    );
  }

  const modelId =
    import.meta.env.VITE_GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const model = genAI.getGenerativeModel({ model: modelId });

  const userText =
    text ||
    "Describe what you see in this image in detail. If there are multiple images, address each one.";

  const parts = [
    ...imageList.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    })),
    { text: userText },
  ];

  const { stream, response } = await model.generateContentStream(parts);
  let accumulated = "";

  for await (const chunk of stream) {
    let piece = "";
    try {
      piece = chunk.text();
    } catch {
      continue;
    }
    if (piece) {
      accumulated += piece;
      onPartial(accumulated);
    }
  }

  if (!accumulated) {
    try {
      const final = await response;
      accumulated = final.text();
      if (accumulated) onPartial(accumulated);
    } catch {
      /* blocked or empty */
    }
  }

  return accumulated;
}

export default streamReply;
