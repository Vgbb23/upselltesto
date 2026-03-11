import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Zap,
  Flame,
  Award,
  Timer,
  Check,
  Truck,
  Star,
  User,
  MapPin,
  CreditCard,
  Copy,
  QrCode,
  ArrowLeft,
  Users
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

const Checkout = ({ items, onBack }: { items: UpsellOffer[]; onBack: () => void }) => {
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

  const normalizePhone = (phoneValue: string) => {
    const digits = phoneValue.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const getPixPayloadFromResponse = (payload: any): PixChargeResult | null => {
    if (!payload?.data) return null;
    const data = payload.data;
    const pixData = data.pix ?? {};

    const pickString = (...values: unknown[]) => {
      const firstValid = values.find((value) => typeof value === 'string' && value.trim().length > 0);
      return typeof firstValid === 'string' ? firstValid : '';
    };

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
      data.code
    );

    let qrCodeUrl = pickString(
      pixData.qr_code,
      pixData.qrCode,
      pixData.qrcode,
      data.qr_code,
      data.qrCode,
      data.qrcode
    );

    if (qrCodeUrl && !qrCodeUrl.startsWith('http') && !qrCodeUrl.startsWith('data:image')) {
      qrCodeUrl = `data:image/png;base64,${qrCodeUrl}`;
    }

    if (!qrCodeUrl && pixCode) {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;
    }

    if (!pixCode || !qrCodeUrl) return null;

    return {
      orderId: data.order_id ?? data.orderId ?? '',
      pixCode,
      qrCodeUrl,
    };
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
          phone: normalizePhone(formData.phone),
          cpf: formData.cpf.replace(/\D/g, ''),
          lineItems: checkoutItems,
          totalValue: Math.round(subtotalValue * 100),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message ?? 'Não foi possível criar a cobrança PIX.');
      }

      const pixData = getPixPayloadFromResponse(result);
      if (!pixData) {
        throw new Error('Cobrança criada, mas os dados PIX não foram retornados pela API.');
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
            {paymentError && <p className="mt-2 text-xs text-red-600 font-bold">{paymentError}</p>}
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

              {/* Opções de Frete - Aparece somente após preencher o CEP */}
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
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">7 a 12 dias úteis</span>
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

              <button type="submit" disabled={isCreatingPixCharge} className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {isCreatingPixCharge ? 'GERANDO PIX...' : 'FINALIZAR PEDIDO'} <ArrowRight size={24} />
              </button>
              {paymentError && <p className="text-xs text-red-600 font-bold -mt-2">{paymentError}</p>}

              {/* Testimonials Section */}
              <div className="pt-8 space-y-6">
                <h4 className="text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">O que outros homens estão dizendo</h4>
                
                <div className="space-y-4">
                  {[
                    {
                      name: "Ricardo S.",
                      text: "O MAX CONTROL mudou meu casamento. Eu não durava 2 minutos, agora o controle é total. Minha esposa nem acredita.",
                      product: "MAX CONTROL"
                    },
                    {
                      name: "Carlos M.",
                      text: "Sempre tive receio de falhar, mas com o MAXERECT a confiança voltou 100%. Ereção firme e rápida, recomendo demais.",
                      product: "MAXERECT"
                    },
                    {
                      name: "João Paulo",
                      text: "O HARDMAX realmente entrega o que promete. A rigidez é outro nível, parece que voltei aos meus 20 anos.",
                      product: "HARDMAX"
                    },
                    {
                      name: "Marcos V.",
                      text: "Impressionado com o MAXSIZE. Em poucas semanas já notei uma diferença real no volume. Vale cada centavo.",
                      product: "MAXSIZE"
                    },
                    {
                      name: "Felipe T.",
                      text: "Peguei o kit completo e não me arrependo. A performance na cama subiu de nível. É outro patamar de prazer.",
                      product: "COMBO BIONUTRI"
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

const UpsellPage = () => {
  const upsellOffers: UpsellOffer[] = [
    {
      id: 1,
      name: "MAX CONTROL",
      description: "PARE DE PASSAR VERGONHA: Domine o tempo e dure o quanto quiser. Seja o mestre da cama e deixe ela completamente exausta de tanto prazer.",
      price: "23,90",
      image: "https://i.ibb.co/tMyG4dqT/Chat-GPT-Image-Mar-11-2026-02-34-01-AM.png",
      benefit: "Dure 3x mais tempo",
      icon: <Timer size={32} className="text-rose-600" />
    },
    {
      id: 2,
      name: "MAXERECT",
      description: "POTÊNCIA EXPLOSIVA: Ereções instantâneas e rochosas que duram a noite toda. Recupere o vigor de um jovem de 18 anos e nunca mais falhe.",
      price: "25,90",
      image: "https://i.ibb.co/JFF708ff/Chat-GPT-Image-Mar-11-2026-02-39-00-AM.png",
      benefit: "Ereções de Aço",
      icon: <Zap size={32} className="text-rose-600" />
    },
    {
      id: 3,
      name: "HARDMAX",
      description: "RIGIDEZ DE AÇO: Sinta seu membro pulsar com uma força descomunal. Performance nível elite para quem não aceita menos que o topo.",
      price: "21,90",
      image: "https://i.ibb.co/gMcJj36t/Chat-GPT-Image-Mar-11-2026-02-37-27-AM.png",
      benefit: "Força Bruta",
      icon: <Flame size={32} className="text-rose-600" />
    },
    {
      id: 4,
      name: "MAXSIZE",
      description: "EXPANSÃO REAL E VISÍVEL: Aumente o volume e a espessura de forma impressionante. Cause impacto imediato e seja o homem que ela nunca vai esquecer.",
      price: "32,90",
      image: "https://i.ibb.co/fzNGmrWZ/Chat-GPT-Image-Mar-11-2026-02-41-53-AM.png",
      benefit: "Volume Máximo",
      icon: <Award size={32} className="text-rose-600" />
    },
    {
      id: 5,
      name: "COMBO MASTER BIONUTRI",
      description: "O PROTOCOLO COMPLETO: Leve os 4 produtos (Control, Erect, Hard e Size) e tenha o poder absoluto. A solução definitiva para quem quer ser um verdadeiro alfa na cama.",
      price: "69,90",
      image: "https://i.ibb.co/8ngHjftj/Chat-GPT-Image-Mar-11-2026-02-44-44-AM.png",
      benefit: "Kit Completo (4 em 1)",
      icon: <Users size={32} className="text-rose-600" />
    }
  ];

  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [view, setView] = useState<'selection' | 'checkout'>('selection');

  const toggleItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const totalUpsell = selectedItems.reduce((acc, id) => {
    const item = upsellOffers.find(o => o.id === id);
    return acc + (item ? parseFloat(item.price.replace(',', '.')) : 0);
  }, 0).toFixed(2).replace('.', ',');

  if (view === 'checkout') {
    return (
      <Checkout 
        items={upsellOffers.filter(o => selectedItems.includes(o.id))} 
        onBack={() => setView('selection')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 py-8 mb-8 text-center">
        <div className="max-w-4xl mx-auto px-5">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white font-black text-lg">B</div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">BIONUTRI <span className="text-rose-600">TESTO HARD</span></span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-2 uppercase italic leading-tight">
            <span className="text-green-600">PARABÉNS</span> PELA SUA COMPRA!
          </h1>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-lg font-medium">
            Agora que você já potencializou seus resultados no dia a dia, que tal potencializar <span className="text-rose-600 font-bold">ao máximo</span> seu desempenho sexual?
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5">
        <p className="text-center text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">Olha os itens que preparamos para você</p>
        <div className="bg-rose-600 text-white p-4 rounded-2xl mb-12 text-center animate-pulse shadow-lg shadow-rose-200">
          <p className="text-xs md:text-sm font-black uppercase tracking-widest">OFERTA ÚNICA: ADICIONE AGORA COM 80% DE DESCONTO!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {upsellOffers.map((offer) => (
            <div 
              key={offer.id}
              onClick={() => toggleItem(offer.id)}
              className={`group relative flex flex-col rounded-[2.5rem] border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                offer.id === 5 ? 'md:col-span-2 md:flex-row' : ''
              } ${
                selectedItems.includes(offer.id) 
                  ? 'bg-white border-rose-600 shadow-2xl ring-4 ring-rose-100 scale-[1.02]' 
                  : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {offer.id === 5 && (
                <div className="absolute top-0 left-0 bg-rose-600 text-white px-6 py-2 rounded-br-2xl font-black text-[10px] uppercase tracking-widest z-10 animate-pulse">
                  MELHOR CUSTO BENEFÍCIO
                </div>
              )}
              <div className={`bg-slate-50 flex items-center justify-center relative overflow-hidden border-slate-100 ${
                offer.id === 5 ? 'md:w-1/3 md:border-r border-b-0' : 'h-48 border-b'
              }`}>
                <img src={offer.image} alt={offer.name} className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                <div className={`absolute top-4 right-4 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  selectedItems.includes(offer.id) ? 'bg-rose-600 border-rose-600 scale-110' : 'bg-white border-slate-200'
                }`}>
                  {selectedItems.includes(offer.id) && <Check size={18} className="text-white" />}
                </div>
              </div>

              <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-slate-900 uppercase italic text-lg">{offer.name}</h3>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}
                  </div>
                </div>
                <p className="text-xs md:text-sm text-slate-500 mb-6 leading-relaxed font-medium flex-1">{offer.description}</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-green-100 text-green-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">{offer.benefit}</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold text-slate-400">R$</span>
                      <span className="text-3xl font-black text-slate-900 italic">{offer.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center mb-12">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Total Adicional Selecionado: <span className="text-rose-600 text-lg ml-2">R$ {totalUpsell}</span></p>
          <button 
            onClick={() => {
              if (selectedItems.length === 0) {
                alert('Selecione pelo menos um item para aproveitar a oferta!');
                return;
              }
              setView('checkout');
              window.scrollTo(0,0);
            }}
            className="w-full bg-rose-600 text-white py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-rose-200 hover:bg-rose-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            APROVEITAR OFERTA <ArrowRight size={28} />
          </button>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">
            Oferta exclusiva para clientes Bionutri
          </p>
        </div>
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

