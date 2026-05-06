import OpenAI from 'openai'; 
import dotenv from 'dotenv';

dotenv.config(); // load env variables 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // load API Key from OpenAI 
});

export default openai; 