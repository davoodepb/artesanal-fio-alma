import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminProducts } from '@/components/admin/AdminProducts';
import { AdminCategories } from '@/components/admin/AdminCategories';
import { AdminOrders } from '@/components/admin/AdminOrders';
import { AdminReviews } from '@/components/admin/AdminReviews';
import { AdminAnnouncements } from '@/components/admin/AdminAnnouncements';
import { AdminBanners } from '@/components/admin/AdminBanners';
import { AdminThemes } from '@/components/admin/AdminThemes';
import { AdminChat } from '@/components/admin/AdminChat';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminAbout } from '@/components/admin/AdminAbout';
import { AdminNews } from '@/components/admin/AdminNews';
import { AdminSettings } from '@/components/admin/AdminSettings';
import AdminLogin from './AdminLogin';

type AdminTab =
  | 'overview'
  | 'analytics'
  | 'products'
  | 'categories'
  | 'orders'
  | 'reviews'
  | 'announcements'
  | 'banners'
  | 'themes'
  | 'chat'
  | 'users'
  | 'about'
  | 'news'
  | 'settings';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  activeUsers: number;
  revenue: number;
  pendingReviews: number;
  unreadMessages: number;
  newOrders: number;
  newUsers: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<Stats>({
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

  const isAccessUnlocked = sessionStorage.getItem('admin_access_unlocked') === 'true';
  const isSessionAuthenticated = !!sessionStorage.getItem('admin_authenticated');
  const canAttemptAdminLogin = isAccessUnlocked || isSessionAuthenticated;
  const shouldShowLogin = !authLoading && canAttemptAdminLogin && (!user || !isAdmin || !isSessionAuthenticated);

  const fetchStats = async () => {
    try {
      const activeSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const [productsRes, ordersRes, reviewsRes, messagesRes, newOrdersRes, customersRes, activeUsersRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('id,total', { count: 'exact' }),
        supabase.from('reviews').select('id', { count: 'exact' }).eq('is_approved', false),
        supabase.from('chat_messages').select('id', { count: 'exact' }).eq('is_read', false).eq('sender_role', 'customer'),
        supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen', activeSince),
      ]);

      const revenue = Array.isArray(ordersRes.data)
        ? ordersRes.data.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0)
        : 0;

      setStats({
        totalProducts: Number(productsRes.count || 0),
        totalOrders: Number(ordersRes.count || 0),
        totalCustomers: Number(customersRes.count || 0),
        activeUsers: Number(activeUsersRes.count || 0),
        revenue,
        pendingReviews: Number(reviewsRes.count || 0),
        unreadMessages: Number(messagesRes.count || 0),
        newOrders: Number(newOrdersRes.count || 0),
        newUsers: 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  const handleLogout = async () => {
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_access_unlocked');
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAttemptAdminLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-serif font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Esta area esta protegida. Utilize o desbloqueio pelo logotipo na pagina principal para continuar.
          </p>
        </div>
      </div>
    );
  }

  if (shouldShowLogin) {
    return <AdminLogin />;
  }

  if (!isAdmin) return null;

  const badges = {
    reviews: stats.pendingReviews,
    chat: stats.unreadMessages,
    orders: stats.newOrders,
    users: stats.newUsers,
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as AdminTab)}
        onLogout={handleLogout}
        userEmail={user?.email || ''}
        badges={badges}
      />

      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && <AdminOverview stats={stats} />}
        {activeTab === 'analytics' && <AdminAnalytics />}
        {activeTab === 'products' && <AdminProducts />}
        {activeTab === 'categories' && <AdminCategories />}
        {activeTab === 'orders' && <AdminOrders />}
        {activeTab === 'reviews' && <AdminReviews />}
        {activeTab === 'announcements' && <AdminAnnouncements />}
        {activeTab === 'banners' && <AdminBanners />}
        {activeTab === 'themes' && <AdminThemes />}
        {activeTab === 'chat' && <AdminChat />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'about' && <AdminAbout />}
        {activeTab === 'news' && <AdminNews />}
        {activeTab === 'settings' && <AdminSettings />}
      </main>
    </div>
  );
};

export default Admin;
