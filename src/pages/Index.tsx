import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { CategorySection } from '@/components/home/CategorySection';
import { PromoSection } from '@/components/home/PromoSection';
import { AnnouncementsSection } from '@/components/home/AnnouncementsSection';
import { NewsSection } from '@/components/home/NewsSection';
import { ThemeBanner } from '@/components/home/ThemeBanner';
import { SEOHead } from '@/components/SEOHead';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { Link } from 'react-router-dom';

const mainCraftCategories = [
  'Arranjos florais',
  'Bijuteria',
  'Bordados',
  'Cerâmica',
  'Costura criativa',
  'Croché',
  'Pinturas em tecido',
  'Tricot',
  'Diversos',
];

const Index = () => {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const homepageKeywords = [
    'artesanato',
    'artesanato português',
    'loja de artesanato',
    'artesanato online',
    'artesanato feito à mão',
    'produtos artesanais',
    'artesanato Portugal',
    'Fio e Alma Studio',
    'handmade',
    'croché',
    'cerâmica',
    'bordados',
  ];

  return (
    <Layout>
      <SEOHead
        title="Artesanato | Fio e Alma Studio"
        description="Loja online de artesanato feito à mão: crochê, bordados, cerâmica e muito mais. Descubra peças únicas no Fio e Alma Studio."
        keywords={homepageKeywords}
        canonical="https://fioealma.pt/"
        structuredData={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'LocalBusiness',
              '@id': 'https://fioealma.pt/#localbusiness',
              name: 'Fio e Alma Studio',
              url: 'https://fioealma.pt/',
              image: 'https://fioealma.pt/icons/icon-512.png',
              description: 'Loja online de artesanato feito a mao com pecas unicas e producao artesanal.',
              areaServed: 'Portugal',
            },
            {
              '@type': 'OnlineStore',
              '@id': 'https://fioealma.pt/#onlinestore',
              name: 'Fio e Alma Studio',
              url: 'https://fioealma.pt/',
              description: 'Loja online de artesanato feito a mao: croche, ceramica, bordados, bijuteria e costura criativa.',
              keywords: homepageKeywords,
              knowsAbout: mainCraftCategories,
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: 'Categorias de Artesanato',
                itemListElement: mainCraftCategories.map((category) => ({
                  '@type': 'OfferCatalog',
                  name: category,
                })),
              },
            },
          ],
        }}
      />
      <section className="sr-only" aria-label="SEO headings">
        <h1>Fio e Alma Studio - Artesanato Feito à Mão</h1>
        <h2>Categorias de Artesanato</h2>
        <h3>Croché</h3>
        <h3>Cerâmica</h3>
        <h3>Bordados</h3>
        <h3>Bijuteria</h3>
        <h3>Costura Criativa</h3>
      </section>
      <AnnouncementsSection />
      <ThemeBanner />
      <HeroSection />
      <FeaturedProducts products={products} isLoading={productsLoading} />
      <CategorySection categories={categories} isLoading={categoriesLoading} />

      <section className="py-12 bg-muted/20 border-y border-border/50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
              Peças únicas, feitas à mão com amor
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">Costura Artesanal</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {mainCraftCategories.map((category) => (
                <Link
                  key={category}
                  to="/categories"
                  className="px-3 py-1.5 rounded-full border border-primary/25 bg-background text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PromoSection />
      <NewsSection />

      <section className="py-12 bg-background border-y border-border/40">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Categorias de Artesanato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fio e Alma Studio é uma loja online dedicada ao artesanato feito à mão. Descubra peças únicas de croché,
              cerâmica, bordados, costura criativa e bijuteria artesanal para oferecer ou decorar com autenticidade.
            </p>
          </div>
        </div>
      </section>
      
      {/* Trust section - Artisanal */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-craft font-medium mb-2">✿ O Nosso Compromisso ✿</p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
              Porquê Escolher-nos?
            </h2>
            <div className="stitch-divider w-24 mx-auto mt-4" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: '🧵',
                title: 'Fio de Qualidade',
                description: 'Utilizamos apenas materiais premium, selecionados à mão para garantir durabilidade.',
              },
              {
                icon: '✋',
                title: '100% Artesanal',
                description: 'Cada peça é costurada à mão, com atenção a cada ponto e detalhe.',
              },
              {
                icon: '💕',
                title: 'Feito com Amor',
                description: 'Duas artesãs dedicadas, unidas pela paixão da costura tradicional.',
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="text-center p-8 rounded-3xl bg-card border border-craft/20 hover:shadow-lg hover:border-primary/30 transition-all duration-500 group"
              >
                <div className="text-5xl mb-5 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="font-serif font-semibold text-xl mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
