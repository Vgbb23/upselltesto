import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Zap,
  Check,
  Truck,
  Star,
  User,
  MapPin,
  CreditCard,
  Copy,
  QrCode,
  ArrowLeft,
  Flame
} from 'lucide-react';

// --- Types ---

interface UpsellOffer {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  benefit: string;
  icon: React.ReactNode;
}

interface CheckoutData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface PixChargeResult {
  orderId: string;
  pixCode: string;
  qrCodeUrl: string;
}

interface CheckoutLineItem {
  id: number;
  name: string;
  value: number;
  quantity: number;
}

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

type UtmKey = (typeof UTM_KEYS)[number];
type UtmPayload = Record<UtmKey, string>;

const getUtmPayload = (): UtmPayload => {
  const searchParams = new URLSearchParams(window.location.search);
  const utm: Partial<UtmPayload> = {};

  UTM_KEYS.forEach((key) => {
    const valueFromUrl = searchParams.get(key)?.trim() ?? '';
    const storageKey = `utmify:${key}`;
    const valueFromStorage = sessionStorage.getItem(storageKey)?.trim() ?? '';
    const finalValue = valueFromUrl || valueFromStorage || '';

    if (valueFromUrl) {
      sessionStorage.setItem(storageKey, valueFromUrl);
    }

    utm[key] = finalValue;
  });

  return utm as UtmPayload;
};

const deepPick = (root: unknown, paths: string[]): string => {
  for (const path of paths) {
    const parts = path.split('.').filter(Boolean);
    let cur: any = root;
    for (const p of parts) {
      cur = cur?.[p];
      if (cur === undefined || cur === null) break;
    }
    if (typeof cur === 'string' && cur.trim()) return cur.trim();
    if (typeof cur === 'number' && Number.isFinite(cur)) return String(cur);
  }
  return '';
};

const formatCpfForForm = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatPhoneForForm = (raw: string) => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** Tenta montar CheckoutData a partir do JSON retornado por GET /api/order/:id (formato Fruitfy pode variar). */
const extractCustomerFromOrderJson = (payload: unknown): Partial<CheckoutData> => {
  if (!payload || typeof payload !== 'object') return {};
  const p = payload as Record<string, any>;
  const data = p.data ?? p;

  const name =
    deepPick(data, [
      'customer.name',
      'buyer.name',
      'client.name',
      'cliente.nome',
      'shipping_address.name',
      'nome',
      'name',
      'full_name',
      'fullName',
    ]) || deepPick(p, ['customer.name', 'name']);

  const email =
    deepPick(data, ['customer.email', 'buyer.email', 'email', 'mail']) || deepPick(p, ['customer.email', 'email']);

  const phoneRaw =
    deepPick(data, [
      'customer.phone',
      'customer.mobile',
      'buyer.phone',
      'phone',
      'mobile',
      'telephone',
      'celular',
      'whatsapp',
    ]) || deepPick(p, ['customer.phone', 'phone']);

  const cpfRaw =
    deepPick(data, [
      'customer.cpf',
      'customer.document',
      'cpf',
      'document',
      'tax_id',
      'taxId',
    ]) || deepPick(p, ['customer.cpf', 'cpf']);

  const ship = data.shipping_address ?? data.delivery_address ?? data.shipping ?? data.endereco;
  const cepRaw = ship
    ? deepPick(ship, ['cep', 'postal_code', 'postalCode', 'zip', 'zipcode'])
    : deepPick(data, ['cep', 'postal_code', 'zip']);
  const address = ship
    ? deepPick(ship, ['street', 'address', 'logradouro', 'line1', 'address_line_1', 'rua'])
    : '';
  const number = ship ? deepPick(ship, ['number', 'numero', 'street_number']) : '';
  const complement = ship ? deepPick(ship, ['complement', 'complemento', 'line2']) : '';
  const neighborhood = ship ? deepPick(ship, ['neighborhood', 'bairro', 'district']) : '';
  const city = ship ? deepPick(ship, ['city', 'cidade', 'localidade']) : deepPick(data, ['city', 'cidade']);
  const state = ship ? deepPick(ship, ['state', 'estado', 'uf', 'region']) : deepPick(data, ['state', 'uf']);

  const out: Partial<CheckoutData> = {};
  if (name) out.name = name;
  if (email) out.email = email;
  if (phoneRaw) out.phone = formatPhoneForForm(phoneRaw);
  if (cpfRaw) out.cpf = formatCpfForForm(cpfRaw);
  if (cepRaw) {
    const c = cepRaw.replace(/\D/g, '').slice(0, 8);
    out.cep = c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : cepRaw;
  }
  if (address) out.address = address;
  if (number) out.number = number;
  if (complement) out.complement = complement;
  if (neighborhood) out.neighborhood = neighborhood;
  if (city) out.city = city;
  if (state) out.state = state.length === 2 ? state.toUpperCase() : state;
  return out;
};

const hasCoreCustomerFields = (data: Partial<CheckoutData>) => {
  const phoneDigits = (data.phone ?? '').replace(/\D/g, '');
  const cpfDigits = (data.cpf ?? '').replace(/\D/g, '');
  return (
    (data.name ?? '').trim().length > 1 &&
    (data.email ?? '').includes('@') &&
    phoneDigits.length >= 10 &&
    cpfDigits.length === 11
  );
};

const normalizePhoneForApi = (phoneValue: string) => {
  const digits = phoneValue.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const parsePixChargeResult = (payload: any): PixChargeResult | null => {
  const pickString = (...values: unknown[]) => {
    const firstValid = values.find((value) => typeof value === 'string' && (value as string).trim().length > 0);
    return typeof firstValid === 'string' ? firstValid : '';
  };

  const data = payload?.data ?? payload;
  const pixData = data?.pix ?? data ?? {};
  const root = payload ?? {};

  const pixCode = pickString(
    pixData.copy_paste,
    pixData.copyPaste,
    pixData.emv,
    pixData.payload,
    pixData.code,
    data.copy_paste,
    data.copyPaste,
    data.emv,
    data.payload,
    data.code,
    root.copy_paste,
    root.copyPaste,
    root.emv,
    root.payload,
    root.code
  );

  let qrCodeUrl = pickString(
    pixData.qr_code,
    pixData.qrCode,
    pixData.qrcode,
    data.qr_code,
    data.qrCode,
    data.qrcode,
    root.qr_code,
    root.qrCode,
    root.qrcode
  );

  if (qrCodeUrl && !qrCodeUrl.startsWith('http') && !qrCodeUrl.startsWith('data:image')) {
    qrCodeUrl = `data:image/png;base64,${qrCodeUrl}`;
  }

  if (!qrCodeUrl && pixCode) {
    qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;
  }

  if (!pixCode || !qrCodeUrl) return null;

  const orderId = data?.order_id ?? data?.orderId ?? root?.order_id ?? root?.orderId ?? '';

  return {
    orderId,
    pixCode,
    qrCodeUrl,
  };
};

/** Dados enviados pelo checkout principal via query `prefill` (base64url JSON { n, e, p, c }). */
const decodeCustomerPrefillParam = (raw: string | null): Partial<CheckoutData> | null => {
  if (!raw?.trim()) return null;
  try {
    let b64 = raw.trim().replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const o = JSON.parse(json) as Record<string, unknown>;
    const name = typeof o.n === 'string' ? o.n : typeof o.name === 'string' ? o.name : '';
    const email = typeof o.e === 'string' ? o.e : typeof o.email === 'string' ? o.email : '';
    const pRaw = typeof o.p === 'string' ? o.p : typeof o.phone === 'string' ? o.phone : '';
    const cRaw = typeof o.c === 'string' ? o.c : typeof o.cpf === 'string' ? o.cpf : '';
    if (!name.trim() || !email.trim() || !pRaw || !cRaw) return null;
    return {
      name: name.trim(),
      email: email.trim(),
      phone: formatPhoneForForm(pRaw),
      cpf: formatCpfForForm(cRaw),
    };
  } catch {
    return null;
  }
};

type PriorOrderPrefill = {
  status: 'loading' | 'ready' | 'error' | 'no_id';
  errorMessage?: string;
  partial: Partial<CheckoutData> | null;
  orderId: string | null;
};

const buildInitialPriorOrderPrefill = (): PriorOrderPrefill => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId')?.trim() || params.get('order_id')?.trim() || null;
  const fromCheckoutMain = decodeCustomerPrefillParam(params.get('prefill'));
  if (fromCheckoutMain && hasCoreCustomerFields(fromCheckoutMain)) {
    return {status: 'ready', partial: fromCheckoutMain, orderId, errorMessage: undefined};
  }
  if (orderId) return {status: 'loading', partial: null, orderId};
  return {status: 'no_id', partial: null, orderId: null};
};

// --- Components ---

const CheckoutHeader = () => (
  <header className="bg-white border-b border-slate-200 py-3 md:py-4 mb-6 md:mb-8 sticky top-0 z-50">
    <div className="max-w-4xl mx-auto px-5 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 md:w-8 md:h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white font-black text-base md:text-lg">B</div>
        <span className="font-display text-sm md:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">BIONUTRI <span className="text-rose-600">TESTO HARD</span></span>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        <ShieldCheck size={12} className="text-green-500 md:w-[14px] md:h-[14px]" /> <span className="hidden xs:inline">Checkout</span> Seguro
      </div>
    </div>
  </header>
);

const PixIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="currentColor">
    <path d="M11.917 11.71a2.046 2.046 0 0 1-1.454-.602l-2.1-2.1a.4.4 0 0 0-.551 0l-2.108 2.108a2.044 2.044 0 0 1-1.454.602h-.414l2.66 2.66c.83.83 2.177.83 3.007 0l2.667-2.668h-.253zM4.25 4.282c.55 0 1.066.214 1.454.602l2.108 2.108a.39.39 0 0 0 .552 0l2.1-2.1a2.044 2.044 0 0 1 1.453-.602h.253L9.503 1.623a2.127 2.127 0 0 0-3.007 0l-2.66 2.66h.414z" />
    <path d="m14.377 6.496-1.612-1.612a.307.307 0 0 1-.114.023h-.733c-.379 0-.75.154-1.017.422l-2.1 2.1a1.005 1.005 0 0 1-1.425 0L5.268 5.32a1.448 1.448 0 0 0-1.018-.422h-.9a.306.306 0 0 1-.109-.021L1.623 6.496c-.83.83-.83 2.177 0 3.008l1.618 1.618a.305.305 0 0 1 .108-.022h.901c.38 0 .75-.153 1.018-.421L7.375 8.57a1.034 1.034 0 0 1 1.426 0l2.1 2.1c.267.268.638.421 1.017.421h.733c.04 0 .079.01.114.024l1.612-1.612c.83-.83.83-2.178 0-3.008z" />
  </svg>
);

const Checkout = ({
  items,
  onBack,
  priorOrderPrefill,
}: {
  items: UpsellOffer[];
  onBack: () => void;
  priorOrderPrefill: PriorOrderPrefill;
}) => {
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>(
    () => Object.fromEntries(items.map((item) => [item.id, 1]))
  );
  const [formData, setFormData] = useState<CheckoutData>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isCreatingPixCharge, setIsCreatingPixCharge] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [pixCharge, setPixCharge] = useState<PixChargeResult | null>(null);
  const [isPixCopied, setIsPixCopied] = useState(false);
  const getItemQuantity = (itemId: number) => itemQuantities[itemId] ?? 1;
  const updateItemQuantity = (itemId: number, delta: number) => {
    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(1, (prev[itemId] ?? 1) + delta),
    }));
  };
  const totalUnits = items.reduce((acc, item) => acc + getItemQuantity(item.id), 0);
  const subtotalValue = items.reduce(
    (acc, item) => acc + (parseFloat(item.price.replace(',', '.')) * getItemQuantity(item.id)),
    0
  );
  const subtotalPrice = subtotalValue.toFixed(2).replace('.', ',');
  const totalPrice = subtotalPrice;
  const checkoutItems: CheckoutLineItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    value: Math.round(parseFloat(item.price.replace(',', '.')) * 100),
    quantity: getItemQuantity(item.id),
  }));

  useEffect(() => {
    if (priorOrderPrefill.status !== 'ready' || !priorOrderPrefill.partial) return;
    const p = priorOrderPrefill.partial;
    setFormData((prev) => ({
      ...prev,
      name: p.name ?? prev.name,
      email: p.email ?? prev.email,
      phone: p.phone ?? prev.phone,
      cpf: p.cpf ?? prev.cpf,
      cep: p.cep ?? prev.cep,
      address: p.address ?? prev.address,
      number: p.number ?? prev.number,
      complement: p.complement ?? prev.complement,
      neighborhood: p.neighborhood ?? prev.neighborhood,
      city: p.city ?? prev.city,
      state: p.state ?? prev.state,
    }));
  }, [priorOrderPrefill.status, priorOrderPrefill.partial]);

  const priorOrderBlocking =
    Boolean(priorOrderPrefill.orderId) && priorOrderPrefill.status === 'loading';

  const usePriorCustomerOnly =
    priorOrderPrefill.status === 'ready' &&
    hasCoreCustomerFields({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf: formData.cpf,
    });

  useEffect(() => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      const fetchAddress = async () => {
        setIsFetchingCep(true);
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await response.json();
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              address: data.logradouro || prev.address,
              neighborhood: data.bairro || prev.neighborhood,
              city: data.localidade || prev.city,
              state: data.uf || prev.state,
            }));
            const numberInput = document.getElementsByName('number')[0] as HTMLInputElement;
            if (numberInput) numberInput.focus();
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error);
        } finally {
          setIsFetchingCep(false);
        }
      };
      fetchAddress();
    }
  }, [formData.cep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === 'cep') {
      formattedValue = value.replace(/\D/g, '').slice(0, 8);
      if (formattedValue.length > 5) formattedValue = `${formattedValue.slice(0, 5)}-${formattedValue.slice(5)}`;
    } else if (name === 'cpf') {
      formattedValue = value.replace(/\D/g, '').slice(0, 11);
      if (formattedValue.length > 9) formattedValue = `${formattedValue.slice(0, 3)}.${formattedValue.slice(3, 6)}.${formattedValue.slice(6, 9)}-${formattedValue.slice(9)}`;
      else if (formattedValue.length > 6) formattedValue = `${formattedValue.slice(0, 3)}.${formattedValue.slice(3, 6)}.${formattedValue.slice(6)}`;
      else if (formattedValue.length > 3) formattedValue = `${formattedValue.slice(0, 3)}.${formattedValue.slice(3)}`;
    } else if (name === 'phone') {
      formattedValue = value.replace(/\D/g, '').slice(0, 11);
      if (formattedValue.length > 10) formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2, 7)}-${formattedValue.slice(7)}`;
      else if (formattedValue.length > 6) formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2, 6)}-${formattedValue.slice(6)}`;
      else if (formattedValue.length > 2) formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2)}`;
      else if (formattedValue.length > 0) formattedValue = `(${formattedValue}`;
    }
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const createPixCharge = async () => {
    setIsCreatingPixCharge(true);
    setPaymentError('');
    setPixCharge(null);

    try {
      const response = await fetch('/api/pix/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: normalizePhoneForApi(formData.phone),
          cpf: formData.cpf.replace(/\D/g, ''),
          lineItems: checkoutItems,
          totalValue: Math.round(subtotalValue * 100),
          utm: getUtmPayload(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        const msg = result?.message ?? 'Não foi possível criar a cobrança PIX.';
        const hint = result?.hint;
        setPaymentError(hint ? `${msg}\n\n${hint}` : msg);
        return false;
      }

      const pixData = parsePixChargeResult(result);
      if (!pixData) {
        const preview = JSON.stringify(result).slice(0, 300);
        throw new Error(
          'Cobrança criada, mas o formato da resposta da Fruitfy não foi reconhecido. Se o PIX apareceu no painel, pague por lá. Detalhes: ' + preview
        );
      }

      setPixCharge(pixData);
      return true;
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Erro ao criar pagamento PIX.');
      return false;
    } finally {
      setIsCreatingPixCharge(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (priorOrderBlocking) return;
    const isPixReady = await createPixCharge();
    if (!isPixReady) return;
    setStep('payment');
    window.scrollTo(0, 0);
  };

  const copyPixCode = async () => {
    if (!pixCharge?.pixCode) {
      setPaymentError('Código PIX indisponível.');
      return;
    }
    try {
      await navigator.clipboard.writeText(pixCharge.pixCode);
      setIsPixCopied(true);
      setTimeout(() => setIsPixCopied(false), 2500);
    } catch {
      setPaymentError('Não foi possível copiar o código PIX.');
    }
  };

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <CheckoutHeader />
        <div className="max-w-xl mx-auto px-5">
          <button onClick={() => setStep('form')} className="flex items-center gap-2 text-slate-500 mb-8 hover:text-slate-800 transition-colors">
            <ArrowLeft size={20} /> Voltar para os dados
          </button>
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-6">
              <QrCode size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2 uppercase italic">Pague com PIX</h2>
            <p className="text-slate-500 text-sm mb-4">Escaneie o QR Code ou copie o código abaixo para finalizar seu pedido ({totalUnits} unidade{totalUnits > 1 ? 's' : ''}).</p>
            <div className="mb-8">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Valor Total</span>
              <span className="text-3xl font-black text-rose-600 italic">R$ {totalPrice}</span>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl mb-8 flex flex-col items-center">
              <img src={pixCharge?.qrCodeUrl ?? 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=erro-ao-gerar-pix'} alt="QR Code PIX" className="w-48 h-48 mb-4" referrerPolicy="no-referrer" />
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Aguardando pagamento...</p>
              {pixCharge?.orderId && <p className="text-[10px] text-slate-400 mt-2">Pedido: {pixCharge.orderId}</p>}
            </div>
            <button onClick={copyPixCode} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 mb-4 transition-colors ${isPixCopied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              <Copy size={18} /> {isPixCopied ? 'COPIADO' : 'COPIAR CÓDIGO PIX'}
            </button>
            {paymentError && <p className="mt-2 text-xs text-red-600 font-bold whitespace-pre-line">{paymentError}</p>}
            <div className="text-left bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="text-blue-800 font-bold text-xs uppercase mb-2 flex items-center gap-2"><Zap size={14} /> Como pagar?</h4>
              <ol className="text-[11px] text-blue-700 space-y-1 list-decimal ml-4">
                <li>Abra o app do seu banco</li>
                <li>Escolha a opção PIX &gt; Copia e Cola</li>
                <li>Cole o código e finalize</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <CheckoutHeader />
      <div className="max-w-4xl mx-auto px-5">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 mb-8 hover:text-slate-800 transition-colors">
          <ArrowLeft size={20} /> Voltar para as ofertas
        </button>
        <div className="flex flex-col md:grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 md:order-last">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 md:sticky md:top-24">
              <h3 className="text-sm font-black mb-6 uppercase italic border-b border-slate-100 pb-4">Produto Selecionado</h3>
              <div className="space-y-4 mb-6">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-contain rounded-lg bg-slate-50 p-1 shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <h4 className="font-bold text-[11px] leading-tight">{item.name}</h4>
                      <p className="text-[10px] text-slate-500">R$ {item.price} / un.</p>
                    </div>
                    <div className="inline-flex items-center rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.id, -1)}
                        className="w-8 h-8 bg-slate-50 text-slate-700 font-black text-base hover:bg-slate-100 transition-colors"
                        aria-label={`Diminuir quantidade de ${item.name}`}
                      >
                        -
                      </button>
                      <span className="w-8 h-8 flex items-center justify-center text-xs font-black text-slate-900">
                        {getItemQuantity(item.id)}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.id, 1)}
                        className="w-8 h-8 bg-slate-50 text-slate-700 font-black text-base hover:bg-slate-100 transition-colors"
                        aria-label={`Aumentar quantidade de ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mt-0 mb-4">
                O <span className="font-bold text-slate-900">Testo Hard</span> trabalha por dentro. O <span className="font-bold text-slate-900">Hard Boost Gel</span> entrega resposta na hora H — juntos viram o combo que homens experientes não abrem mão.
              </p>
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Subtotal ({totalUnits} un.)</span>
                  <span className="font-bold">R$ {subtotalPrice}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Frete</span>
                  <span className="text-green-600 font-bold uppercase">Grátis</span>
                </div>
                <div className="flex justify-between text-lg font-black pt-4 border-t border-slate-100">
                  <span>TOTAL</span>
                  <span className="text-rose-600 uppercase italic">R$ {totalPrice}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {priorOrderPrefill.orderId && priorOrderPrefill.status === 'loading' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Carregando dados do seu pedido anterior…
                </div>
              )}
              {priorOrderPrefill.orderId && priorOrderPrefill.status === 'error' && priorOrderPrefill.errorMessage && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {priorOrderPrefill.errorMessage} Preencha os dados manualmente abaixo.
                </div>
              )}
              {usePriorCustomerOnly && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-emerald-100">
                  <h3 className="text-lg font-black mb-4 flex items-center gap-2 uppercase italic text-emerald-800">
                    <User size={20} className="text-emerald-600" /> Seus dados (pedido anterior)
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Usaremos estes dados para gerar o PIX do upsell — você não precisa digitar de novo.
                  </p>
                  <dl className="space-y-2 text-sm text-slate-800">
                    <div><span className="font-bold text-slate-500">Nome:</span> {formData.name}</div>
                    <div><span className="font-bold text-slate-500">E-mail:</span> {formData.email}</div>
                    <div><span className="font-bold text-slate-500">WhatsApp:</span> {formData.phone}</div>
                    <div><span className="font-bold text-slate-500">CPF:</span> {formData.cpf}</div>
                    {priorOrderPrefill.orderId && (
                      <div className="text-[11px] text-slate-400 pt-2">Referência: pedido {priorOrderPrefill.orderId}</div>
                    )}
                  </dl>
                </div>
              )}
              {!usePriorCustomerOnly && (
                <>
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic"><User size={20} className="text-rose-600" /> Dados Pessoais</h3>
                    <div className="grid gap-4">
                      <input required name="name" placeholder="Nome Completo" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors" value={formData.name} onChange={handleInputChange} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required type="email" name="email" placeholder="E-mail" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors" value={formData.email} onChange={handleInputChange} />
                        <input required name="phone" placeholder="WhatsApp" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors" value={formData.phone} onChange={handleInputChange} />
                      </div>
                      <input required name="cpf" placeholder="CPF" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors" value={formData.cpf} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic"><MapPin size={20} className="text-rose-600" /> Endereço</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <input required name="cep" placeholder="CEP" className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors ${isFetchingCep ? 'opacity-50' : ''}`} value={formData.cep} onChange={handleInputChange} />
                          {isFetchingCep && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div></div>}
                        </div>
                        <input required name="city" placeholder="Cidade" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors" value={formData.city} onChange={handleInputChange} />
                      </div>
                      <input required name="address" placeholder="Endereço" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors" value={formData.address} onChange={handleInputChange} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input required name="number" placeholder="Número" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors" value={formData.number} onChange={handleInputChange} />
                        <input name="complement" placeholder="Complemento" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors" value={formData.complement} onChange={handleInputChange} />
                      </div>
                    </div>
                  </div>

                  {formData.cep.replace(/\D/g, '').length >= 8 && (
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                      <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic">
                        <Truck size={20} className="text-rose-600" /> Opção de Entrega
                      </h3>
                      <div className="p-4 rounded-2xl border-2 border-rose-600 bg-rose-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full border-2 border-rose-600 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                          </div>
                          <div className="text-left">
                            <span className="block font-bold text-slate-800 text-sm">Frete Grátis</span>
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Será enviado junto com o pedido anterior</span>
                          </div>
                        </div>
                        <span className="text-green-600 font-black text-sm uppercase italic">Grátis</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {usePriorCustomerOnly && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic">
                    <Truck size={20} className="text-rose-600" /> Entrega
                  </h3>
                  <div className="p-4 rounded-2xl border-2 border-rose-600 bg-rose-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-rose-600 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-slate-800 text-sm">Frete Grátis</span>
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Envio junto com seu pedido anterior</span>
                      </div>
                    </div>
                    <span className="text-green-600 font-black text-sm uppercase italic">Grátis</span>
                  </div>
                </div>
              )}

              {/* Pagamento - Somente PIX */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic">
                  <CreditCard size={20} className="text-rose-600" /> Forma de Pagamento
                </h3>
                <div className="p-5 border-2 border-rose-600 bg-gradient-to-br from-rose-50 to-white rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-rose-600 bg-white">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div>
                    </div>
                    <div>
                      <span className="block font-black text-slate-800 text-sm md:text-base">PIX (Aprovação Imediata)</span>
                      <span className="block text-[10px] text-rose-600 font-bold uppercase tracking-wider">Liberação instantânea do pedido</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1">
                    <PixIcon className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                    <span className="text-[10px] md:text-xs font-black uppercase text-emerald-700 tracking-wide">PIX</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingPixCharge || priorOrderBlocking}
                className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {priorOrderBlocking
                  ? 'CARREGANDO DADOS...'
                  : isCreatingPixCharge
                    ? 'GERANDO PIX...'
                    : 'FINALIZAR PEDIDO'}{' '}
                <ArrowRight size={24} />
              </button>
              {paymentError && <p className="text-xs text-red-600 font-bold -mt-2 whitespace-pre-line">{paymentError}</p>}

              {/* Testimonials Section */}
              <div className="pt-8 space-y-6">
                <h4 className="text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">O que outros homens estão dizendo</h4>
                
                <div className="space-y-4">
                  {[
                    {
                      name: "Ricardo S.",
                      text: "Testo Hard no dia a dia + gel na hora certa. Parece exagero até você sentir a diferença na prática. Virou meu padrão.",
                      product: "COMBO"
                    },
                    {
                      name: "Carlos M.",
                      text: "Eu já tinha energia com o suplemento. O gel foi o que faltava pra eu parar de me preocupar no momento. Confiança absurda.",
                      product: "HARD BOOST"
                    },
                    {
                      name: "João Paulo",
                      text: "Aplicação rápida, sensação forte, firmeza que eu não esperava naquele timing. Melhor upsell que já peguei.",
                      product: "HARD BOOST GEL"
                    },
                    {
                      name: "Marcos V.",
                      text: "Milhares falam de suplemento. Poucos falam do que resolve na hora. Esse gel é o atalho que eu queria há anos.",
                      product: "PERFORMANCE"
                    },
                    {
                      name: "Felipe T.",
                      text: "Junto com Testo Hard ficou ridículo de bom. Por dentro e por fora. Não volto atrás.",
                      product: "TESTO + GEL"
                    }
                  ].map((testimonial, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-1 mb-2">
                        {[1,2,3,4,5].map(i => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}
                      </div>
                      <p className="text-xs text-slate-600 italic mb-2">"{testimonial.text}"</p>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">{testimonial.name}</span>
                        <span className="text-[9px] font-bold text-rose-600 uppercase bg-rose-50 px-2 py-0.5 rounded-full">{testimonial.product}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Oferta única: Hard Boost Gel — complemento imediato ao Testo Hard
const HARD_BOOST_GEL_UPSELL: UpsellOffer = {
  id: 1,
  name: "HARD BOOST GEL — ESTIMULANTE MASCULINO",
  description: "Gel estimulante para aplicar antes do momento: sensação imediata, mais sensibilidade e performance potencializada.",
  price: "37,90",
  image: "https://i.ibb.co/WpvcFWVr/image.png",
  benefit: "1 unidade",
  icon: <Flame size={32} className="text-orange-500" />
};

const UpsellPage = () => {
  const [view, setView] = useState<'selection' | 'checkout' | 'pix'>('selection');
  const [priorOrderPrefill, setPriorOrderPrefill] = useState<PriorOrderPrefill>(buildInitialPriorOrderPrefill);
  const [ctaPixCharge, setCtaPixCharge] = useState<PixChargeResult | null>(null);
  const [ctaPixError, setCtaPixError] = useState('');
  const [ctaPixLoading, setCtaPixLoading] = useState(false);
  const [ctaPixCopied, setCtaPixCopied] = useState(false);
  const [hadPrefillQuery] = useState(() => Boolean(new URLSearchParams(window.location.search).get('prefill')?.trim()));

  useEffect(() => {
    if (priorOrderPrefill.status !== 'loading' || !priorOrderPrefill.orderId) return undefined;
    const oid = priorOrderPrefill.orderId;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/order/${encodeURIComponent(oid)}`, {
          headers: {Accept: 'application/json'},
        });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          const msg =
            (json && typeof json === 'object' && 'message' in json && typeof (json as {message?: string}).message === 'string'
              ? (json as {message: string}).message
              : null) ?? 'Não foi possível carregar o pedido anterior.';
          setPriorOrderPrefill({
            status: 'error',
            partial: null,
            orderId: oid,
            errorMessage: msg,
          });
          return;
        }
        const partial = extractCustomerFromOrderJson(json);
        setPriorOrderPrefill({
          status: 'ready',
          partial: Object.keys(partial).length ? partial : null,
          orderId: oid,
        });
      } catch {
        if (!cancelled) {
          setPriorOrderPrefill({
            status: 'error',
            partial: null,
            orderId: oid,
            errorMessage: 'Falha de rede ao consultar o pedido.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [priorOrderPrefill.status, priorOrderPrefill.orderId]);

  const selectionCtaDisabled = priorOrderPrefill.status === 'loading';

  const customerForPix = priorOrderPrefill.partial;
  const canGeneratePixFromPrior =
    priorOrderPrefill.status === 'ready' && customerForPix && hasCoreCustomerFields(customerForPix);

  const hardBoostUnit = parseFloat(HARD_BOOST_GEL_UPSELL.price.replace(',', '.'));
  const hardBoostLineItems: CheckoutLineItem[] = [
    {
      id: HARD_BOOST_GEL_UPSELL.id,
      name: HARD_BOOST_GEL_UPSELL.name,
      value: Math.round(hardBoostUnit * 100),
      quantity: 1,
    },
  ];

  const handleMainCta = async () => {
    if (!canGeneratePixFromPrior || !customerForPix) {
      setView('checkout');
      window.scrollTo(0, 0);
      return;
    }

    setCtaPixLoading(true);
    setCtaPixError('');
    setCtaPixCharge(null);

    try {
      const response = await fetch('/api/pix/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: (customerForPix.name ?? '').trim(),
          email: (customerForPix.email ?? '').trim(),
          phone: normalizePhoneForApi(customerForPix.phone ?? ''),
          cpf: (customerForPix.cpf ?? '').replace(/\D/g, ''),
          lineItems: hardBoostLineItems,
          totalValue: Math.round(hardBoostUnit * 100),
          utm: getUtmPayload(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        const msg = result?.message ?? 'Não foi possível criar a cobrança PIX.';
        const hint = result?.hint;
        setCtaPixError(hint ? `${msg}\n\n${hint}` : msg);
        return;
      }

      const pixData = parsePixChargeResult(result);
      if (!pixData) {
        setCtaPixError('Resposta da Fruitfy em formato inesperado. Tente o checkout manual abaixo.');
        return;
      }

      setCtaPixCharge(pixData);
      setView('pix');
      window.scrollTo(0, 0);
    } catch (e) {
      setCtaPixError(e instanceof Error ? e.message : 'Erro ao gerar PIX.');
    } finally {
      setCtaPixLoading(false);
    }
  };

  const copyCtaPixCode = async () => {
    if (!ctaPixCharge?.pixCode) return;
    try {
      await navigator.clipboard.writeText(ctaPixCharge.pixCode);
      setCtaPixCopied(true);
      setTimeout(() => setCtaPixCopied(false), 2500);
    } catch {
      setCtaPixError('Não foi possível copiar o código PIX.');
    }
  };

  if (view === 'checkout') {
    return (
      <Checkout
        items={[HARD_BOOST_GEL_UPSELL]}
        onBack={() => setView('selection')}
        priorOrderPrefill={priorOrderPrefill}
      />
    );
  }

  if (view === 'pix' && ctaPixCharge) {
    const totalLabel = HARD_BOOST_GEL_UPSELL.price;
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <CheckoutHeader />
        <div className="max-w-xl mx-auto px-5">
          <button
            type="button"
            onClick={() => {
              setView('selection');
              setCtaPixCharge(null);
              setCtaPixError('');
            }}
            className="flex items-center gap-2 text-slate-500 mb-8 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={20} /> Voltar à oferta
          </button>
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-6">
              <QrCode size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2 uppercase italic">Pague com PIX</h2>
            <p className="text-slate-500 text-sm mb-4">
              Cobrança do <span className="font-bold text-slate-800">Hard Boost Gel</span> — finalize no app do banco.
            </p>
            <div className="mb-8">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Valor</span>
              <span className="text-3xl font-black text-rose-600 italic">R$ {totalLabel}</span>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl mb-8 flex flex-col items-center">
              <img
                src={ctaPixCharge.qrCodeUrl}
                alt="QR Code PIX"
                className="w-48 h-48 mb-4"
                referrerPolicy="no-referrer"
              />
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Aguardando pagamento...</p>
              {ctaPixCharge.orderId ? (
                <p className="text-[10px] text-slate-400 mt-2">Pedido: {ctaPixCharge.orderId}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={copyCtaPixCode}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 mb-4 transition-colors ${
                ctaPixCopied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Copy size={18} /> {ctaPixCopied ? 'COPIADO' : 'COPIAR CÓDIGO PIX'}
            </button>
            {ctaPixError ? <p className="text-xs text-red-600 font-bold whitespace-pre-line">{ctaPixError}</p> : null}
            <div className="text-left bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="text-blue-800 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                <Zap size={14} /> Como pagar?
              </h4>
              <ol className="text-[11px] text-blue-700 space-y-1 list-decimal ml-4">
                <li>Abra o app do seu banco</li>
                <li>Escolha PIX &gt; Copia e Cola ou QR Code</li>
                <li>Finalize o pagamento</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 py-3 md:py-4 mb-5 text-center">
        <div className="max-w-4xl mx-auto px-5">
          <div className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white font-black text-lg">B</div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">BIONUTRI <span className="text-rose-600">TESTO HARD</span></span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 space-y-7 pb-8">
        {/* Gancho — chamada máxima */}
        <section className="text-center space-y-4">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-red-900/40 border-2 border-amber-400 ring-4 ring-amber-400/25">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-rose-600 to-orange-500" aria-hidden />
            <div
              className="absolute inset-0 opacity-[0.12] bg-[length:14px_14px] bg-[linear-gradient(90deg,rgba(255,255,255,.15)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.15)_1px,transparent_1px)]"
              aria-hidden
            />
            <div className="relative py-5 px-4 md:py-6 md:px-6 text-center">
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.35em] text-amber-200/95 mb-3">
                ⚠ Alerta — não ignore
              </p>
              <p className="font-black text-base sm:text-lg md:text-xl lg:text-2xl uppercase leading-[1.15] tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.35)] flex flex-wrap items-center justify-center gap-2">
                <span className="text-2xl md:text-3xl animate-pulse drop-shadow-md" aria-hidden>
                  ⚠️
                </span>
                <span>
                  ESPERE — <span className="text-amber-100">NÃO SAIA</span> DESTA PÁGINA
                </span>
              </p>
              <p className="font-black text-lg sm:text-xl md:text-2xl lg:text-3xl uppercase leading-tight mt-3 md:mt-4 text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.4)]">
                ISSO PODE MUDAR{' '}
                <span className="text-amber-200 underline decoration-amber-300 decoration-[3px] underline-offset-[5px] md:decoration-4 md:underline-offset-[7px]">
                  COMPLETAMENTE
                </span>
                <br className="sm:hidden" />
                <span className="sm:ml-1"> SUA PERFORMANCE</span>
              </p>
              <p className="mt-3 md:mt-4 text-[10px] md:text-xs font-bold uppercase tracking-wide text-white/90 max-w-md mx-auto leading-snug">
                Última chance nesta tela — o próximo passo separa quem fica na média de quem <span className="text-amber-200 font-black">domina na hora H</span>.
              </p>
            </div>
          </div>
          <p className="inline-block bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
            Testo Hard: pedido aprovado ✓
          </p>
          {priorOrderPrefill.orderId && priorOrderPrefill.status === 'loading' && (
            <p className="text-sm text-slate-600 font-semibold max-w-lg mx-auto">
              Carregando seus dados do pedido anterior…
            </p>
          )}
          {hadPrefillQuery && canGeneratePixFromPrior && (
            <p className="text-sm text-emerald-800 font-semibold max-w-lg mx-auto bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              Dados do checkout Testo Hard recebidos. Ao clicar no botão abaixo, o PIX do gel é gerado na hora — sem digitar de novo.
            </p>
          )}
          {priorOrderPrefill.orderId &&
            priorOrderPrefill.status === 'error' &&
            priorOrderPrefill.errorMessage &&
            !canGeneratePixFromPrior && (
            <p className="text-sm text-amber-800 font-semibold max-w-lg mx-auto bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              {priorOrderPrefill.errorMessage} Você poderá preencher manualmente no checkout.
            </p>
          )}
          {priorOrderPrefill.orderId &&
            priorOrderPrefill.status === 'ready' &&
            priorOrderPrefill.partial &&
            hasCoreCustomerFields(priorOrderPrefill.partial) &&
            !hadPrefillQuery && (
              <p className="text-sm text-emerald-800 font-semibold max-w-lg mx-auto bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                Dados do seu último pedido carregados — no checkout o PIX será gerado sem você digitar tudo de novo.
              </p>
            )}
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
            Falta o <span className="text-rose-600 italic">ataque final</span>: resposta na hora H, não “só um dia bom”.
          </h1>
          <p className="text-sm md:text-base text-slate-600 font-semibold max-w-xl mx-auto">
            <span className="text-slate-900 font-bold">Testo Hard</span> é o motor diário.{' '}
            <span className="text-orange-600 font-black">Hard Boost Gel</span> é o nitro no pedal certo — quando o jogo tá valendo.
          </p>
        </section>

        {/* Produto + benefícios absurdos (detalhados) */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border-2 border-orange-300/80 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-400/15 rounded-full blur-2xl" aria-hidden />
          <div className="flex flex-col items-center text-center mb-6">
            <a
              href="https://ibb.co/7NtGVJk3"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-gradient-to-b from-orange-50 to-white p-6 md:p-8 ring-2 ring-orange-200 shadow-md hover:ring-orange-400 transition-all"
            >
              <img
                src={HARD_BOOST_GEL_UPSELL.image}
                alt="Hard Boost Gel"
                className="w-52 h-52 sm:w-60 sm:h-60 md:w-72 md:h-72 object-contain"
                referrerPolicy="no-referrer"
              />
            </a>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Flame className="w-7 h-7 text-orange-500" aria-hidden />
              <h2 className="text-2xl md:text-3xl font-black uppercase italic text-slate-900">Hard Boost Gel</h2>
              <Flame className="w-7 h-7 text-orange-500" aria-hidden />
            </div>
            <p className="text-orange-600 font-black text-xs md:text-sm uppercase tracking-wide mt-1">
              O que homem experiente não conta — mas usa
            </p>
            <p className="text-slate-600 text-sm mt-3 max-w-md font-medium">
              Gel estimulante pra você sentir <span className="font-black text-slate-900">ação na pele</span>,{' '}
              <span className="font-black text-slate-900">resposta brutal na hora</span> e{' '}
              <span className="font-black text-slate-900">presença de quem manda</span>. Aplica direto antes do momento.
            </p>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center mb-3">O que você sente (de verdade)</p>
          <ul className="space-y-4 max-w-lg mx-auto">
            {[
              {
                t: 'Sensação de ereção imediata',
                s: 'Quando o relógio não espera e você precisa estar no jogo — sem “tomara que role”.',
              },
              {
                t: 'Aumento da sensibilidade',
                s: 'Cada detalhe vira vantagem. Intensidade que você nota na primeira linha.',
              },
              {
                t: 'Mais firmeza e intensidade',
                s: 'Performance que não negocia. Firmeza que transmite controle e confiança.',
              },
            ].map((item, i) => (
              <li key={i} className="flex gap-3 text-left">
                <Check className="text-emerald-500 shrink-0 w-6 h-6 mt-0.5" size={22} />
                <span>
                  <span className="font-black text-slate-900 text-sm md:text-base block">{item.t}</span>
                  <span className="text-slate-600 text-xs md:text-sm">{item.s}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* Modo turbo — os 3 fogo */}
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-200 mb-3 text-center">
              Benefícios em modo absurdo
            </p>
            <ul className="space-y-2.5 text-sm md:text-base font-bold">
              {[
                '🔥 Mais firmeza — presença que não pede licença.',
                '🔥 Mais controle — você comanda o ritmo, não o nervosismo.',
                '🔥 Mais confiança — a insegurança some da fila.',
              ].map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Mecanismo — curto, punchy */}
        <section className="rounded-2xl bg-slate-900 text-white p-5 md:p-6 border border-slate-700">
          <p className="text-slate-300 text-sm leading-relaxed">
            <span className="text-white font-bold">Testo Hard</span> trabalha de dentro pra fora ao longo do dia.{' '}
            <span className="text-orange-400 font-black">Hard Boost Gel</span> entra como gatilho externo no minuto decisivo — quando “preparado no geral” não basta.
          </p>
          <p className="text-white font-bold text-sm mt-3 flex items-start gap-2">
            <span className="text-xl shrink-0">👉</span>
            Por isso milhares usam os dois juntos: fundação + explosão no timing certo.
          </p>
        </section>

        {/* Oferta + CTA */}
        <section className="rounded-3xl p-6 md:p-8 bg-gradient-to-b from-slate-900 via-rose-900 to-rose-800 text-white border-2 border-amber-500/50 shadow-2xl">
          <p className="text-amber-300 font-black text-[10px] md:text-xs uppercase tracking-widest text-center mb-2">
            ⚠️ Oferta exclusiva nesta página — não repete
          </p>
          <p className="text-center text-white/85 text-sm font-semibold mb-5">
            Ou fecha agora ou assume ficar só na metade do potencial. Simples assim.
          </p>
          <div className="text-center mb-6">
            <p className="text-slate-500 text-sm font-bold line-through decoration-rose-400">De R$ 97,90</p>
            <p className="text-white text-xs font-black uppercase tracking-widest mt-2">por apenas</p>
            <p className="text-4xl md:text-5xl font-black mt-1 text-amber-200">R$ 37,90</p>
            <p className="text-orange-200 font-black text-xs uppercase mt-2">🔥 Hard Boost Gel</p>
          </div>
          <button
            type="button"
            disabled={selectionCtaDisabled || ctaPixLoading}
            onClick={() => void handleMainCta()}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white py-5 rounded-2xl font-black text-sm md:text-base flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-emerald-600"
          >
            {selectionCtaDisabled ? (
              <>CARREGANDO SEUS DADOS…</>
            ) : ctaPixLoading ? (
              <>GERANDO PIX…</>
            ) : canGeneratePixFromPrior ? (
              <>🟢 SIM! GERAR MEU PIX AGORA <ArrowRight size={22} className="shrink-0" /></>
            ) : (
              <>🟢 SIM! QUERO POTENCIALIZAR MINHA PERFORMANCE AGORA <ArrowRight size={22} className="shrink-0" /></>
            )}
          </button>
          {ctaPixError ? (
            <p className="text-xs text-amber-200 font-bold text-center mt-3 whitespace-pre-line px-2">{ctaPixError}</p>
          ) : null}
          <p className="text-[9px] text-white/50 text-center mt-4 font-bold uppercase tracking-wider">
            Um dos complementos mais escolhidos com Testo Hard • checkout seguro
          </p>
        </section>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-rose-600 selection:text-white">
      <UpsellPage />
    </div>
  );
}

