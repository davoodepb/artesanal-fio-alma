import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Category } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeCategoryDisplayName } from '@/lib/ptText';

interface CategorySectionProps {
  categories: Category[];
  isLoading?: boolean;
}

export function CategorySection({ categories, isLoading }: CategorySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const displayCategories = categories.length > 0 ? categories : [];

  if (displayCategories.length === 0) return null;

  const gradients = [
    'from-primary/80 to-primary',
    'from-secondary to-secondary/80',
    'from-accent/80 to-accent',
    'from-primary/60 to-accent/60',
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl font-bold text-foreground">
            Explore por Categorias
          </h2>
          <p className="text-muted-foreground mt-2">
            Encontre exatamente o que procura
          </p>
        </div>

        <div className="relative">
          {/* Navigation arrows */}
          {displayCategories.length > 4 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-card shadow-md hidden md:flex"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-card shadow-md hidden md:flex"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayCategories.map((category, index) => {
              const displayName = normalizeCategoryDisplayName(category.name);
              return (
              <Link
                key={category.id}
                to={`/categoria/${category.slug}`}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-18px)] snap-start"
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br transition-opacity",
                  gradients[index % gradients.length]
                )} />

                {category.image_url && (
                  <img
                    src={category.image_url}
                    alt={displayName}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
                    loading="lazy"
                    decoding="async"
                  />
                )}

                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <h3 className="text-xl md:text-2xl font-bold text-white text-center drop-shadow-lg group-hover:scale-110 transition-transform">
                    {displayName}
                  </h3>
                </div>

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </Link>
              );
            })}
          </div>

          {/* Mobile navigation arrows */}
          {displayCategories.length > 2 && (
            <div className="flex justify-center gap-3 mt-4 md:hidden">
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll('left')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll('right')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link to="/products">
            <Button variant="outline" className="rounded-full">
              Ver Todas as Categorias
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
