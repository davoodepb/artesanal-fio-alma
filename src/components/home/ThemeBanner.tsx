import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useActiveTheme } from '@/hooks/useThemes';

/**
 * ThemeBanner — Mostra o banner do tema sazonal ativo na homepage
 * 
 * Exemplos de uso:
 * - Natal: banner festivo com cor vermelha e imagem de Natal
 * - Dia da Mãe: banner rosa com chamada para presentes
 * - Black Friday: banner escuro com destaque para descontos
 */
export function ThemeBanner() {
  const { data: activeTheme, isLoading } = useActiveTheme();

  // Não mostra nada se não há tema ativo ou está a carregar
  if (isLoading || !activeTheme) return null;

  return (
    <section
      className="relative overflow-hidden"
      style={{ backgroundColor: activeTheme.primary_color || '#E86A6A' }}
    >
      {/* Imagem de fundo (se existir) */}
      {activeTheme.image_url && (
        <img
          src={activeTheme.image_url}
          alt={activeTheme.name}
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
      )}

      {/* Padrão decorativo de costura */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="theme-stitch" x="0" y="0" width="15" height="15" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="white" opacity="0.5" />
              <line x1="0" y1="7" x2="6" y2="7" stroke="white" strokeWidth="0.3" strokeDasharray="2,1.5" opacity="0.4" />
            </pattern>
          </defs>
          <rect fill="url(#theme-stitch)" width="100%" height="100%" />
        </svg>
      </div>

      <div className="container relative py-10 md:py-14 text-center text-white">
        {/* Etiqueta / Badge */}
        {activeTheme.badge_label && (
          <span className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-white/20">
            {activeTheme.badge_label}
          </span>
        )}

        {/* Título */}
        <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-3 drop-shadow-lg">
          {activeTheme.banner_title || activeTheme.name}
        </h2>

        {/* Subtítulo */}
        {activeTheme.banner_subtitle && (
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-6 leading-relaxed">
            {activeTheme.banner_subtitle}
          </p>
        )}

        {/* Descrição */}
        {activeTheme.description && !activeTheme.banner_subtitle && (
          <p className="text-lg text-white/85 max-w-xl mx-auto mb-6">
            {activeTheme.description}
          </p>
        )}

        {/* Botão CTA */}
        <Link to="/products">
          <Button
            size="lg"
            className="rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
          >
            Ver Coleção
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </Link>

        {/* Linha decorativa inferior */}
        <div className="mt-8">
          <svg className="w-40 h-3 mx-auto opacity-40" viewBox="0 0 160 12">
            <line x1="0" y1="6" x2="160" y2="6" stroke="white" strokeWidth="1.5" strokeDasharray="6,4" />
          </svg>
        </div>
      </div>
    </section>
  );
}
