import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Share2, Heart } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isFav = isInWishlist(product.id);
  
  const discount = product.original_price 
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;
  
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      addToCart(product, 1);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/product/${product.slug}`;
    const text = `Veja este produto: ${product.name} - €${product.price.toFixed(2)}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <Link 
      to={`/product/${product.slug}`}
      className={cn(
        "group product-card block bg-card rounded-xl overflow-hidden border shadow-sm",
        className
      )}
    >
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-white">
        <img
          src={product.images[0] || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-contain p-2 image-zoom"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {discount > 0 && (
            <Badge variant="destructive" className="sale-badge font-bold">
              -{discount}%
            </Badge>
          )}
          {isLowStock && (
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              Últimas unidades!
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              Esgotado
            </Badge>
          )}
        </div>

        {/* Share & Wishlist buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full shadow-md",
              isFav ? "opacity-100 bg-primary/10 text-primary" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={handleToggleWishlist}
          >
            <Heart className={cn("h-4 w-4", isFav && "fill-primary text-primary")} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Add to cart overlay */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isOutOfStock ? 'Esgotado' : 'Adicionar'}
          </Button>
        </div>
      </div>

      {/* Product info */}
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        
        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">
            €{product.price.toFixed(2)}
          </span>
          {product.original_price && (
            <span className="text-sm text-muted-foreground line-through">
              €{product.original_price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock info */}
        <div className="text-xs">
          {isOutOfStock ? (
            <span className="text-destructive font-medium">Esgotado</span>
          ) : isLowStock ? (
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              ⚠️ {product.stock === 1 ? 'Resta apenas 1 unidade' : `Apenas ${product.stock} unidades disponíveis`}
            </span>
          ) : (
            <span className="text-muted-foreground">Em stock: {product.stock} unidades</span>
          )}
        </div>
      </div>
    </Link>
  );
}
