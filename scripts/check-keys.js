console.log("DEBUG CHAVES:");
console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "PRESENTE (Início: " + process.env.GEMINI_API_KEY.substring(0,8) + "...)" : "AUSENTE");
console.log("GOOGLE_GENAI_API_KEY:", process.env.GOOGLE_GENAI_API_KEY ? "PRESENTE (Início: " + process.env.GOOGLE_GENAI_API_KEY.substring(0,8) + "...)" : "AUSENTE");
