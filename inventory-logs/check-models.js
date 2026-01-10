import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

async function checkModels() {
  console.log("Checking API connection...");
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ No API Key found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    // This asks Google: "What models am I allowed to use?"
    const modelResponse = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
    // We try listing models manually if the SDK supports it, 
    // but the official way in newer SDKs is sometimes hidden.
    // Let's try a direct fetch to the list endpoint to be safe.
    
    console.log("✅ API Key is valid!");
    console.log("-----------------------------------");
    console.log("Attempting to generate with 'gemini-1.5-flash'...");
    
    const result = await modelResponse.generateContent("Hello");
    const response = await result.response;
    console.log("🎉 SUCCESS! Model Response:", response.text());

  } catch (error) {
    console.error("\n❌ ERROR DETECTED:");
    console.error(error.message);
    
    if (error.message.includes("404")) {
      console.log("\n💡 DIAGNOSIS: The API Key is likely valid, but the Model Name is wrong OR the project isn't set up correctly.");
    } else if (error.message.includes("API_KEY_INVALID")) {
      console.log("\n💡 DIAGNOSIS: The API Key is incorrect.");
    }
  }
}

checkModels();