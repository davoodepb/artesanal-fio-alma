import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      toast.info('Faça login para continuar');
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Carrinho vazio</h1>
          <p className="text-muted-foreground mb-8">
            Ainda não adicionou nenhum produto ao carrinho.
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

  const shipping = totalPrice >= 50 ? 0 : 4.99;
  const finalTotal = totalPrice + shipping;

  return (
    <Layout>
      <div className="container py-8">
        <h1 className="font-serif text-3xl font-bold mb-8">Carrinho de Compras</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(({ product, quantity }) => {
              const maxQuantity = product.stock === 1 ? 1 : product.stock;
              
              return (
                <div
                  key={product.id}
                  className="flex gap-4 p-4 bg-card rounded-xl border"
                >
                  <Link to={`/product/${product.slug}`} className="shrink-0">
                    <img
                      src={product.images[0] || '/placeholder.svg'}
                      alt={product.name}
                      className="w-24 h-24 object-contain bg-white rounded-lg p-1"
                    />
                  </Link>
                  
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/product/${product.slug}`}
                      className="font-medium hover:text-primary transition-colors line-clamp-2"
                    >
                      {product.name}
                    </Link>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold">€{product.price.toFixed(2)}</span>
                      {product.original_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          €{product.original_price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={quantity >= maxQuantity}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button variant="ghost" onClick={clearCart} className="text-destructive">
              Limpar carrinho
            </Button>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card rounded-xl border p-6 space-y-4">
              <h2 className="font-semibold text-lg">Resumo do Pedido</h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>€{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envio</span>
                  <span>{shipping === 0 ? 'Grátis' : `€${shipping.toFixed(2)}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Frete grátis em compras acima de €50
                  </p>
                )}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>€{finalTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={handleCheckout}
              >
                Finalizar Compra
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <Link to="/products" className="block">
                <Button variant="outline" className="w-full">
                  Continuar Comprando
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
