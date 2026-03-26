import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

const Wishlist = () => {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (product: typeof items[0]) => {
    if (product.stock <= 0) {
      toast.error('Produto esgotado');
      return;
    }
    addToCart(product, 1);
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Lista de Desejos Vazia</h1>
          <p className="text-muted-foreground mb-8">
            Ainda não adicionou nenhum produto aos favoritos.
          </p>
          <Link to="/products">
            <Button variant="hero" size="lg">
              Explorar Produtos
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl font-bold">
            Lista de Desejos ({items.length})
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={clearWishlist}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar tudo
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => (
            <div
              key={product.id}
              className="bg-card rounded-xl border overflow-hidden group hover:shadow-lg transition-shadow"
            >
              <Link to={`/product/${product.slug}`} className="block relative">
                <img
                  src={product.images?.[0] || '/placeholder.svg'}
                  alt={product.name}
                  className="w-full aspect-square object-contain p-2 bg-white group-hover:scale-105 transition-transform duration-300"
                />
                {product.stock <= 0 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-white text-black px-3 py-1 rounded-full text-sm font-medium">
                      Esgotado
                    </span>
                  </div>
                )}
                {product.original_price && product.original_price > product.price && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                  </span>
                )}
              </Link>

              <div className="p-4">
                <Link
                  to={`/product/${product.slug}`}
                  className="font-medium hover:text-primary transition-colors line-clamp-2 mb-2 block"
                >
                  {product.name}
                </Link>

                <div className="flex items-center gap-2 mb-4">
                  <span className="font-bold text-lg">€{product.price.toFixed(2)}</span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      €{product.original_price.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="hero"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock <= 0}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeFromWishlist(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Wishlist;
