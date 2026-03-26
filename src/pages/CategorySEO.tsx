import React from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';
import { ProductGrid } from '@/components/products/ProductGrid';
import { useCategories, useProducts } from '@/hooks/useProducts';
import { normalizeCategoryDisplayName } from '@/lib/ptText';

const CATEGORY_SEO_CONFIG: Record<string, { name: string; description: string; relatedTerms: string[] }> = {
  croche: {
    name: 'Croché',
    description: 'Peças de croché artesanal feitas à mão para decoração, presentes e uso diário.',
    relatedTerms: ['croché artesanal', 'artesanato feito à mão', 'comprar croché online'],
  },
  ceramica: {
    name: 'Cerâmica',
    description: 'Cerâmica artesanal com peças únicas feitas manualmente para casa e presentes.',
    relatedTerms: ['cerâmica artesanal', 'loja de artesanato', 'comprar cerâmica online'],
  },
  bordados: {
    name: 'Bordados',
    description: 'Bordados artesanais com acabamento manual e detalhes exclusivos para cada peça.',
    relatedTerms: ['bordados artesanais', 'arte manual', 'artesanato português'],
  },
  bijuteria: {
    name: 'Bijuteria',
    description: 'Bijuteria artesanal feita à mão para completar o seu estilo com originalidade.',
    relatedTerms: ['bijuteria artesanal', 'artesanato feito à mão', 'comprar artesanato online'],
  },
  'pinturas-tecido': {
    name: 'Pinturas em Tecido',
    description: 'Pinturas em tecido artesanais com técnicas manuais para peças personalizadas.',
    relatedTerms: ['pinturas em tecido', 'costura criativa', 'arte manual'],
  },
  tricot: {
    name: 'Tricot',
    description: 'Peças de tricot artesanal feitas à mão com qualidade e conforto para todas as estações.',
    relatedTerms: ['tricot artesanal', 'artesanato feito à mão', 'comprar artesanato online'],
  },
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getCategorySlugCandidates = (slug: string) => {
  if (slug === 'pinturas-tecido') {
    return ['pinturas-tecido', 'pinturas-em-tecido'];
  }

  return [slug];
};

const CategorySEO = () => {
  const { slug = '' } = useParams();
  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading } = useProducts();

  const seoConfig = CATEGORY_SEO_CONFIG[slug];
  const slugCandidates = getCategorySlugCandidates(slug);

  const category = categories.find((item) => {
    const normalizedSlug = normalize(item.slug);
    const normalizedName = normalize(item.name);
    return slugCandidates.some((candidate) => candidate === normalizedSlug || candidate === normalizedName);
  });

  const productsByCategory = category
    ? products.filter((product) => product.category_id === category.id)
    : [];

  const categoryName = seoConfig?.name || (category?.name ? normalizeCategoryDisplayName(category.name) : 'Categoria');
  const categoryDescription =
    seoConfig?.description ||
    `Explore produtos de ${categoryName} artesanal na Fio e Alma Studio e compre artesanato online feito à mão.`;

  const keywords = [
    'artesanato',
    'loja de artesanato',
    'artesanato online',
    'artesanato feito à mão',
    'produtos artesanais',
    'loja online de artesanato',
    'comprar artesanato online',
    ...(seoConfig?.relatedTerms || []),
  ];

  const structuredProducts = productsByCategory.slice(0, 12).map((product) => ({
    '@type': 'Product',
    name: product.name,
    description: product.description || categoryDescription,
    image: product.images?.[0] || 'https://fioealma.pt/icons/icon-512.png',
    sku: product.id,
    category: categoryName,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://fioealma.pt/product/${product.slug}`,
    },
  }));

  return (
    <Layout>
      <SEOHead
        title={`${categoryName} Artesanal | Comprar ${categoryName} Online - Fio e Alma Studio`}
        description={categoryDescription}
        keywords={keywords}
        canonical={`https://fioealma.pt/categoria/${slug}`}
        structuredData={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              name: `${categoryName} Artesanal`,
              url: `https://fioealma.pt/categoria/${slug}`,
              description: categoryDescription,
            },
            {
              '@type': 'ItemList',
              name: `Produtos de ${categoryName}`,
              itemListElement: structuredProducts.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item,
              })),
            },
          ],
        }}
      />

      <div className="container py-10">
        <header className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            {categoryName} Artesanal
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">{categoryDescription}</p>
        </header>

        <section className="mb-8">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">Produtos da categoria</h2>
          <p className="text-muted-foreground">{productsByCategory.length} produtos encontrados nesta categoria.</p>
        </section>

        <ProductGrid
          products={productsByCategory}
          isLoading={isLoading}
          emptyMessage="Ainda não existem produtos publicados nesta categoria."
        />
      </div>
    </Layout>
  );
};

export default CategorySEO;
