import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, Clock, Send, Loader2, Instagram } from 'lucide-react';
import { toast } from 'sonner';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Por favor preencha os campos obrigatórios.');
      return;
    }
    setSending(true);
    // Simulate sending — in production, connect to an edge function or email API
    await new Promise((r) => setTimeout(r, 1200));
    toast.success('Mensagem enviada com sucesso! Responderemos em breve.');
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setSending(false);
  };

  return (
    <Layout>
      <SEOHead
        title="Contacto | Fio & Alma Studio"
        description="Entre em contacto com a Fio & Alma Studio. Estamos disponíveis para ajudar com encomendas, dúvidas e pedidos personalizados. Email, telefone e formulário."
        canonical="https://fio-alma-studio.vercel.app/contact"
      />
      <div className="container py-10 max-w-5xl">
        <div className="text-center mb-12">
          <p className="text-craft font-medium mb-2">✿ Fale Connosco ✿</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold">Contacto</h1>
          <div className="stitch-divider w-24 mx-auto mt-4" />
          <p className="text-muted-foreground mt-4 max-w-md mx-auto">
            Tem alguma dúvida ou quer um pedido personalizado? Estamos aqui para ajudar!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <a href="mailto:ola@fioealma.pt" className="text-muted-foreground hover:text-primary transition-colors">
                      ola@fioealma.pt
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Telefone / WhatsApp</p>
                    <a href="tel:+351912345678" className="text-muted-foreground hover:text-primary transition-colors">
                      +351 912 345 678
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Localização</p>
                    <p className="text-muted-foreground">Lisboa, Portugal</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Horário</p>
                    <p className="text-muted-foreground">Seg-Sex: 9h–18h</p>
                    <p className="text-xs text-muted-foreground">Respondemos em até 24h</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Instagram className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Instagram</p>
                    <p className="text-muted-foreground">@fioealma.studio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ quick links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Perguntas Frequentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Quanto tempo demora a entrega?</p>
                  <p className="text-xs text-muted-foreground mt-1">3 a 7 dias úteis para Portugal Continental.</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Posso devolver um produto?</p>
                  <p className="text-xs text-muted-foreground mt-1">Sim, tem 14 dias para devoluções. <a href="/returns" className="text-primary hover:underline">Ver política</a></p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Fazem peças personalizadas?</p>
                  <p className="text-xs text-muted-foreground mt-1">Sim! Envie-nos uma mensagem com os detalhes do pedido.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Envie-nos uma Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="contact-name">Nome *</Label>
                  <Input
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="O seu nome"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email *</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact-subject">Assunto</Label>
                  <Input
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Pedido personalizado"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-message">Mensagem *</Label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Descreva a sua questão ou pedido…"
                    rows={5}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A enviar…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Ao enviar, aceita a nossa{' '}
                  <a href="/privacy" className="text-primary hover:underline">Política de Privacidade</a>.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
