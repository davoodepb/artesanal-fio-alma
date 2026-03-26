import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    if (isInstalled || isInStandaloneMode) return;
    
    const dismissedAt = localStorage.getItem('pwa-dismissed');
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSince < 24) return; // Don't show for 24h after dismiss
    }

    // Show banner after 3 seconds
    const timer = setTimeout(() => {
      if (isInstallable) {
        setShowBanner(true);
      } else if (isIOS) {
        setShowIOSPrompt(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isInStandaloneMode, isIOS]);

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setShowBanner(false);
    }
  };

  if (dismissed || isInstalled || isInStandaloneMode) return null;

  // iOS instruction prompt
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
        <div className="bg-card border border-craft/30 rounded-2xl p-4 shadow-xl max-w-md mx-auto">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h3 className="font-serif font-semibold text-sm">Instalar App</h3>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para instalar no iPhone/iPad:
          </p>
          <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
            <li>Toque no ícone <strong>Partilhar</strong> (□↑)</li>
            <li>Selecione <strong>"Adicionar ao ecrã principal"</strong></li>
            <li>Confirme tocando <strong>"Adicionar"</strong></li>
          </ol>
        </div>
      </div>
    );
  }

  // Chrome/Edge install banner
  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-card border border-craft/30 rounded-2xl p-4 shadow-xl max-w-md mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <img src="/icons/icon-48.png" alt="Fio & Alma" className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-sm">Fio & Alma Studio</h3>
              <p className="text-xs text-muted-foreground">Instalar como aplicação</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          Instale a nossa app para acesso rápido, funcionamento offline e a melhor experiência!
        </p>
        <div className="flex gap-2">
          <Button onClick={handleInstall} size="sm" className="flex-1 rounded-full gap-2">
            <Download className="h-4 w-4" />
            Instalar App
          </Button>
          <Button onClick={handleDismiss} variant="outline" size="sm" className="rounded-full">
            Agora não
          </Button>
        </div>
      </div>
    </div>
  );
}
