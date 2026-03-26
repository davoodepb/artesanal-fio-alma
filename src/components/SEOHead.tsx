import { useEffect } from 'react';
import { siteUrl, toAbsoluteUrl } from '@/lib/site';

/**
 * SEOHead — Componente para gerir meta tags dinâmicas por página.
 * 
 * Estratégia de SEO para loja de produtos artesanais:
 * - Títulos otimizados com palavras-chave principais
 * - Meta descriptions únicas por página (máx 155 chars)
 * - Open Graph e Twitter Cards
 * - Structured Data (JSON-LD) por página
 */

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string[] | string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  structuredData?: object;
}

export function SEOHead({ 
  title, 
  description, 
  keywords,
  canonical, 
  ogImage = '/icons/icon-512.png',
  ogType = 'website',
  structuredData 
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
      }
    };

    const canonicalUrl = canonical || window.location.href;
    const absoluteImage = toAbsoluteUrl(ogImage);

    // Standard meta
    updateMeta('description', description);
    if (keywords) {
      updateMeta('keywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);
    }

    // Open Graph
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', ogType, true);
    updateMeta('og:image', absoluteImage, true);
    updateMeta('og:image:alt', title, true);
    updateMeta('og:url', canonicalUrl, true);
    updateMeta('og:site_name', 'Fio e Alma Studio', true);
    updateMeta('og:locale', 'pt_PT', true);

    // Twitter
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:site', '@FioAlma');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', absoluteImage);
    updateMeta('twitter:url', canonicalUrl);
    updateMeta('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    updateMeta('googlebot', 'index, follow');

    // Canonical URL
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (link) {
        link.href = canonicalUrl;
      } else {
        link = document.createElement('link');
        link.rel = 'canonical';
        link.href = canonicalUrl;
        document.head.appendChild(link);
      }
    }

    // Keep hreflang aligned to current canonical base.
    const ensureAlternate = (hreflang: string, href: string) => {
      let link = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hreflang;
        document.head.appendChild(link);
      }
      link.href = href;
    };
    ensureAlternate('pt', siteUrl);
    ensureAlternate('x-default', siteUrl);

    // Structured Data
    if (structuredData) {
      const existingScript = document.getElementById('page-structured-data');
      if (existingScript) {
        existingScript.textContent = JSON.stringify(structuredData);
      } else {
        const script = document.createElement('script');
        script.id = 'page-structured-data';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
      }
    }

    return () => {
      // Cleanup structured data on unmount
      const script = document.getElementById('page-structured-data');
      if (script) script.remove();
    };
  }, [title, description, keywords, canonical, ogImage, ogType, structuredData]);

  return null;
}

/**
 * ========================================
 * ESTRATÉGIA SEO COMPLETA
 * Fio & Alma Studio — Loja de Artesanato
 * ========================================
 * 
 * 📋 PESQUISA DE PALAVRAS-CHAVE
 * 
 * === Palavras-chave PRINCIPAIS ===
 * - produtos artesanais
 * - feitos à mão
 * - loja de artesanato online
 * - artesanato português
 * - produtos manuais
 * - loja artesanal online
 * - artesanato feito à mão
 * 
 * === Palavras-chave SECUNDÁRIAS ===
 * - crochê feito à mão
 * - peças em crochê artesanal
 * - cerâmica artesanal
 * - bonecos feitos à mão
 * - presentes artesanais personalizados
 * - decoração artesanal
 * - presentes únicos feitos à mão
 * - artesanato sustentável
 * - peças únicas artesanais
 * - lembranças artesanais
 * 
 * === Palavras-chave LONG-TAIL (por produto) ===
 * 
 * 🧶 Crochê:
 * - comprar crochê feito à mão online
 * - presentes em crochê artesanal
 * - peças de crochê para decoração
 * - amigurumi feito à mão Portugal
 * - crochê artesanal para bebé
 * - mantas de crochê feitas à mão
 * - bolsas de crochê artesanal
 * 
 * 🏺 Cerâmica:
 * - cerâmica artesanal portuguesa
 * - comprar cerâmica artesanal online
 * - pratos de cerâmica pintados à mão
 * - vasos de cerâmica artesanal
 * - decoração em cerâmica feita à mão
 * - canecas artesanais de cerâmica
 * 
 * 🧸 Bonecos:
 * - bonecos artesanais para oferta
 * - bonecos de pano feitos à mão
 * - bonecos personalizados artesanais
 * - bonecas de crochê amigurumi
 * - brinquedos artesanais para crianças
 * - bonecos decorativos feitos à mão
 * 
 * ✨ Peças Únicas:
 * - peças artesanais exclusivas
 * - presentes únicos e personalizados
 * - artesanato exclusivo feito à mão
 * - peças de decoração artesanal únicas
 * - presentes artesanais para ocasiões especiais
 * 
 * ========================================
 * 
 * 📝 TÍTULOS SEO (Title Tags) — Por Página
 * 
 * Homepage:
 *   "Fio & Alma Studio | Loja de Produtos Artesanais Feitos à Mão - Crochê, Cerâmica & Peças Únicas"
 * 
 * Produtos:
 *   "Coleção Artesanal | Crochê, Cerâmica e Peças Únicas Feitas à Mão - Fio & Alma Studio"
 * 
 * Categorias:
 *   "Categorias de Artesanato | Crochê, Cerâmica, Bonecos & Mais - Fio & Alma Studio"
 * 
 * Sobre Nós:
 *   "Sobre Nós | Artesãs Portuguesas - Feito à Mão com Amor | Fio & Alma Studio"
 * 
 * Pesquisa:
 *   "Pesquisar Produtos Artesanais | Fio & Alma Studio"
 * 
 * Carrinho:
 *   "Carrinho de Compras | Fio & Alma Studio"
 * 
 * Blog:
 *   "Blog de Artesanato | Dicas, Inspiração e Tendências - Fio & Alma Studio"
 * 
 * ========================================
 * 
 * 📝 META DESCRIPTIONS — Por Página
 * 
 * Homepage:
 *   "Loja online de produtos artesanais feitos à mão: crochê, cerâmica, bonecos e peças únicas. Presentes personalizados com amor. Envio para Portugal."
 * 
 * Produtos:
 *   "Explore a nossa coleção de produtos artesanais: peças de crochê, cerâmica pintada à mão, bonecos artesanais e presentes únicos. Feitos com amor."
 * 
 * Categorias:
 *   "Descubra as nossas categorias de artesanato: crochê, cerâmica, bordados, tricot e muito mais. Encontre a peça perfeita feita à mão."
 * 
 * Sobre Nós:
 *   "Conheça as artesãs por trás do Fio & Alma Studio. Duas mãos, uma paixão: criar peças artesanais únicas com dedicação e amor."
 * 
 * ========================================
 * 
 * 🏗️ ESTRUTURA IDEAL DE CATEGORIAS
 * 
 * / (Homepage)
 * ├── /products (Todos os Produtos)
 * │   ├── /categories/croche (Crochê Artesanal)
 * │   ├── /categories/ceramica (Cerâmica Artesanal)
 * │   ├── /categories/bonecos (Bonecos Artesanais)
 * │   ├── /categories/bordados (Bordados)
 * │   ├── /categories/tricot (Tricot)
 * │   ├── /categories/decoracao (Decoração)
 * │   ├── /categories/acessorios (Acessórios)
 * │   └── /categories/presentes (Presentes Personalizados)
 * ├── /about (Sobre Nós / História)
 * ├── /blog (Blog de Artesanato)
 * │   ├── /blog/como-cuidar-pecas-croche
 * │   ├── /blog/tendencias-artesanato-2026
 * │   ├── /blog/presentes-artesanais-dia-mae
 * │   └── ...
 * ├── /search (Pesquisa)
 * ├── /cart (Carrinho)
 * ├── /wishlist (Lista de Desejos)
 * └── /account (Minha Conta)
 * 
 * ========================================
 * 
 * 📰 SUGESTÕES DE CONTEÚDO PARA BLOG (SEO)
 * 
 * 1. "Como Cuidar das Suas Peças de Crochê Artesanal"
 *    Palavras-chave: cuidar crochê, manutenção peças artesanais
 *    Objetivo: Atrair quem já compra crochê e fidelizar
 * 
 * 2. "10 Presentes Artesanais Perfeitos para o Dia da Mãe"
 *    Palavras-chave: presentes dia da mãe artesanais, oferta feita à mão
 *    Objetivo: Tráfego sazonal + conversão
 * 
 * 3. "Porque Escolher Artesanato Sustentável?"
 *    Palavras-chave: artesanato sustentável, consumo consciente
 *    Objetivo: Atrair público eco-consciente
 * 
 * 4. "Tendências de Decoração Artesanal para 2026"
 *    Palavras-chave: tendências decoração artesanal, decoração feita à mão
 *    Objetivo: SEO de tendência + posicionamento
 * 
 * 5. "O Que Torna o Crochê Artesanal Especial?"
 *    Palavras-chave: crochê artesanal especial, benefícios crochê
 *    Objetivo: Educação do público + autoridade
 * 
 * 6. "Guia de Presentes Artesanais para Cada Ocasião"
 *    Palavras-chave: guia presentes artesanais, oferta artesanal
 *    Objetivo: SEO evergreen + conversão
 * 
 * 7. "A História por Trás de Cada Peça: Conhece as Nossas Artesãs"
 *    Palavras-chave: artesãs portuguesas, história artesanato
 *    Objetivo: Storytelling + confiança + SEO local
 * 
 * 8. "Cerâmica Artesanal: Da Argila à Peça Única"
 *    Palavras-chave: cerâmica artesanal processo, como fazer cerâmica
 *    Objetivo: Conteúdo educativo + autoridade
 * 
 * 9. "Bonecos Artesanais: Presentes que Ficam para Sempre"
 *    Palavras-chave: bonecos artesanais oferta, amigurumi Portugal
 *    Objetivo: Nicho específico + conversão
 * 
 * 10. "Artesanato Português: Tradição que se Reinventa"
 *     Palavras-chave: artesanato português, tradição artesanal
 *     Objetivo: SEO local + orgulho cultural
 */
