import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");
    return new GoogleGenAI({ apiKey });
};

export const transcribeTaskImage = async (base64Image: string): Promise<string> => {
    try {
        const client = getClient();
        // Remove header if present
        const cleanBase64 = base64Image.split(',')[1] || base64Image;

        // Fix: Use 'gemini-3-flash-preview' for basic text/transcription tasks as per guidelines
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: cleanBase64
                        }
                    },
                    {
                        text: "Transcribe the essay task instructions from this image into clean Markdown format. Focus on the question, requirements, and any bullet points provided in the prompt."
                    }
                ]
            }
        });

        // Fix: response.text is a getter property, used correctly here
        return response.text || "Could not transcribe task.";
    } catch (error) {
        console.error("Transcription error", error);
        return "Error transcribing task. Please type manually.";
    }
};