import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Cookie, X, Settings2, Check } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'fioealma_cookie_consent';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  timestamp: string;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      // Show after a small delay for better UX
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (analytics: boolean) => {
    const consent: ConsentState = {
      essential: true, // always required
      analytics,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    window.dispatchEvent(
      new CustomEvent('cookie-consent-updated', {
        detail: consent,
      })
    );
    setVisible(false);
  };

  const acceptAll = () => saveConsent(true);
  const acceptEssential = () => saveConsent(false);
  const savePreferences = () => saveConsent(analyticsChecked);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-2xl mx-auto bg-card border shadow-2xl rounded-2xl overflow-hidden">
        {/* Main banner */}
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif font-semibold text-base mb-1">
                Utilizamos cookies 🍪
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Usamos cookies essenciais para o funcionamento do site e cookies analíticos para melhorar 
                a sua experiência. Pode personalizar as suas preferências.{' '}
                <Link to="/privacy" className="text-primary hover:underline" onClick={() => setVisible(false)}>
                  Saber mais
                </Link>
              </p>
            </div>
            <button
              onClick={acceptEssential}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Details panel */}
          {showDetails && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Cookies Essenciais</p>
                  <p className="text-xs text-muted-foreground">
                    Necessários para autenticação, carrinho e funcionamento básico
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  <Check className="h-3 w-3" />
                  Sempre ativos
                </div>
              </div>
              <label className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Cookies Analíticos</p>
                  <p className="text-xs text-muted-foreground">
                    Ajudam-nos a compreender como utiliza o site para melhorar a experiência
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analyticsChecked}
                  onChange={(e) => setAnalyticsChecked(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-[hsl(var(--primary))]"
                />
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button onClick={acceptAll} className="flex-1 rounded-full" size="sm">
              Aceitar Todos
            </Button>
            {showDetails ? (
              <Button onClick={savePreferences} variant="outline" className="flex-1 rounded-full" size="sm">
                Guardar Preferências
              </Button>
            ) : (
              <Button
                onClick={() => setShowDetails(true)}
                variant="outline"
                className="flex-1 rounded-full gap-2"
                size="sm"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Personalizar
              </Button>
            )}
            <Button onClick={acceptEssential} variant="ghost" className="flex-1 rounded-full" size="sm">
              Apenas Essenciais
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
