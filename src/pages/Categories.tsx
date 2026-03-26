import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';
import { useCategories, useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { normalizeCategoryDisplayName } from '@/lib/ptText';

const Categories = () => {
  const { data: categories = [], isLoading } = useCategories();
  const { data: products = [] } = useProducts();

  // Count products per category
  const productCountMap = products.reduce<Record<string, number>>((acc, p) => {
    if (p.category_id) {
      acc[p.category_id] = (acc[p.category_id] || 0) + 1;
    }
    return acc;
  }, {});

  return (
    <Layout>
      <SEOHead
        title="Categorias de Artesanato | Arranjos florais, Bijuteria, Bordados, Cerâmica e Croché"
        description="Explore categorias de artesanato feito à mão: arranjos florais, bijuteria, bordados, cerâmica, costura criativa, croché, tricot e mais."
        keywords={[
          'categorias de artesanato',
          'loja de artesanato',
          'artesanato online',
          'artesanato feito à mão',
          'produtos artesanais',
          'croché',
          'cerâmica',
          'bijuteria artesanal',
        ]}
        canonical="https://fioealma.pt/categories"
      />
      <div className="container py-10">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-craft font-medium mb-2">✿ As Nossas Categorias ✿</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            Explore por Categorias
          </h1>
          <div className="stitch-divider w-24 mx-auto mt-4" />
          <p className="text-muted-foreground mt-4 max-w-md mx-auto">
            Escolha uma categoria para ver todos os produtos disponíveis.
          </p>
          <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto">
            Categorias principais: Arranjos florais, Bijuteria, Bordados, Cerâmica, Costura criativa,
            Croché, Pinturas em tecido, Tricot e Diversos.
          </p>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="max-w-2xl mx-auto space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🧶</p>
            <h2 className="font-serif text-xl font-semibold mb-2">Sem categorias ainda</h2>
            <p className="text-muted-foreground">As categorias aparecerão aqui em breve.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {categories.map((category) => {
                const count = productCountMap[category.id] || 0;
                const displayName = normalizeCategoryDisplayName(category.name);
                return (
                  <Link
                    key={category.id}
                    to={`/categoria/${category.slug}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-primary/5 transition-colors group"
                  >
                    {/* Category image or icon */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-border shrink-0 flex items-center justify-center">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={displayName}
                          className="w-full h-full object-contain p-1"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <FolderOpen className="h-6 w-6 text-primary/60" />
                      )}
                    </div>

                    {/* Category name & product count */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-base">
                        {displayName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {count} {count === 1 ? 'produto' : 'produtos'}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>

            {/* Total count */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'} · {products.length} produtos no total
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Categories;
