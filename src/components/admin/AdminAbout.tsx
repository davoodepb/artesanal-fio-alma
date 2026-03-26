import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, Heart, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from './ImageUpload';

interface AboutSettings {
  title: string;
  story: string;
  mission: string;
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  artisan1Name: string;
  artisan1Bio: string;
  artisan1Image: string;
  artisan2Name: string;
  artisan2Bio: string;
  artisan2Image: string;
}

export function AdminAbout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [about, setAbout] = useState<AboutSettings>({
    title: 'Sobre Nós',
    story: 'Somos duas artesãs apaixonadas pela arte da costura tradicional. Cada peça que criamos carrega a nossa dedicação e o amor pelo trabalho manual.',
    mission: 'A nossa missão é preservar a arte da costura artesanal, criando peças únicas que contam histórias e trazem alegria aos nossos clientes.',
    contactEmail: 'ola@fioealma.pt',
    contactPhone: '+351 912 345 678',
    contactLocation: 'Lisboa, Portugal',
    artisan1Name: '',
    artisan1Bio: '',
    artisan1Image: '',
    artisan2Name: '',
    artisan2Bio: '',
    artisan2Image: '',
  });

  useEffect(() => {
    fetchAboutSettings();
  }, []);

  const fetchAboutSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'about_us')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const aboutData = data.value as unknown as AboutSettings;
        setAbout(aboutData);
      }
    } catch (error) {
      console.error('Error fetching about settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'about_us')
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('site_settings')
          .update({
            value: JSON.parse(JSON.stringify(about)),
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'about_us');
        error = result.error;
      } else {
        const result = await supabase
          .from('site_settings')
          .insert([{
            key: 'about_us',
            value: JSON.parse(JSON.stringify(about)),
          }]);
        error = result.error;
      }

      if (error) throw error;

      toast.success('Informações atualizadas com sucesso!');
    } catch (error) {
      console.error('Error saving about:', error);
      toast.error('Erro ao guardar informações');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Sobre Nós</h1>
        <p className="text-muted-foreground">Edite as informações da página "Sobre Nós"</p>
      </div>

      <div className="grid gap-6">
        {/* Main Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Informações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título da Página</Label>
              <Input
                value={about.title}
                onChange={(e) => setAbout({ ...about, title: e.target.value })}
                placeholder="Sobre Nós"
              />
            </div>

            <div className="space-y-2">
              <Label>A Nossa História</Label>
              <Textarea
                value={about.story}
                onChange={(e) => setAbout({ ...about, story: e.target.value })}
                placeholder="Conte a história da marca..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>A Nossa Missão</Label>
              <Textarea
                value={about.mission}
                onChange={(e) => setAbout({ ...about, mission: e.target.value })}
                placeholder="Qual é a missão da marca..."
                rows={3}
              />
            </div>

            <div className="pt-2 border-t border-border/60" />

            <div className="space-y-2">
              <Label>Email de Contacto</Label>
              <Input
                type="email"
                value={about.contactEmail}
                onChange={(e) => setAbout({ ...about, contactEmail: e.target.value })}
                placeholder="ola@fioealma.pt"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone de Contacto</Label>
              <Input
                value={about.contactPhone}
                onChange={(e) => setAbout({ ...about, contactPhone: e.target.value })}
                placeholder="+351 912 345 678"
              />
            </div>

            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                value={about.contactLocation}
                onChange={(e) => setAbout({ ...about, contactLocation: e.target.value })}
                placeholder="Lisboa, Portugal"
              />
            </div>
          </CardContent>
        </Card>

        {/* Artisans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Artesã 1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={about.artisan1Name}
                  onChange={(e) => setAbout({ ...about, artisan1Name: e.target.value })}
                  placeholder="Nome da artesã"
                />
              </div>
              <div className="space-y-2">
                <Label>Biografia</Label>
                <Textarea
                  value={about.artisan1Bio}
                  onChange={(e) => setAbout({ ...about, artisan1Bio: e.target.value })}
                  placeholder="Breve biografia..."
                  rows={3}
                />
              </div>
              <ImageUpload
                value={about.artisan1Image}
                onChange={(url) => setAbout({ ...about, artisan1Image: url })}
                folder="about"
                label="Foto da Artesã"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Artesã 2
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={about.artisan2Name}
                  onChange={(e) => setAbout({ ...about, artisan2Name: e.target.value })}
                  placeholder="Nome da artesã"
                />
              </div>
              <div className="space-y-2">
                <Label>Biografia</Label>
                <Textarea
                  value={about.artisan2Bio}
                  onChange={(e) => setAbout({ ...about, artisan2Bio: e.target.value })}
                  placeholder="Breve biografia..."
                  rows={3}
                />
              </div>
              <ImageUpload
                value={about.artisan2Image}
                onChange={(url) => setAbout({ ...about, artisan2Image: url })}
                folder="about"
                label="Foto da Artesã"
              />
            </CardContent>
          </Card>
        </div>

        <Button onClick={handleSave} disabled={isSaving} size="lg" className="w-full md:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A guardar...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Todas as Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
