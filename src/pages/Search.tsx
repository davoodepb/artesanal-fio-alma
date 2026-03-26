import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';
import { ProductGrid } from '@/components/products/ProductGrid';
import { useProducts } from '@/hooks/useProducts';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from 'lucide-react';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const query = searchParams.get('q') || '';
  const { data: products = [], isLoading } = useProducts();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.trim()) {
      setSearchParams({ q: value });
    } else {
      setSearchParams({});
    }
  };

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q))
    );
  }, [query, products]);

  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const scoreProduct = (name: string, category?: string | null, description?: string | null) => {
      const n = name.toLowerCase();
      const c = category?.toLowerCase() || '';
      const d = description?.toLowerCase() || '';

      if (n.startsWith(q)) return 100;
      if (n.includes(q)) return 80;
      if (c.startsWith(q)) return 60;
      if (c.includes(q)) return 50;
      if (d.includes(q)) return 30;
      return 0;
    };

    return products
      .map((product) => ({
        product,
        score: scoreProduct(product.name, product.category?.name, product.description),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.product);
  }, [products, query]);

  const selectSuggestion = (value: string) => {
    setSearchParams({ q: value });
    setShowSuggestions(false);
  };

  return (
    <Layout>
      <SEOHead
        title="Pesquisar Artesanato Online | Fio e Alma Studio"
        description="Pesquise produtos artesanais na Fio e Alma Studio: artesanato feito à mão, croché, cerâmica, bordados e muito mais."
        keywords={[
          'artesanato',
          'loja de artesanato',
          'artesanato online',
          'artesanato feito à mão',
          'produtos artesanais',
        ]}
        canonical={`https://fioealma.pt/search${query ? `?q=${encodeURIComponent(query)}` : ''}`}
      />
      <div className="container py-8">
        {/* Search input */}
        <div className="max-w-xl mx-auto mb-10">
          <h1 className="font-serif text-3xl font-bold text-center mb-6">Pesquisar</h1>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Pesquise por nome, descrição ou categoria..."
              value={query}
              onChange={handleSearchChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              className="pl-12 h-12 rounded-full border-craft/30 focus:border-primary text-base"
              autoFocus
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl border bg-card shadow-lg z-20 overflow-hidden">
                {suggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(product.name)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/60 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.category?.name || 'Sem categoria'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {query.trim() ? (
          <>
            <p className="text-muted-foreground mb-6">
              {isLoading
                ? 'A pesquisar...'
                : results.length === 0
                ? `Nenhum resultado para "${query}"`
                : `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${query}"`}
            </p>
            {results.length > 0 && <ProductGrid products={results} isLoading={isLoading} />}
            {!isLoading && results.length === 0 && (
              <div className="text-center py-12">
                <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum produto encontrado</p>
                <p className="text-muted-foreground mb-6">
                  Tente usar termos diferentes ou explore a nossa coleção
                </p>
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  Ver todos os produtos →
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium mb-2">O que está à procura?</p>
            <p className="text-muted-foreground">
              Digite o nome de um produto, categoria ou descrição
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search;
