import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { CustomerChat } from '@/components/chat/CustomerChat';
import { ChatWidgetBoundary } from '@/components/chat/ChatWidgetBoundary';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Secret admin access: tap logo 5 times quickly
  const handleAdminTap = useCallback(() => {
    setTapCount((prev) => {
      const newCount = prev + 1;
      
      // Reset timer on each tap
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
      }
      
      // Reset count after 2 seconds of no taps
      tapTimer.current = setTimeout(() => {
        setTapCount(0);
      }, 2000);
      
      // Navigate to admin login after 5 taps
      if (newCount >= 5) {
        setTapCount(0);
        if (tapTimer.current) {
          clearTimeout(tapTimer.current);
        }
        sessionStorage.setItem('admin_access_unlocked', 'true');
        navigate('/admin');
      }
      
      return newCount;
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onAdminTap={handleAdminTap} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <ChatWidgetBoundary>
        <CustomerChat />
      </ChatWidgetBoundary>
      <PWAInstallPrompt />
    </div>
  );
}
