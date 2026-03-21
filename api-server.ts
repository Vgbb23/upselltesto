/**
 * Servidor só da API PIX. Roda na porta 3001.
 * O Vite (porta 3000) faz proxy de /api para aqui.
 */
import 'dotenv/config';
import express from 'express';
import chargeHandler from './api/pix/charge.ts';
import orderHandler from './api/order/getOrder.ts';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/pix/charge', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ ok: true, message: 'API PIX ativa. Use POST para criar cobrança.' });
});

app.options('/api/pix/charge', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.status(204).end();
});

app.post('/api/pix/charge', async (req, res) => {
  await chargeHandler(req, res);
});

app.options('/api/order/:orderId', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.status(204).end();
});
app.get('/api/order/:orderId', async (req, res) => {
  await orderHandler(req, res);
});

const port = Number(process.env.API_PORT) || 3001;
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`[API] PIX rodando em http://127.0.0.1:${port}/api/pix/charge (aguarde o Vite iniciar)`);
});
