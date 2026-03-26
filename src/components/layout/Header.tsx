import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Search, Heart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useProducts } from '@/hooks/useProducts';

interface HeaderProps {
  onAdminTap?: () => void;
}

export function Header({ onAdminTap }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const { totalItems } = useCart();
  const { user } = useAuth();
  const { totalItems: wishlistCount } = useWishlist();
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const { data: products = [] } = useProducts();
  const navigate = useNavigate();

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
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
      .slice(0, 5)
      .map((entry) => entry.product);
  }, [products, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchOpen(false);
      setShowSearchSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    setSearchQuery('');
    setIsSearchOpen(false);
    setShowSearchSuggestions(false);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAdminTap) {
      onAdminTap();
    }
  };

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/products', label: 'Coleção' },
    { href: '/categories', label: 'Categorias' },
    { href: '/blog', label: 'Blog' },
    { href: '/about', label: 'Sobre Nós' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-craft/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top bar - Artisanal announcement */}
      <div className="bg-gradient-to-r from-primary/90 to-accent/80 text-white py-2.5 text-center text-sm">
        <span className="flex items-center justify-center gap-2">
          <span>🧵</span>
          <span>Peças únicas, feitas à mão com amor</span>
          <span>✨</span>
        </span>
      </div>
      
      <div className="container flex h-18 py-3 items-center justify-between">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-background border-r border-craft/20">
            <div className="mt-6 mb-8">
              <div className="flex items-center gap-2">
                <img src="/icons/icon-32.png" alt="Fio & Alma Studio" className="h-8 w-8 rounded-md" />
                <span className="font-script text-2xl text-primary">Fio & Alma Studio</span>
              </div>
            </div>
            <nav className="flex flex-col space-y-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <span className="text-craft">✿</span>
                  {link.label}
                </Link>
              ))}
              <Link
                to="/wishlist"
                className="text-lg font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
              >
                <Heart className="h-4 w-4 text-craft" />
                Favoritos {wishlistCount > 0 && `(${wishlistCount})`}
              </Link>
              {isInstallable && !isInstalled && (
                <button
                  onClick={installApp}
                  className="text-lg font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Instalar App
                  <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                </button>
              )}
            </nav>
            <div className="stitch-divider w-full my-8" />
            <p className="text-sm text-muted-foreground italic">
              "Cada ponto conta uma história"
            </p>
          </SheetContent>
        </Sheet>

        {/* Logo - tap 5 times for admin */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleLogoClick}
            className="flex items-center gap-2 focus:outline-none group"
          >
            <img src="/icons/icon-32.png" alt="Fio & Alma Studio" className="h-8 w-8 rounded-md" />
            <span className="flex flex-col items-start">
              <span className="font-script text-2xl md:text-3xl text-primary select-none group-hover:text-primary/80 transition-colors">
                Fio & Alma Studio
              </span>
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                Costura Artesanal
              </span>
            </span>
          </button>
          <Link to="/" className="sr-only">Ir para página inicial</Link>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full rounded-full" />
            </Link>
          ))}
        </nav>

        {/* Search and actions */}
        <div className="flex items-center space-x-1">
          {/* Search */}
          {isSearchOpen ? (
            <form onSubmit={handleSearch} className="relative flex items-center">
              <Input
                type="search"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 120)}
                className="w-40 md:w-60 rounded-full border-craft/30 focus:border-primary"
                autoFocus
              />
              {showSearchSuggestions && searchSuggestions.length > 0 && searchQuery.trim() && (
                <div className="absolute left-0 right-10 top-full mt-2 rounded-xl border bg-card shadow-lg z-20 overflow-hidden">
                  {searchSuggestions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSuggestionClick(product.name)}
                      className="w-full px-4 py-3 text-left hover:bg-muted/60 transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category?.name || 'Sem categoria'}</p>
                    </button>
                  ))}
                </div>
              )}
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setIsSearchOpen(false);
                  setShowSearchSuggestions(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(true)}
              className="text-foreground hover:text-primary hover:bg-primary/10"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}

          {/* Install App */}
          {isInstallable && !isInstalled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={installApp}
              className="text-primary hover:text-primary/80 hover:bg-primary/10 relative animate-in fade-in duration-500"
              title="Instalar App"
            >
              <Download className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </Button>
          )}

          {/* Wishlist */}
          <Link to="/wishlist" className="relative hidden sm:flex">
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary hover:bg-primary/10">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground rounded-full"
                >
                  {wishlistCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Account */}
          <Link to={user ? '/account' : '/login'}>
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary hover:bg-primary/10">
              <User className="h-5 w-5" />
            </Button>
          </Link>

          {/* Cart */}
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon" className="text-foreground hover:text-primary hover:bg-primary/10">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground rounded-full"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
