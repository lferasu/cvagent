# CV Tailor MVP

Monorepo with:
- `server` - Node.js + Express API for generation and export
- `client` - React + Vite UI

## Quick start

### 1) Server
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### 2) Client
```bash
cd client
npm install
npm run dev
```

Client runs on `http://localhost:5173` and calls server on `http://localhost:3001`.

If `OPENAI_API_KEY` is not set, the server falls back to a built-in mock generator so you can still test the full UI/export flow locally.

If `OPENAI_API_KEY` is present but OpenAI generation is unavailable (for example, invalid/revoked key, quota issue, or connectivity/API problems), `/api/generate-cvs` now falls back to the mock generator instead of returning a 500.

## API

- `POST /api/generate-cvs`
  - Body: `{ "jobPosting": "...", "originalCv": "..." }`
  - Response: `{ "variants": [ ...3 variants... ], "meta": { "mode": "openai|mock", "reason"?: "..." } }`

- `POST /api/export/docx`
  - Body: `{ "variant": { ... } }`
  - Response: `.docx` file stream

- `POST /api/export/pdf`
  - Body: `{ "variant": { ... } }`
  - Response: `.pdf` file stream

## Docker (server)

```bash
cd server
docker build -t cv-tailor-server .
docker run --rm -p 3001:3001 --env-file .env cv-tailor-server
```
