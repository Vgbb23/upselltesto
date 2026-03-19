/**
 * Único servidor de dev: Express na porta 3000.
 * Rotas /api/pix/charge são tratadas aqui; o resto vai para o Vite (SPA).
 */
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import chargeHandler from './api/pix/charge.ts';

async function main() {
  const app = express();

  // 1) Body parser (obrigatório antes das rotas que leem req.body)
  app.use(express.json({ limit: '1mb' }));

  // 2) Rotas da API PIX — exatamente /api/pix/charge (antes do Vite)
  app.get('/api/pix/charge', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ ok: true, message: 'API PIX ativa. Use POST para criar cobrança.' });
  });
  app.options('/api/pix/charge', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.status(204).end();
  });
  app.post('/api/pix/charge', async (req, res) => {
    await chargeHandler(req, res);
  });

  // 3) Vite (HTML, React, assets) — só recebe o que não bateu nas rotas acima
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log('');
    console.log('  Servidor: http://localhost:' + port);
    console.log('  API PIX:  http://localhost:' + port + '/api/pix/charge');
    console.log('');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
