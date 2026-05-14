import { GoogleGenAI } from '@google/genai';

async function run() {
  const ai = new GoogleGenAI({ apiKey: 'dummy_key' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Tell me a joke',
      config: {
          systemInstruction: 'You are a funny bot'
      }
    });
    console.log("Success:", response.text);
  } catch (err: any) {
    console.error("Error:", err.message);
    console.log(JSON.stringify(err, null, 2));
  }
}

run();
