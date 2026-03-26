import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from './ImageUpload';

interface BannerSettings {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
  isActive: boolean;
}

export function AdminBanners() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<BannerSettings>({
    title: 'Artesanato Feito com Amor',
    subtitle: 'Peças únicas, costuradas à mão com carinho e dedicação',
    buttonText: 'Ver Coleção',
    buttonLink: '/products',
    imageUrl: '',
    isActive: true,
  });

  useEffect(() => {
    fetchBannerSettings();
  }, []);

  const fetchBannerSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_banner')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const bannerData = data.value as unknown as BannerSettings;
        setBanner(bannerData);
      }
    } catch (error) {
      console.error('Error fetching banner settings:', error);
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
        .eq('key', 'hero_banner')
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('site_settings')
          .update({
            value: JSON.parse(JSON.stringify(banner)),
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'hero_banner');
        error = result.error;
      } else {
        const result = await supabase
          .from('site_settings')
          .insert([{
            key: 'hero_banner',
            value: JSON.parse(JSON.stringify(banner)),
          }]);
        error = result.error;
      }

      if (error) throw error;

      toast.success('Banner atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Erro ao guardar banner');
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
        <h1 className="text-2xl font-serif font-bold text-foreground">Gestão de Banners</h1>
        <p className="text-muted-foreground">Configure o banner principal da página inicial</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Banner Principal
            </CardTitle>
            <CardDescription>
              Este banner aparece no topo da página inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={banner.title}
                onChange={(e) => setBanner({ ...banner, title: e.target.value })}
                placeholder="Título do banner"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Textarea
                value={banner.subtitle}
                onChange={(e) => setBanner({ ...banner, subtitle: e.target.value })}
                placeholder="Descrição curta"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Texto do Botão</Label>
                <Input
                  value={banner.buttonText}
                  onChange={(e) => setBanner({ ...banner, buttonText: e.target.value })}
                  placeholder="Ver Coleção"
                />
              </div>
              <div className="space-y-2">
                <Label>Link do Botão</Label>
                <Input
                  value={banner.buttonLink}
                  onChange={(e) => setBanner({ ...banner, buttonLink: e.target.value })}
                  placeholder="/products"
                />
              </div>
            </div>

            <ImageUpload
              value={banner.imageUrl}
              onChange={(url) => setBanner({ ...banner, imageUrl: url })}
              folder="banners"
              label="Imagem do Banner"
            />

            <div className="flex items-center gap-2">
              <Switch
                checked={banner.isActive}
                onCheckedChange={(checked) => setBanner({ ...banner, isActive: checked })}
              />
              <Label>Banner ativo</Label>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Alterações
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 p-8 min-h-[300px]">
              {banner.imageUrl && (
                <img 
                  src={banner.imageUrl} 
                  alt="Banner preview" 
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
              )}
              <div className="relative z-10 text-center space-y-4">
                <h2 className="font-script text-3xl text-primary">{banner.title}</h2>
                <p className="text-muted-foreground">{banner.subtitle}</p>
                <Button size="sm" variant="default">
                  {banner.buttonText}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
