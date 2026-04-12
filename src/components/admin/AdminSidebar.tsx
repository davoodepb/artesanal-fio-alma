import React from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingCart,
  MessageSquare,
  Megaphone,
  MessageCircle,
  Info,
  Newspaper,
  Settings,
  LogOut,
  FolderOpen,
  Image,
  CalendarHeart,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userEmail?: string;
  badges?: Record<string, number>;
}

const menuItems = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'analytics', label: 'Análises', icon: BarChart3 },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'categories', label: 'Categorias', icon: FolderOpen },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
  { id: 'reviews', label: 'Avaliações', icon: MessageSquare },
  { id: 'announcements', label: 'Anúncios', icon: Megaphone },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'themes', label: 'Temas Sazonais', icon: CalendarHeart },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'users', label: 'Utilizadores', icon: Users },
  { id: 'about', label: 'Sobre Nós', icon: Info },
  { id: 'news', label: 'Novidades', icon: Newspaper },
  { id: 'settings', label: 'Definições', icon: Settings },
];

export function AdminSidebar({ activeTab, onTabChange, onLogout, userEmail, badges = {} }: AdminSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-64">
      {/* Logo and Avatar */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            F
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg">FIO & ALMA STUDIO</h1>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {badges[item.id] > 0 && (
                  <span className={cn(
                    "min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center",
                    isActive
                      ? "bg-primary-foreground text-primary"
                      : "bg-destructive text-destructive-foreground"
                  )}>
                    {badges[item.id] > 99 ? '99+' : badges[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onLogout}
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </div>
  );
}
