import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

function normalizeAssetUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('./')) {
    return `/${trimmed.slice(2)}`;
  }

  if (trimmed.startsWith('../')) {
    return `/${trimmed.replace(/^\.\.\//, '')}`;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `/${trimmed}`;
}

function withCacheBust(url: string, version: string | number): string {
  const safe = normalizeAssetUrl(url);
  if (!safe) return '';

  const v = String(version || '').trim();
  if (!v) return safe;

  const separator = safe.includes('?') ? '&' : '?';
  return `${safe}${separator}v=${encodeURIComponent(v)}`;
}

export function HeroSection() {
  const [bgImage, setBgImage] = useState('');
  const [bgVersion, setBgVersion] = useState<string>('');
  const [bgLoadFailed, setBgLoadFailed] = useState(false);

  useEffect(() => {
    const fetchBg = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'site_background')
        .maybeSingle();

      if (data?.value && typeof data.value === 'object') {
        const value = data.value as Record<string, unknown>;
        const imageUrl = typeof value.image_url === 'string' ? value.image_url : '';
        const imageVersion = value.image_version || value.updated_at || '';

        setBgImage(normalizeAssetUrl(imageUrl));
        setBgVersion(String(imageVersion || ''));
        setBgLoadFailed(false);
      }
    };
    fetchBg();
  }, []);

  const effectiveBgUrl = withCacheBust(bgImage, bgVersion);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-background to-accent/20">
      {/* Decorative stitch pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="stitch" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="hsl(var(--craft))" opacity="0.4" />
              <line x1="0" y1="10" x2="8" y2="10" stroke="hsl(var(--craft))" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
            </pattern>
          </defs>
          <rect fill="url(#stitch)" width="100%" height="100%" />
        </svg>
      </div>
      
      <div className="container relative py-20 md:py-28 lg:py-36">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-8 text-center lg:text-left animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-sm font-medium border border-primary/20">
              <Heart className="h-4 w-4 fill-primary" />
              <span>Feito à Mão com Amor</span>
            </div>
            
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Peças únicas, feitas à mão com amor
              <span className="block gradient-text mt-2">Costura Artesanal</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Fio e Alma Studio, loja online de artesanato feito à mão. Cada ponto conta uma história.
              Descubra peças artesanais criadas por mãos experientes, com dedicação e carinho em cada detalhe.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/products">
                <Button variant="hero" size="xl" className="rounded-full shadow-lg hover:shadow-xl transition-shadow">
                  Ver Coleção
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="outline" size="xl" className="rounded-full border-craft text-foreground hover:bg-craft/10">
                  Conhecer Artesãs
                </Button>
              </Link>
            </div>
            
            {/* Trust indicators */}
            <div className="flex justify-center lg:justify-start gap-8 pt-6">
              <div className="text-center">
                <p className="text-3xl font-serif font-bold text-primary">100%</p>
                <p className="text-sm text-muted-foreground">Artesanal</p>
              </div>
              <div className="border-l border-craft/30 pl-8 text-center">
                <p className="text-3xl font-serif font-bold text-primary">♥</p>
                <p className="text-sm text-muted-foreground">Feito com Amor</p>
              </div>
              <div className="border-l border-craft/30 pl-8 text-center">
                <p className="text-3xl font-serif font-bold text-primary">∞</p>
                <p className="text-sm text-muted-foreground">Peças Únicas</p>
              </div>
            </div>
          </div>
          
          {/* Image/Visual */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-8 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/10 rounded-full blur-3xl" />
            
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-secondary to-accent/20 border-2 border-craft/20 shadow-xl">
              <img
                src={!bgLoadFailed && effectiveBgUrl ? effectiveBgUrl : '/placeholder.svg'}
                alt="Costura artesanal feita à mão"
                className="w-full h-full object-cover"
                onError={() => setBgLoadFailed(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="stitch-divider w-full" />
    </section>
  );
}
