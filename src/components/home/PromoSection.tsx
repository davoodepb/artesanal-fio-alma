import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PromoSection() {
  return (
    <section className="py-20 bg-gradient-to-r from-primary/90 via-primary to-accent/80 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="hearts" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <text x="15" y="20" fontSize="12" textAnchor="middle" fill="white">♡</text>
            </pattern>
          </defs>
          <rect fill="url(#hearts)" width="100%" height="100%" />
        </svg>
      </div>

      <div className="container relative">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="text-center lg:text-left space-y-5 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              <span>Coleção Especial</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white">
              Peças Únicas para<br />Momentos Especiais
            </h2>
            <p className="text-white/90 text-lg leading-relaxed">
              Cada peça é criada com amor e dedicação. Bordados exclusivos, 
              costuras delicadas e acabamentos perfeitos.
            </p>
          </div>
          
          {/* Feature cards */}
          <div className="flex gap-4">
            {[
              { icon: '🧵', label: 'Fio Natural' },
              { icon: '✂️', label: 'Corte Preciso' },
              { icon: '🪡', label: 'Ponto a Ponto' },
              { icon: '💕', label: 'Com Amor' },
            ].map((item, i) => (
              <div key={i} className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 text-center border border-white/20">
                <p className="text-3xl mb-2">{item.icon}</p>
                <p className="text-xs text-white/90 font-medium">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          
          <Link to="/products">
            <Button 
              variant="secondary" 
              size="xl" 
              className="rounded-full shadow-lg group bg-white text-primary hover:bg-white/90"
            >
              <Heart className="h-5 w-5 mr-2 group-hover:fill-primary transition-all" />
              Explorar Coleção
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
