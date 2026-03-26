import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { MultiImageUpload } from '@/components/admin/ImageUpload';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminBanners } from '@/components/admin/AdminBanners';
import { AdminAbout } from '@/components/admin/AdminAbout';
import { AdminChat } from '@/components/admin/AdminChat';
import { AdminCategories } from '@/components/admin/AdminCategories';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminOrders } from '@/components/admin/AdminOrders';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminReviews } from '@/components/admin/AdminReviews';
import { AdminAnnouncements } from '@/components/admin/AdminAnnouncements';
import { AdminNews } from '@/components/admin/AdminNews';
import { AdminThemes } from '@/components/admin/AdminThemes';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AdminLogin from './AdminLogin';

function triggerBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !("Notification" in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
    return;
  }
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { data: products = [], isLoading: productsLoading } = useAllProducts();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [activeTab, setActiveTab] = useState('overview');
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProductSlugManual, setIsProductSlugManual] = useState(false);
  
  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    original_price: '',
    stock: '',
    category_id: '',
    images: [] as string[],
    is_active: true,
  });

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    activeUsers: 0,
    revenue: 0,
    pendingReviews: 0,
    unreadMessages: 0,
    newOrders: 0,
    newUsers: 0,
  });

  const isSessionAuthenticated = !!sessionStorage.getItem('admin_authenticated');
  const shouldShowLogin = !authLoading && (!user || !isAdmin || !isSessionAuthenticated);

  // Clear session flag when browser/tab closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      // sessionStorage is automatically cleared on browser close,
      // but we also handle tab-level cleanup
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const activeSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const [productsRes, ordersRes, reviewsRes, messagesRes, newOrdersRes, customersRes, activeUsersRes] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact' }),
          supabase.from('orders').select('id, total', { count: 'exact' }),
          supabase.from('reviews').select('id', { count: 'exact' }).eq('is_approved', false),
          supabase.from('chat_messages').select('id', { count: 'exact' }).eq('is_read', false).eq('sender_role', 'customer'),
          supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen', activeSince),
        ]);
        
        const revenue = ordersRes.data?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;
        
        setStats({
          totalProducts: productsRes.count || 0,
          totalOrders: ordersRes.count || 0,
          totalCustomers: customersRes.count || 0,
          activeUsers: activeUsersRes.count || 0,
          revenue,
          pendingReviews: reviewsRes.count || 0,
          unreadMessages: messagesRes.count || 0,
          newOrders: newOrdersRes.count || 0,
          newUsers: 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  // Real-time subscriptions for notifications
  useEffect(() => {
    if (!isAdmin) return;

    // Subscribe to new chat messages
    const chatChannel = supabase
      .channel('admin-chat-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'sender_role=eq.customer' },
        () => {
          setStats(prev => ({ ...prev, unreadMessages: prev.unreadMessages + 1 }));
        }
      )
      .subscribe();

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('admin-order-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as { id?: string; total?: number | string };
          const orderCode = newOrder?.id?.slice(0, 8).toUpperCase() || 'NOVO';
          const orderTotal = Number(newOrder?.total || 0);

          setStats(prev => ({
            ...prev,
            totalOrders: prev.totalOrders + 1,
            revenue: prev.revenue + (Number.isFinite(orderTotal) ? orderTotal : 0),
            newOrders: prev.newOrders + 1,
          }));

          toast.success(`Novo pedido #${orderCode} recebido`);
          if (document.hidden || activeTab !== 'orders') {
            triggerBrowserNotification('Novo pedido recebido', `Pedido #${orderCode} no valor de €${orderTotal.toFixed(2)}.`);
          }
        }
      )
      .subscribe();

    // Subscribe to new reviews
    const reviewsChannel = supabase
      .channel('admin-review-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reviews' },
        () => {
          setStats(prev => ({ ...prev, pendingReviews: prev.pendingReviews + 1 }));
        }
      )
      .subscribe();

    // Subscribe to new users (profiles created on signup)
    const usersChannel = supabase
      .channel('admin-user-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => {
          setStats(prev => ({
            ...prev,
            totalCustomers: prev.totalCustomers + 1,
            newUsers: prev.newUsers + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [isAdmin, activeTab]);

  // Mark messages as read when admin opens chat tab
  useEffect(() => {
    if (activeTab === 'chat' && isAdmin) {
      setStats(prev => ({ ...prev, unreadMessages: 0 }));
    }
  }, [activeTab, isAdmin]);

  // Clear new orders badge when admin opens orders tab
  useEffect(() => {
    if (activeTab === 'orders' && isAdmin) {
      setStats(prev => ({ ...prev, newOrders: 0 }));
    }
  }, [activeTab, isAdmin]);

  // Clear new users badge when admin opens users tab
  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      setStats(prev => ({ ...prev, newUsers: 0 }));
    }
  }, [activeTab, isAdmin]);

  const handleLogout = async () => {
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_access_unlocked');
    await signOut();
    navigate('/');
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      slug: '',
      description: '',
      price: '',
      original_price: '',
      stock: '',
      category_id: '',
      images: [] as string[],
      is_active: true,
    });
    setEditingProduct(null);
    setIsProductSlugManual(false);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      stock: product.stock.toString(),
      category_id: product.category_id || '',
      images: product.images || [],
      is_active: product.is_active,
    });
    setIsProductSlugManual(true);
    setIsProductDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productForm.name || !productForm.price || !productForm.stock) {
      toast.error('Por favor, preencha os campos obrigatórios');
      return;
    }

    const productData = {
      name: productForm.name,
      slug: productForm.slug || generateSlug(productForm.name),
      description: productForm.description || null,
      price: parseFloat(productForm.price),
      original_price: productForm.original_price ? parseFloat(productForm.original_price) : null,
      stock: parseInt(productForm.stock),
      category_id: productForm.category_id || null,
      images: productForm.images,
      is_active: productForm.is_active,
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
      } else {
        await createProduct.mutateAsync(productData);
      }
      setIsProductDialogOpen(false);
      resetProductForm();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja eliminar este produto?')) {
      await deleteProduct.mutateAsync(id);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (shouldShowLogin) {
    return <AdminLogin />;
  }

  if (!isAdmin) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview stats={stats} />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'products':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
              <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                setIsProductDialogOpen(open);
                if (!open) resetProductForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input
                          value={productForm.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setProductForm({ 
                              ...productForm, 
                              name,
                              slug: isProductSlugManual ? productForm.slug : generateSlug(name)
                            });
                          }}
                          placeholder="Nome do produto"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input
                          value={productForm.slug}
                          onChange={(e) => {
                            setIsProductSlugManual(true);
                            setProductForm({ ...productForm, slug: e.target.value });
                          }}
                          placeholder="url-do-produto"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="Descrição do produto"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Preço *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço Original</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productForm.original_price}
                          onChange={(e) => setProductForm({ ...productForm, original_price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stock *</Label>
                        <Input
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select 
                        value={productForm.category_id} 
                        onValueChange={(v) => setProductForm({ ...productForm, category_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <MultiImageUpload
                      values={productForm.images}
                      onChange={(urls) => setProductForm({ ...productForm, images: urls })}
                      folder="products"
                      label="Imagens do Produto"
                    />
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={productForm.is_active}
                        onCheckedChange={(checked) => setProductForm({ ...productForm, is_active: checked })}
                      />
                      <Label>Produto ativo</Label>
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                        {(createProduct.isPending || updateProduct.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {editingProduct ? 'Guardar' : 'Criar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {productsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum produto encontrado. Adicione o primeiro!
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <img
                                src={(product.images && product.images[0]) || '/placeholder.svg'}
                                alt={product.name}
                                className="w-10 h-10 object-contain bg-white rounded border"
                              />
                              <span className="line-clamp-1">{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>€{product.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={product.stock > 5 ? 'default' : product.stock > 0 ? 'secondary' : 'destructive'}>
                              {product.stock}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 'categories':
        return <AdminCategories />;
      case 'orders':
        return <AdminOrders />;
      case 'reviews':
        return <AdminReviews />;
      case 'announcements':
        return <AdminAnnouncements />;
      case 'chat':
        return <AdminChat />;
      case 'users':
        return <AdminUsers />;
      case 'banners':
        return <AdminBanners />;
      case 'themes':
        return <AdminThemes />;
      case 'about':
        return <AdminAbout />;
      case 'news':
        return <AdminNews />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminOverview stats={stats} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={handleLogout}
          userEmail={user?.email}
          badges={{
            chat: stats.unreadMessages,
            orders: stats.newOrders,
            reviews: stats.pendingReviews,
            users: stats.newUsers,
          }}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <AdminSidebar 
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setIsMobileSidebarOpen(false);
            }}
            onLogout={handleLogout}
            userEmail={user?.email}
            badges={{
              chat: stats.unreadMessages,
              orders: stats.newOrders,
              reviews: stats.pendingReviews,
              users: stats.newUsers,
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 border-b bg-card p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-script text-xl text-primary">Fio & Alma Studio</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Admin;
