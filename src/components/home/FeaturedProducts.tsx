import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/products/ProductGrid';
import { Product } from '@/types';

interface FeaturedProductsProps {
  products: Product[];
  isLoading?: boolean;
}

export function FeaturedProducts({ products, isLoading }: FeaturedProductsProps) {
  return (
    <section className="py-16 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl font-bold text-foreground">
              Produtos em Destaque
            </h2>
            <p className="text-muted-foreground mt-2">
              Os favoritos dos nossos clientes
            </p>
          </div>
          <Link to="/products">
            <Button variant="ghost" className="group">
              Ver Todos
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        
        <ProductGrid products={products.slice(0, 8)} isLoading={isLoading} />
      </div>
    </section>
  );
}
