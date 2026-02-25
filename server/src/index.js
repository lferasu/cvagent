import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import cvRoutes from './routes/cvRoutes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', cvRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({ error: 'Unexpected server error.', details: err.message });
});

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
