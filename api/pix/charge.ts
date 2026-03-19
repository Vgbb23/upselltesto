const FRUITFY_API_URL = process.env.FRUITFY_API_URL ?? 'https://api.fruitfy.io';

const sendJson = (
  res: { status: (n: number) => { json: (p: unknown) => void }; setHeader: (name: string, value: string | string[]) => void },
  statusCode: number,
  payload: unknown
) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.status(statusCode).json(payload);
};

const parseBody = async (req: any) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? JSON.parse(raw) : {};
};

/** Extrai string de vários possíveis caminhos na resposta da Fruitfy */
const pick = (obj: any, ...paths: string[]): string => {
  for (const path of paths) {
    const parts = path.split('.');
    let v: any = obj;
    for (const p of parts) {
      v = v?.[p];
      if (v === undefined) break;
    }
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

/** Normaliza resposta da Fruitfy para o formato que o frontend espera */
const normalizeFruitfyPixResponse = (body: any): { success: true; data: { order_id: string; copy_paste: string; qr_code: string } } | null => {
  if (!body || typeof body !== 'object') return null;
  const data = body.data ?? body;
  const pix = data?.pix ?? data;

  const pixCode = pick(
    body, 'data.pix.copy_paste', 'data.pix.copyPaste', 'data.copy_paste', 'data.copyPaste', 'data.pix.emv', 'data.emv',
    'copy_paste', 'copyPaste', 'emv', 'payload', 'brCode', 'data.brCode', 'data.pix.payload', 'data.pix.code', 'data.code'
  );

  let qrCode = pick(
    body, 'data.pix.qr_code', 'data.pix.qrCode', 'data.qr_code', 'data.qrCode', 'data.pix.qrcode', 'data.qrcode',
    'qr_code', 'qrCode', 'qrcode', 'qrCodeImage', 'data.qrCodeImage'
  );

  const orderId = pick(body, 'data.order_id', 'data.orderId', 'data.id', 'order_id', 'orderId', 'id') || '';

  if (!pixCode) return null;

  if (!qrCode && pixCode) {
    qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(pixCode)}`;
  }

  return {
    success: true,
    data: {
      order_id: orderId,
      copy_paste: pixCode,
      qr_code: qrCode,
    },
  };
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, {success: false, message: 'Method not allowed'});
  }

  const token = (process.env.FRUITFY_TOKEN ?? '').trim();
  const storeId = (process.env.FRUITFY_STORE_ID ?? '').trim();
  const productId = (process.env.FRUITFY_PRODUCT_ID ?? '').trim();

  if (!token || !storeId || !productId) {
    return sendJson(res, 500, {
      success: false,
      message: 'Variáveis da Fruitfy ausentes. Configure FRUITFY_TOKEN, FRUITFY_STORE_ID e FRUITFY_PRODUCT_ID no .env e reinicie o servidor.',
    });
  }

  try {
    const body = await parseBody(req);
    const {name, email, phone, cpf, lineItems, totalValue, utm} = body ?? {};

    if (!name || !email || !phone || !cpf || !Array.isArray(lineItems) || lineItems.length === 0) {
      return sendJson(res, 422, {
        success: false,
        message: 'Dados obrigatórios ausentes para gerar cobrança PIX.',
      });
    }

    const itemsTotalFromLines = lineItems.reduce((sum: number, item: any) => {
      const value = Math.max(0, Number(item?.value) || 0);
      const quantity = Math.max(1, Number(item?.quantity) || 1);
      return sum + (value * quantity);
    }, 0);

    const ticketValue = Math.max(0, Number(totalValue) || 0) || itemsTotalFromLines;

    // Doc Fruitfy: Authorization: Bearer <token>, Store-Id, Content-Type, Accept. Valores em centavos.
    const phoneDigits = String(phone ?? '').replace(/\D/g, '');
    const cpfDigits = String(cpf ?? '').replace(/\D/g, '').slice(0, 11);

    // Doc Fruitfy: endpoint é /api/pix/charge (recurso não encontrado = 404 se usar só /pix/charge)
    const response = await fetch(`${FRUITFY_API_URL}/api/pix/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'pt_BR',
        Authorization: `Bearer ${token}`,
        'Store-Id': storeId,
      },
      body: JSON.stringify({
        name: (name ?? '').trim(),
        email: (email ?? '').trim(),
        phone: phoneDigits,
        cpf: cpfDigits,
        items: [
          {
            id: productId,
            value: Math.round(ticketValue),
            quantity: 1,
          },
        ],
        ...(utm && typeof utm === 'object' ? { utm } : {}),
      }),
    });

    const responseData = await response.json().catch(() => null);
    const isUnauthorized = response.status === 401;
    const isSuccess = response.ok && response.status >= 200 && response.status < 300;

    if (isUnauthorized && typeof responseData === 'object' && responseData !== null) {
      (responseData as Record<string, unknown>).message = (responseData as Record<string, unknown>).message ?? 'Não autorizado.';
      (responseData as Record<string, unknown>).hint = 'Verifique Token, Store-Id e Product ID no painel Fruitfy (Integrações > API Tokens). Reinicie o servidor após alterar o .env.';
      return sendJson(res, response.status, responseData);
    }

    if (isSuccess && responseData) {
      const normalized = normalizeFruitfyPixResponse(responseData);
      if (normalized) {
        return sendJson(res, 200, normalized);
      }
    }

    const payload = responseData ?? { success: false, message: 'Resposta inválida da Fruitfy.' };
    return sendJson(res, response.status, payload);
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      message: 'Falha ao criar cobrança PIX na Fruitfy.',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
