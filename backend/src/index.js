import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { init } from './db.js';
import auth from './auth.js';
import api from './api.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api', api);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

init()
  .then(() => app.listen(process.env.PORT || 4000, () => console.log('Retain API running')))
  .catch((e) => { console.error('Database setup failed:', e.message); process.exit(1); });
