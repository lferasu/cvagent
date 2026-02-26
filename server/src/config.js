import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
} else {
  dotenv.config();
}

const maskedKey = (key) => {
  if (!key) return 'missing';
  const prefix = key.slice(0, 7);
  const len = key.length;
  return `${prefix}...(${len} chars)`;
};

console.log(
  JSON.stringify({
    ts: new Date().toISOString(),
    level: 'info',
    message: 'config.loaded',
    openAiKey: maskedKey(process.env.OPENAI_API_KEY),
    port: Number(process.env.PORT || 3001)
  })
);

export const config = {
  port: Number(process.env.PORT || 3001),
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  maxInputLength: Number(process.env.MAX_INPUT_LENGTH || 20000),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 10)
};

