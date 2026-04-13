import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/SEOHead';
import { useProduct } from '@/hooks/useProducts';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Share2, Minus, Plus, Star, Truck, Shield, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerReviews } from '@/components/products/CustomerReviews';

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading } = useProduct(slug || '');
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
          <Link to="/products">
            <Button>Ver outros produtos</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const discount = product.original_price 
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;
  
  const isOutOfStock = product.stock === 0;
  const maxQuantity = product.stock === 1 ? 1 : product.stock;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setQuantity(1);
  };

  const productUrl = window.location.href;
  const shareText = `Veja este produto: ${product.name} - €${product.price.toFixed(2)}`;

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + productUrl)}`, '_blank');
  };

  const shareInstagram = () => {
    // Instagram doesn't have a direct share URL, copy link instead
    navigator.clipboard.writeText(productUrl);
    import('sonner').then(({ toast }) => {
      toast.success('Link copiado! Cole no Instagram para partilhar.');
    });
  };

  const shareGeneric = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: shareText, url: productUrl });
      } catch {}
    } else {
      navigator.clipboard.writeText(productUrl);
      import('sonner').then(({ toast }) => {
        toast.success('Link copiado!');
      });
    }
  };

  const images = product.images.length > 0 ? product.images : ['/placeholder.svg'];

  return (
    <Layout>
      <SEOHead
        title={`${product.name} | Artesanato Feito à Mão - Fio & Alma Studio`}
        description={product.description || `Compre ${product.name} - peça artesanal feita à mão. Preço: €${product.price.toFixed(2)}. Fio & Alma Studio.`}
        keywords={[
          'artesanato',
          'loja de artesanato',
          'artesanato online',
          'artesanato feito à mão',
          'produtos artesanais',
          product.name,
          product.category?.name || 'categoria artesanal',
        ]}
        canonical={`https://fio-alma-studio.vercel.app/product/${product.slug}`}
        ogImage={product.images[0] || '/icons/icon-512.png'}
        ogType="product"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description || `Peça artesanal feita à mão: ${product.name}`,
          image: product.images,
          url: `https://fio-alma-studio.vercel.app/product/${product.slug}`,
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "EUR",
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: "Fio & Alma Studio" }
          }
        }}
      />
      <div className="container py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-foreground">Produtos</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-white relative">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-contain p-4"
                decoding="async"
                fetchPriority="high"
              />
              {discount > 0 && (
                <Badge variant="destructive" className="absolute top-4 left-4 text-lg px-3 py-1">
                  -{discount}%
                </Badge>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-colors bg-white",
                      selectedImage === i ? "border-primary" : "border-transparent"
                    )}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - imagem ${i + 1}`}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-6">
            {product.category && (
              <Badge variant="secondary">{product.category.name}</Badge>
            )}
            
            <h1 className="font-serif text-3xl lg:text-4xl font-bold">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-foreground">€{product.price.toFixed(2)}</span>
              {product.original_price && (
                <span className="text-xl text-muted-foreground line-through">€{product.original_price.toFixed(2)}</span>
              )}
            </div>

            {/* Stock status */}
            {isOutOfStock ? (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span className="text-destructive font-semibold">Produto esgotado</span>
              </div>
            ) : product.stock <= 5 ? (
              <div className="flex items-center gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-4 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-orange-700 dark:text-orange-300 font-semibold">
                  ⚠️ {product.stock === 1 ? 'Resta apenas 1 unidade' : `Apenas ${product.stock} unidades disponíveis`}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Em stock: {product.stock} unidades
                </span>
              </div>
            )}

            <p className="text-muted-foreground leading-relaxed">
              {product.description || 'Descrição do produto em breve.'}
            </p>

            {/* Quantity and Add to cart */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center border rounded-lg">
                <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} disabled={quantity >= maxQuantity}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <Button variant="hero" size="lg" className="flex-1" onClick={handleAddToCart} disabled={isOutOfStock}>
                <ShoppingCart className="h-5 w-5 mr-2" />
                {isOutOfStock ? 'Esgotado' : 'Adicionar ao Carrinho'}
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Entrega grátis €50+</p>
              </div>
              <div className="text-center">
                <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">Pagamento seguro</p>
              </div>
              <div className="text-center">
                <RotateCcw className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-xs text-muted-foreground">30 dias devolução</p>
              </div>
            </div>

            {/* Social Share */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Partilhar:</p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={shareWhatsApp} className="gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </Button>
                <Button variant="outline" size="sm" onClick={shareInstagram} className="gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram
                </Button>
                <Button variant="outline" size="sm" onClick={shareGeneric} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Partilhar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <CustomerReviews productId={product.id} />
      </div>
    </Layout>
  );
};

export default ProductDetail;
