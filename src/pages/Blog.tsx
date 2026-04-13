import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

/**
 * Blog de Artesanato — Conteúdos SEO para atrair tráfego orgânico
 * 
 * Estratégia: 
 * - Artigos focados em palavras-chave long-tail
 * - Conteúdo educativo e inspirador para artesanato
 * - Tom acolhedor, humano e autêntico
 */

// Artigos de blog estáticos (prontos para migrar para Supabase no futuro)
const blogPosts = [
  {
    id: 1,
    slug: 'como-cuidar-pecas-croche',
    title: 'Como Cuidar das Suas Peças de Crochê Artesanal',
    excerpt: 'Descubra os melhores cuidados para manter as suas peças de crochê feitas à mão bonitas e duradouras. Dicas de lavagem, secagem e armazenamento.',
    category: 'Dicas',
    readTime: '5 min',
    date: '2026-02-15',
    image: '🧶',
    keywords: ['cuidar crochê', 'manutenção peças artesanais', 'lavar crochê'],
  },
  {
    id: 2,
    slug: 'presentes-artesanais-dia-mae',
    title: '10 Presentes Artesanais Perfeitos para o Dia da Mãe',
    excerpt: 'Surpreenda a sua mãe com um presente feito à mão. Descubra as melhores ideias de presentes artesanais para uma ocasião especial.',
    category: 'Inspiração',
    readTime: '7 min',
    date: '2026-02-10',
    image: '💐',
    keywords: ['presentes dia da mãe', 'oferta artesanal', 'presente feito à mão'],
  },
  {
    id: 3,
    slug: 'artesanato-sustentavel',
    title: 'Porquê Escolher Artesanato Sustentável?',
    excerpt: 'O artesanato feito à mão é uma escolha consciente. Saiba como os produtos artesanais contribuem para um consumo mais sustentável e responsável.',
    category: 'Sustentabilidade',
    readTime: '6 min',
    date: '2026-02-05',
    image: '🌿',
    keywords: ['artesanato sustentável', 'consumo consciente', 'produtos ecológicos'],
  },
  {
    id: 4,
    slug: 'tendencias-decoracao-artesanal-2026',
    title: 'Tendências de Decoração Artesanal para 2026',
    excerpt: 'As tendências de decoração para 2026 valorizam o feito à mão. Descubra como integrar peças artesanais na decoração da sua casa.',
    category: 'Tendências',
    readTime: '8 min',
    date: '2026-01-28',
    image: '🏠',
    keywords: ['tendências decoração 2026', 'decoração artesanal', 'casa artesanal'],
  },
  {
    id: 5,
    slug: 'croche-artesanal-especial',
    title: 'O Que Torna o Crochê Artesanal Especial?',
    excerpt: 'Cada peça de crochê feita à mão conta uma história. Descubra o que torna o crochê artesanal tão especial e diferente do industrial.',
    category: 'Artesanato',
    readTime: '5 min',
    date: '2026-01-20',
    image: '✨',
    keywords: ['crochê artesanal', 'crochê feito à mão', 'benefícios crochê'],
  },
  {
    id: 6,
    slug: 'guia-presentes-artesanais',
    title: 'Guia de Presentes Artesanais para Cada Ocasião',
    excerpt: 'Não sabe o que oferecer? O nosso guia completo de presentes artesanais ajuda-o a escolher a peça perfeita para cada momento especial.',
    category: 'Guia',
    readTime: '10 min',
    date: '2026-01-15',
    image: '🎁',
    keywords: ['guia presentes', 'presentes artesanais', 'oferta personalizada'],
  },
  {
    id: 7,
    slug: 'historia-artesas-fio-alma',
    title: 'A História por Trás de Cada Peça: Conhece as Nossas Artesãs',
    excerpt: 'Conheça as mãos que criam cada peça. A história de duas artesãs portuguesas unidas pela paixão do artesanato feito à mão.',
    category: 'Sobre Nós',
    readTime: '6 min',
    date: '2026-01-10',
    image: '👩‍🎨',
    keywords: ['artesãs portuguesas', 'história artesanato', 'fio e alma studio'],
  },
  {
    id: 8,
    slug: 'ceramica-artesanal-argila-peca-unica',
    title: 'Cerâmica Artesanal: Da Argila à Peça Única',
    excerpt: 'Descubra o processo fascinante de criação de cerâmica artesanal. Da moldagem à pintura à mão, cada peça é uma obra de arte.',
    category: 'Processo',
    readTime: '7 min',
    date: '2026-01-05',
    image: '🏺',
    keywords: ['cerâmica artesanal', 'processo cerâmica', 'peça única cerâmica'],
  },
  {
    id: 9,
    slug: 'bonecos-artesanais-presentes',
    title: 'Bonecos Artesanais: Presentes que Ficam para Sempre',
    excerpt: 'Os bonecos feitos à mão são presentes únicos e cheios de carinho. Descubra porquê os bonecos artesanais são a oferta perfeita.',
    category: 'Produtos',
    readTime: '5 min',
    date: '2025-12-28',
    image: '🧸',
    keywords: ['bonecos artesanais', 'amigurumi', 'bonecos feitos à mão'],
  },
  {
    id: 10,
    slug: 'artesanato-portugues-tradicao',
    title: 'Artesanato Português: Tradição que se Reinventa',
    excerpt: 'O artesanato português tem raízes profundas na cultura. Descubra como a tradição artesanal se reinventa com criatividade e modernidade.',
    category: 'Cultura',
    readTime: '8 min',
    date: '2025-12-20',
    image: '🇵🇹',
    keywords: ['artesanato português', 'tradição artesanal', 'cultura portuguesa'],
  },
];

const Blog = () => {
  return (
    <Layout>
      <SEOHead
        title="Blog de Artesanato | Dicas, Inspiração e Tendências - Fio & Alma Studio"
        description="Dicas de artesanato, inspiração para decoração e tendências de produtos feitos à mão. Blog do Fio & Alma Studio sobre crochê, cerâmica e artesanato sustentável."
        keywords={[
          'blog de artesanato',
          'dicas de croche',
          'decoracao artesanal',
          'artesanato sustentavel',
          'tendencias artesanato',
        ]}
        canonical="https://fio-alma-studio.vercel.app/blog"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Blog Fio & Alma Studio",
          description: "Blog de artesanato com dicas, inspiração e tendências sobre produtos feitos à mão.",
          url: "https://fio-alma-studio.vercel.app/blog",
          publisher: {
            "@type": "Organization",
            name: "Fio & Alma Studio",
          },
          blogPost: blogPosts.map(post => ({
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.date,
            keywords: post.keywords.join(', '),
          })),
        }}
      />
      <div className="container py-10">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-craft font-medium mb-2">✿ Inspiração Artesanal ✿</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            Blog de Artesanato
          </h1>
          <div className="stitch-divider w-24 mx-auto mt-4" />
          <p className="text-muted-foreground mt-4 max-w-md mx-auto">
            Dicas, inspiração e histórias sobre o mundo do artesanato feito à mão.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="block">
            <Card
              className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden h-full"
            >
              {/* Image/Emoji Hero */}
              <div className="h-40 bg-gradient-to-br from-secondary to-accent/20 flex items-center justify-center border-b">
                <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                  {post.image}
                </span>
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {post.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </span>
                </div>
                <CardTitle className="text-lg font-serif leading-snug group-hover:text-primary transition-colors">
                  {post.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.date).toLocaleDateString('pt-PT')}
                  </span>
                  <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Ler mais
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>

        {/* SEO: Rodapé com palavras-chave naturais */}
        <div className="mt-16 text-center">
          <div className="stitch-divider w-24 mx-auto mb-6" />
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            No nosso blog encontra dicas sobre <strong>crochê artesanal</strong>, <strong>cerâmica feita à mão</strong>, 
            <strong> bonecos artesanais</strong> e muito mais. Descubra o mundo dos <strong>produtos artesanais</strong> e 
            encontre inspiração para <strong>presentes únicos e personalizados</strong>.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Blog;
