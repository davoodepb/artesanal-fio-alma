import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CheckCircle2, ShoppingBag, ArrowLeft, CreditCard, Smartphone, Building2, Landmark, FileText, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { CartItem, PaymentMethod } from '@/types';

/* ───────── helpers: auto-notification on order ───────── */

/** Find or create the customer's chat conversation */
async function getOrCreateConversation(userId: string): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('customer_id', userId)
      .in('status', ['open', 'active'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('chat_conversations')
      .insert({ customer_id: userId, status: 'active' })
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  } catch (e) {
    console.error('getOrCreateConversation:', e);
    return null;
  }
}

/** Insert a system-style chat message into the user's conversation */
async function sendChatNotification(
  userId: string,
  conversationId: string,
  message: string,
) {
  try {
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_id: userId,
      sender_role: 'system',
      content: message,
    });
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  } catch (e) {
    console.error('sendChatNotification:', e);
  }
}

/** Full notification flow after order attempt */
async function notifyOrder(
  userId: string,
  success: boolean,
  orderId?: string,
  total?: number,
  cartItems?: CartItem[],
  paymentMethod?: string,
  errorDetail?: string,
) {
  const convId = await getOrCreateConversation(userId);
  if (!convId) return;

  if (success && orderId) {
    const code = orderId.slice(0, 8).toUpperCase();
    const itemLines = (cartItems || [])
      .map((i) => `  • ${i.product.name} ×${i.quantity}`)
      .join('\n');

    const paymentLabels: Record<string, string> = {
      mbway: 'MB WAY',
      card: 'Cartão',
      transfer: 'Transferência',
      multibanco: 'Multibanco',
      googlepay: 'Google Pay',
      paypal: 'PayPal',
    };

    await sendChatNotification(
      userId,
      convId,
      `✅ Pedido #${code} confirmado!\n` +
        `Total: €${(total ?? 0).toFixed(2)}\n` +
        (paymentMethod ? `Pagamento: ${paymentLabels[paymentMethod] || paymentMethod}\n` : '') +
        (itemLines ? `\nProdutos:\n${itemLines}\n` : '') +
        `\nObrigado pela sua compra! Iremos processar o seu pedido em breve.`,
    );

    // Call edge function for email + admin notification (fire-and-forget)
    supabase.functions
      .invoke('order-notification', {
        body: { orderId, userId },
      })
      .catch((err) => console.warn('order-notification edge fn:', err));

    // Send invoice email (fire-and-forget)
    supabase.functions
      .invoke('send-invoice-email', {
        body: { orderId },
      })
      .catch((err) => console.warn('send-invoice-email edge fn:', err));
  } else {
    await sendChatNotification(
      userId,
      convId,
      `❌ Houve um problema ao processar o seu pedido.\n` +
        (errorDetail ? `Motivo: ${errorDetail}\n` : '') +
        `Por favor tente novamente ou entre em contacto connosco através deste chat.`,
    );
  }
}

/* ───────── Payment method config ───────── */
const paymentMethodOptions: { value: PaymentMethod; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'mbway',
    label: 'MB WAY',
    description: 'Pagamento instantâneo pelo telemóvel',
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    value: 'card',
    label: 'Cartão de Crédito/Débito',
    description: 'Visa, Mastercard, American Express',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    value: 'transfer',
    label: 'Transferência Bancária',
    description: 'Transferência direta para a nossa conta',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    value: 'multibanco',
    label: 'Multibanco',
    description: 'Referência Multibanco para pagamento',
    icon: <Landmark className="h-5 w-5" />,
  },
  {
    value: 'googlepay',
    label: 'Google Pay',
    description: 'Pagamento rápido com Google Pay',
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    value: 'paypal',
    label: 'PayPal',
    description: 'Pagamento seguro via PayPal',
    icon: <CreditCard className="h-5 w-5" />,
  },
];

/* ───────── IVA config ───────── */
const IVA_RATE = 0.23;

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user, isEmailVerified } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Portugal');
  const [nif, setNif] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mbway');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const shipping = totalPrice >= 50 ? 0 : 4.99;
  const finalTotal = totalPrice + shipping;
  const baseAmount = finalTotal / (1 + IVA_RATE);
  const ivaAmount = finalTotal - baseAmount;

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
    } else if (!isEmailVerified) {
      toast.error('Verifique o seu email antes de fazer compras.');
      navigate(`/verify-otp?email=${encodeURIComponent(user.email || '')}&redirect=/checkout`);
    } else {
      setEmail(user.email || '');
    }
  }, [user, isEmailVerified, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone, address, email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          if (data.full_name) setFullName(data.full_name);
          if (data.phone) setPhone(data.phone);
          if (data.address) setAddress(data.address);
          if (data.email && !email) setEmail(data.email);
        }
      } catch (err) {
        // Ignore
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [user, email]);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      navigate('/cart');
    }
  }, [items, orderPlaced, navigate]);

  const generateInvoiceNumber = () => {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FAS-${datePart}-${randomPart}`;
  };

  const handlePlaceOrder = async () => {
    if (!user) return;
    if (!fullName.trim() || !email.trim() || !address.trim() || !city.trim() || !postalCode.trim() || !country.trim()) {
      toast.error('Preencha todos os dados obrigatórios de envio.');
      return;
    }
    if (!acceptTerms) {
      toast.error('Aceite os termos e condições para continuar.');
      return;
    }

    setLoading(true);
    try {
      // Verify session is still valid before proceeding
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        navigate('/login?redirect=/checkout');
        setLoading(false);
        return;
      }

      // Verify stock availability before creating the order
      for (const { product, quantity } of items) {
        const { data: currentProduct } = await supabase
          .from('products')
          .select('stock, name')
          .eq('id', product.id)
          .single();

        if (!currentProduct || currentProduct.stock < quantity) {
          toast.error(`Stock insuficiente para "${currentProduct?.name || product.name}". Disponível: ${currentProduct?.stock ?? 0}`);
          setLoading(false);
          return;
        }
      }

      const invNumber = generateInvoiceNumber();

      const baseOrderPayload = {
        user_id: user.id,
        status: 'pending' as const,
        total: finalTotal,
        shipping_address: `${fullName}\n${phone}\n${address}\n${postalCode} ${city}\n${country}`,
        // Keep extra checkout metadata inside notes for compatibility with older DB schemas.
        notes:
          [
            notes?.trim() || '',
            `Email: ${email}`,
            `NIF: ${nif || '-'}`,
          ]
            .filter(Boolean)
            .join('\n') || null,
        payment_method: paymentMethod,
        invoice_number: invNumber,
      };

      const extendedOrderPayload = {
        ...baseOrderPayload,
        customer_name: fullName,
        customer_email: email,
        customer_phone: phone || null,
        shipping_address_line1: address,
        shipping_city: city,
        shipping_postal_code: postalCode,
        shipping_country: country,
        customer_nif: nif || null,
      };

      let orderInsert = await supabase
        .from('orders')
        .insert(extendedOrderPayload)
        .select('id')
        .single();

      if (
        orderInsert.error &&
        /customer_email|customer_name|shipping_address_line1|shipping_city|shipping_postal_code|shipping_country|customer_nif/i.test(
          orderInsert.error.message || ''
        )
      ) {
        orderInsert = await supabase
          .from('orders')
          .insert(baseOrderPayload)
          .select('id')
          .single();
      }

      const { data: order, error: orderError } = orderInsert;

      if (orderError) {
        console.error('Order insert error:', orderError);
        throw new Error(`Erro ao criar pedido: ${orderError.message}`);
      }

      const orderItems = items.map(({ product, quantity }) => ({
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: product.price,
        subtotal: product.price * quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items insert error:', itemsError);
        throw new Error(`Erro ao adicionar itens: ${itemsError.message}`);
      }

      // Stock decrement and profile update are non-critical — don't fail the order
      try {
        // Try RPC first (if available), otherwise direct update
        for (const { product, quantity } of items) {
          const { error: rpcError } = await (supabase.rpc as any)('decrement_stock', {
            p_product_id: product.id,
            p_quantity: quantity,
          });
          // If RPC doesn't exist, fall back to direct update
          if (rpcError) {
            await supabase
              .from('products')
              .update({ stock: Math.max(0, product.stock - quantity) })
              .eq('id', product.id);
          }
        }
      } catch (stockErr) {
        console.warn('Non-critical: stock update failed', stockErr);
      }

      try {
        await supabase
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              full_name: fullName,
              email,
              phone: phone || null,
              nif: nif || null,
              address: `${address}, ${postalCode} ${city}, ${country}`,
            },
            { onConflict: 'user_id' }
          );
      } catch (profileErr) {
        console.warn('Non-critical: profile update failed', profileErr);
      }

      setOrderId(order.id);
      setInvoiceNumber(invNumber);
      setOrderPlaced(true);
      clearCart();
      toast.success('Pedido realizado com sucesso!');

      notifyOrder(user.id, true, order.id, finalTotal, items, paymentMethod);
    } catch (err: any) {
      console.error('Checkout error:', err);
      const errorMsg = err?.message || 'Erro desconhecido';
      toast.error(`Erro ao realizar o pedido: ${errorMsg}`);
      if (user) notifyOrder(user.id, false, undefined, undefined, undefined, undefined, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (orderPlaced) {
    return (
      <Layout>
        <div className="container py-16 max-w-lg mx-auto text-center">
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h1 className="font-serif text-3xl font-bold mb-3">Pedido Confirmado!</h1>
          <p className="text-muted-foreground mb-2">
            O seu pedido foi recebido com sucesso.
          </p>
          {orderId && (
            <p className="text-sm text-muted-foreground mb-2">
              Número do pedido: <span className="font-mono font-medium">{orderId.slice(0, 8).toUpperCase()}</span>
            </p>
          )}
          {invoiceNumber && (
            <p className="text-sm text-muted-foreground mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Fatura: <span className="font-mono font-medium">{invoiceNumber}</span>
            </p>
          )}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-6 text-left">
            <p className="text-sm text-green-800 font-medium mb-1">📧 Fatura enviada por email</p>
            <p className="text-xs text-green-700">
              Receberá a fatura detalhada no seu email com todos os dados do pedido, incluindo IVA.
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Método de pagamento: <strong>{paymentMethodOptions.find(m => m.value === paymentMethod)?.label}</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/account">
              <Button variant="hero" size="lg">
                Ver Meus Pedidos
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline" size="lg">
                Continuar Comprando
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadingProfile) {
    return (
      <Layout>
        <div className="container py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate('/cart')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Carrinho
        </Button>

        <h1 className="font-serif text-3xl font-bold mb-8">Finalizar Compra</h1>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Shipping form + Payment method */}
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados de Envio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Nome Completo *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="O seu nome completo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+351 912 345 678"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Morada de Envio *</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, andar, código postal, cidade"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <Label htmlFor="postalCode">Código Postal *</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="1000-000"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Lisboa"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <Label htmlFor="country">País *</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Portugal"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções especiais para entrega…"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="nif">NIF (opcional, para fatura)</Label>
                  <Input
                    id="nif"
                    value={nif}
                    onChange={(e) => setNif(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="123456789"
                    maxLength={9}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Indique o NIF se pretender fatura com contribuinte
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Método de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="space-y-3"
                >
                  {paymentMethodOptions.map((method) => (
                    <label
                      key={method.value}
                      htmlFor={`payment-${method.value}`}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        paymentMethod === method.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/30'
                      }`}
                    >
                      <RadioGroupItem value={method.value} id={`payment-${method.value}`} />
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          paymentMethod === method.value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {method.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{method.label}</p>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>

                {paymentMethod === 'transfer' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">Dados para Transferência</p>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p><strong>IBAN:</strong> PT50 0000 0000 0000 0000 0000 0</p>
                      <p><strong>Titular:</strong> Fio & Alma Studio</p>
                      <p className="text-blue-600 mt-2">
                        Após a transferência, o pedido será confirmado em até 24h úteis.
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'multibanco' && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 mb-2">Referência Multibanco</p>
                    <p className="text-xs text-amber-700">
                      Receberá os dados de pagamento (entidade, referência e valor) por email após confirmar o pedido.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Resumo do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex gap-3">
                      <img
                        src={product.images[0] || '/placeholder.svg'}
                        alt={product.name}
                        className="w-12 h-12 object-contain bg-white rounded p-0.5 border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {quantity}× €{product.price.toFixed(2)}
                        </p>
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">
                        €{(product.price * quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals with IVA */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>€{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envio</span>
                    <span>{shipping === 0 ? 'Grátis' : `€${shipping.toFixed(2)}`}</span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Frete grátis em compras acima de €50
                    </p>
                  )}
                </div>

                <Separator />

                {/* IVA breakdown */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Base tributável</span>
                    <span>€{baseAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (23%)</span>
                    <span>€{ivaAmount.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>€{finalTotal.toFixed(2)}</span>
                </div>

                {/* Payment method summary */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                  {paymentMethodOptions.find(m => m.value === paymentMethod)?.icon}
                  <span>{paymentMethodOptions.find(m => m.value === paymentMethod)?.label}</span>
                </div>

                {/* Terms consent */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[hsl(var(--primary))]"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    Li e aceito os{' '}
                    <a href="/terms" target="_blank" className="text-primary hover:underline">Termos e Condições</a>,
                    a{' '}
                    <a href="/privacy" target="_blank" className="text-primary hover:underline">Política de Privacidade</a>{' '}
                    e a{' '}
                    <a href="/returns" target="_blank" className="text-primary hover:underline">Política de Devoluções</a>.
                  </span>
                </label>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handlePlaceOrder}
                  disabled={loading || !acceptTerms}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A processar…
                    </>
                  ) : (
                    <>
                      Confirmar Pedido — €{finalTotal.toFixed(2)}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Receberá a fatura por email após a confirmação. Todos os preços incluem IVA.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
