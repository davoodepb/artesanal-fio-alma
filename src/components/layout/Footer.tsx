import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Youtube, Facebook, Mail, Phone, MapPin, Heart, Download, Smartphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function Footer() {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const isInStandaloneMode = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  const showInstall = (isInstallable || /iPad|iPhone|iPod/.test(navigator.userAgent)) && !isInstalled && !isInStandaloneMode;
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    instagramUrl: '',
    youtubeUrl: '',
    facebookUrl: '',
  });
  const [contactInfo, setContactInfo] = useState({
    email: 'ola@fioealma.pt',
    phone: '+351 912 345 678',
    location: 'Lisboa, Portugal',
  });

  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'social_links')
          .maybeSingle();

        if (error) throw error;

        if (data?.value && typeof data.value === 'object') {
          const value = data.value as Record<string, unknown>;
          setSocialLinks({
            instagramUrl: typeof value.instagram_url === 'string' ? value.instagram_url : '',
            youtubeUrl: typeof value.youtube_url === 'string' ? value.youtube_url : '',
            facebookUrl: typeof value.facebook_url === 'string' ? value.facebook_url : '',
          });
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
      }
    };

    fetchSocialLinks();
  }, []);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'about_us')
          .maybeSingle();

        if (error) throw error;

        if (data?.value && typeof data.value === 'object') {
          const value = data.value as Record<string, unknown>;
          setContactInfo((prev) => ({
            email: typeof value.contactEmail === 'string' && value.contactEmail.trim() ? value.contactEmail : prev.email,
            phone: typeof value.contactPhone === 'string' && value.contactPhone.trim() ? value.contactPhone : prev.phone,
            location: typeof value.contactLocation === 'string' && value.contactLocation.trim() ? value.contactLocation : prev.location,
          }));
        }
      } catch (error) {
        console.error('Error fetching contact info:', error);
      }
    };

    fetchContactInfo();
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      toast.error('Introduza um email válido');
      return;
    }
    setNewsletterLoading(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email: newsletterEmail.trim().toLowerCase() });
      if (error) {
        if (error.code === '23505') {
          toast.info('Este email já está subscrito à nossa newsletter!');
        } else {
          throw error;
        }
      } else {
        toast.success('Obrigado! Subscrição efetuada com sucesso 💛');
      }
      setNewsletterEmail('');
    } catch (err) {
      console.error('Newsletter error:', err);
      toast.error('Erro ao subscrever. Tente novamente.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <footer className="bg-secondary text-secondary-foreground relative overflow-hidden">
      {/* Decorative thread */}
      <svg className="absolute top-0 left-0 w-full h-8 opacity-20" viewBox="0 0 1200 32" preserveAspectRatio="none">
        <path 
          d="M0,16 Q300,0 600,16 T1200,16" 
          fill="none" 
          stroke="hsl(var(--craft))" 
          strokeWidth="2"
          strokeDasharray="10,5"
        />
      </svg>

      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-5">
            <div>
              <h3 className="font-script text-3xl text-primary">
                Fio & Alma Studio
              </h3>
              <p className="text-xs tracking-widest text-muted-foreground uppercase mt-1">
                Costura Artesanal
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Duas artesãs unidas pela paixão da costura tradicional. 
              Cada peça conta uma história, cada ponto é feito com amor.
            </p>
            <p className="text-sm font-medium text-foreground">
              Segue-nos nas redes sociais e conhece-nos melhor
            </p>
            <div className="flex space-x-3">
              {socialLinks.instagramUrl ? (
                <Button asChild variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10 rounded-full">
                  <a href={socialLinks.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram className="h-5 w-5" />
                  </a>
                </Button>
              ) : null}
              {socialLinks.youtubeUrl ? (
                <Button asChild variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10 rounded-full">
                  <a href={socialLinks.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <Youtube className="h-5 w-5" />
                  </a>
                </Button>
              ) : null}
              {socialLinks.facebookUrl ? (
                <Button asChild variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/10 rounded-full">
                  <a href={socialLinks.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook className="h-5 w-5" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-5">
            <h4 className="font-serif font-semibold text-lg flex items-center gap-2">
              <span className="text-craft">✿</span>
              Navegação
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  <span className="text-xs text-craft">→</span>
                  Nossa Coleção
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  <span className="text-xs text-craft">→</span>
                  Categorias
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  <span className="text-xs text-craft">→</span>
                  Sobre as Artesãs
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                  <span className="text-xs text-craft">→</span>
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-5">
            <h4 className="font-serif font-semibold text-lg flex items-center gap-2">
              <span className="text-craft">✿</span>
              Contacto
            </h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center space-x-3 text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <span>{contactInfo.email}</span>
              </li>
              <li className="flex items-center space-x-3 text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <span>{contactInfo.phone}</span>
              </li>
              <li className="flex items-center space-x-3 text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span>{contactInfo.location}</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-5">
            <h4 className="font-serif font-semibold text-lg flex items-center gap-2">
              <span className="text-craft">✿</span>
              Newsletter
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Receba novidades sobre novas peças e promoções exclusivas.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col space-y-3">
              <Input 
                type="email" 
                placeholder="O seu email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-background/10 border-craft/30 rounded-full focus:border-primary placeholder:text-muted-foreground/50"
                required
              />
              <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary-hover" disabled={newsletterLoading}>
                {newsletterLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Heart className="h-4 w-4 mr-2" />
                )}
                Subscrever
              </Button>
              <p className="text-xs text-muted-foreground/60">
                Ao subscrever, aceita a nossa <a href="/privacy" className="hover:underline">Política de Privacidade</a>.
              </p>
            </form>
          </div>
        </div>

        {/* Install App Banner */}
        {showInstall && (
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-serif font-semibold text-foreground">Instale a nossa App</p>
                  <p className="text-sm text-muted-foreground">Acesso rápido direto do seu telemóvel</p>
                </div>
              </div>
              {isInstallable ? (
                <Button onClick={installApp} className="rounded-full bg-primary hover:bg-primary-hover gap-2">
                  <Download className="h-4 w-4" />
                  Instalar App
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>No Safari, toque em <strong>Partilhar</strong> → <strong>Ecrã inicial</strong></p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-craft/20">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              © {new Date().getFullYear()} Fio & Alma Studio 
              <span className="text-primary">♥</span>
              Feito à mão em Portugal
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacidade
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Termos
              </Link>
              <Link to="/returns" className="text-muted-foreground hover:text-primary transition-colors">
                Devoluções
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contacto
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
