const FRUITFY_API_URL = process.env.FRUITFY_API_URL ?? 'https://api.fruitfy.io';

const sendJson = (
  res: {
    status: (statusCode: number) => { json: (payload: unknown) => void };
    setHeader: (name: string, value: string | string[]) => void;
  },
  statusCode: number,
  payload: unknown
) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.status(statusCode).json(payload);
};

const readOrderId = (req: any): string | undefined => {
  const fromParams = req.params?.orderId;
  if (typeof fromParams === 'string' && fromParams.trim()) return fromParams.trim();
  const q = req.query?.orderId;
  if (typeof q === 'string' && q.trim()) return q.trim();
  if (Array.isArray(q) && typeof q[0] === 'string' && q[0].trim()) return q[0].trim();
  return undefined;
};

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, {success: false, message: 'Method not allowed'});
  }

  const token = (process.env.FRUITFY_TOKEN ?? '').trim();
  const storeId = (process.env.FRUITFY_STORE_ID ?? '').trim();

  if (!token || !storeId) {
    return sendJson(res, 500, {
      success: false,
      message: 'Variáveis da Fruitfy ausentes. Configure FRUITFY_TOKEN e FRUITFY_STORE_ID no .env.',
    });
  }

  const orderId = readOrderId(req);

  if (!orderId) {
    return sendJson(res, 400, {
      success: false,
      message: 'ID do pedido inválido.',
    });
  }

  try {
    const response = await fetch(`${FRUITFY_API_URL}/api/order/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Store-Id': storeId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'pt_BR',
      },
    });

    const responseData = await response.json().catch(() => null);
    return sendJson(
      res,
      response.status,
      responseData ?? {success: false, message: 'Resposta inválida da Fruitfy.'}
    );
  } catch (error) {
    return sendJson(res, 500, {
      success: false,
      message: 'Falha ao consultar status do pedido na Fruitfy.',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
