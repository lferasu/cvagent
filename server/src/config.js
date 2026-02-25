import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3001),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  maxInputLength: Number(process.env.MAX_INPUT_LENGTH || 20000),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 10)
};
