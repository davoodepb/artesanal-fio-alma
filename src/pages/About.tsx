import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Users, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AboutSettings {
  title: string;
  story: string;
  mission: string;
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  artisan1Name: string;
  artisan1Bio: string;
  artisan1Image: string;
  artisan2Name: string;
  artisan2Bio: string;
  artisan2Image: string;
}

const defaultAbout: AboutSettings = {
  title: 'Sobre Nós',
  story:
    'Somos duas artesãs apaixonadas pela arte da costura tradicional. Cada peça que criamos carrega a nossa dedicação e o amor pelo trabalho manual. Desde jovens que aprendemos com as nossas avós a arte de transformar fios em obras de arte.',
  mission:
    'A nossa missão é preservar a arte da costura artesanal, criando peças únicas que contam histórias e trazem alegria aos nossos clientes. Acreditamos que cada ponto dado à mão transmite carinho e autenticidade.',
  contactEmail: 'ola@fioealma.pt',
  contactPhone: '+351 912 345 678',
  contactLocation: 'Lisboa, Portugal',
  artisan1Name: '',
  artisan1Bio: '',
  artisan1Image: '',
  artisan2Name: '',
  artisan2Bio: '',
  artisan2Image: '',
};

const About = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [about, setAbout] = useState<AboutSettings>(defaultAbout);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 6000);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'about_us')
          .maybeSingle();

        if (!error && data?.value) {
          setAbout(data.value as unknown as AboutSettings);
        }
      } catch {
        // use defaults
      } finally {
        setIsLoading(false);
        clearTimeout(timeout);
      }
    })();

    return () => clearTimeout(timeout);
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 space-y-8">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-6 w-full max-w-2xl mx-auto" />
          <Skeleton className="h-6 w-full max-w-2xl mx-auto" />
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const hasArtisan1 = about.artisan1Name?.trim();
  const hasArtisan2 = about.artisan2Name?.trim();

  return (
    <Layout>
      <SEOHead
        title="Sobre Nós | Artesãs Portuguesas - Feito à Mão com Amor | Fio & Alma Studio"
        description="Conheça as artesãs por trás do Fio & Alma Studio. Duas mãos, uma paixão: criar peças artesanais únicas com dedicação e amor."
        canonical="https://fio-alma-studio.vercel.app/about"
      />
      <div className="container py-12 md:py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="text-craft font-medium mb-2">✿ Conheça-nos ✿</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            {about.title || 'Sobre Nós'}
          </h1>
          <div className="stitch-divider w-24 mx-auto mt-4" />
        </div>

        {/* Story */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-card border border-craft/20 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="h-6 w-6 text-primary" />
              <h2 className="font-serif text-2xl font-semibold">A Nossa História</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-lg">
              {about.story}
            </p>
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-craft/20 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-6 w-6 text-accent" />
              <h2 className="font-serif text-2xl font-semibold">A Nossa Missão</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-lg">
              {about.mission}
            </p>
          </div>
        </div>

        {/* Artisans */}
        {(hasArtisan1 || hasArtisan2) && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="font-serif text-2xl font-semibold">As Nossas Artesãs</h2>
              </div>
              <p className="text-muted-foreground">
                As mãos por detrás de cada peça
              </p>
            </div>

            <div className={`grid gap-8 ${hasArtisan1 && hasArtisan2 ? 'md:grid-cols-2' : 'max-w-md mx-auto'}`}>
              {hasArtisan1 && (
                <div className="bg-card border border-craft/20 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {about.artisan1Image && (
                    <div className="w-full bg-secondary/30">
                      <img
                        src={about.artisan1Image}
                        alt={about.artisan1Name}
                        className="w-full h-auto max-h-[500px] object-contain mx-auto"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-serif text-xl font-semibold mb-2">{about.artisan1Name}</h3>
                    <p className="text-muted-foreground leading-relaxed">{about.artisan1Bio}</p>
                  </div>
                </div>
              )}

              {hasArtisan2 && (
                <div className="bg-card border border-craft/20 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {about.artisan2Image && (
                    <div className="w-full bg-secondary/30">
                      <img
                        src={about.artisan2Image}
                        alt={about.artisan2Name}
                        className="w-full h-auto max-h-[500px] object-contain mx-auto"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-serif text-xl font-semibold mb-2">{about.artisan2Name}</h3>
                    <p className="text-muted-foreground leading-relaxed">{about.artisan2Bio}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Values */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🧵',
                title: 'Qualidade',
                text: 'Materiais premium selecionados à mão para garantir peças duradouras.',
              },
              {
                icon: '✋',
                title: '100% Artesanal',
                text: 'Cada peça é costurada à mão com atenção a cada ponto e detalhe.',
              },
              {
                icon: '💕',
                title: 'Feito com Amor',
                text: 'Duas artesãs unidas pela paixão da costura tradicional portuguesa.',
              },
            ].map((v, i) => (
              <div
                key={i}
                className="text-center p-8 rounded-3xl bg-card border border-craft/20 hover:shadow-lg hover:border-primary/30 transition-all duration-500 group"
              >
                <div className="text-5xl mb-5 group-hover:scale-110 transition-transform duration-300">
                  {v.icon}
                </div>
                <h3 className="font-serif font-semibold text-xl mb-3">{v.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;
