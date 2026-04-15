import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
import { Moon, Sun, Palette, Image as ImageIcon, Save, Instagram, Youtube, Facebook, MessageCircle } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function normalizeAssetUrl(rawUrl: string): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('./')) {
    return `/${trimmed.slice(2)}`;
  }

  if (trimmed.startsWith('../')) {
    return `/${trimmed.replace(/^\.\.\//, '')}`;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `/${trimmed}`;
}

export function AdminSettings() {
  const { theme, setTheme } = useTheme();
  const [backgroundImage, setBackgroundImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    instagramUrl: '',
    youtubeUrl: '',
    facebookUrl: '',
    whatsappUrl: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'site_background')
        .maybeSingle();
      if (data?.value && typeof data.value === 'object') {
        const value = data.value as Record<string, unknown>;
        const savedUrl = typeof value.image_url === 'string' ? value.image_url : '';
        setBackgroundImage(normalizeAssetUrl(savedUrl));
      }

      const { data: socialData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'social_links')
        .maybeSingle();

      if (socialData?.value && typeof socialData.value === 'object') {
        const value = socialData.value as Record<string, unknown>;
        setSocialLinks({
          instagramUrl: typeof value.instagram_url === 'string' ? value.instagram_url : '',
          youtubeUrl: typeof value.youtube_url === 'string' ? value.youtube_url : '',
          facebookUrl: typeof value.facebook_url === 'string' ? value.facebook_url : '',
          whatsappUrl: typeof value.whatsapp_url === 'string' ? value.whatsapp_url : '',
        });
      }
    };
    fetchSettings();
  }, []);

  const isValidSocialUrl = (url: string) => {
    if (!url.trim()) return true;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSaveBackground = async () => {
    setIsSaving(true);
    try {
      const normalized = normalizeAssetUrl(backgroundImage);
      const payload = {
        image_url: normalized,
        image_version: Date.now(),
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'site_background')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('site_settings')
          .update({ value: payload as any })
          .eq('key', 'site_background');
      } else {
        await supabase
          .from('site_settings')
          .insert({ key: 'site_background', value: payload as any });
      }

      setBackgroundImage(normalized);
      toast.success('Fundo do site guardado!');
    } catch {
      toast.error('Erro ao guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSocialLinks = async () => {
    const hasInvalidUrl = [socialLinks.instagramUrl, socialLinks.youtubeUrl, socialLinks.facebookUrl, socialLinks.whatsappUrl].some(
      (url) => !isValidSocialUrl(url)
    );

    if (hasInvalidUrl) {
      toast.error('Use URLs válidos (http:// ou https://) para as redes sociais.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        instagram_url: socialLinks.instagramUrl.trim(),
        youtube_url: socialLinks.youtubeUrl.trim(),
        facebook_url: socialLinks.facebookUrl.trim(),
        whatsapp_url: socialLinks.whatsappUrl.trim(),
      };

      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('key', 'social_links')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('site_settings')
          .update({ value: payload as any })
          .eq('key', 'social_links');
      } else {
        await supabase
          .from('site_settings')
          .insert({ key: 'social_links', value: payload as any });
      }

      toast.success('Redes sociais guardadas com sucesso!');
    } catch (error) {
      console.error('Error saving social links:', error);
      toast.error('Erro ao guardar redes sociais');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Definições</h1>
        <p className="text-muted-foreground">Configure as preferências da loja</p>
      </div>

      <div className="grid gap-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Aparência
            </CardTitle>
            <CardDescription>Personalize o tema visual do painel de administração</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                <div>
                  <Label className="text-base">Modo Escuro</Label>
                  <p className="text-sm text-muted-foreground">Alterne entre o tema claro e escuro</p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
              >
                <div className="bg-white rounded-lg p-3 space-y-2 shadow-sm">
                  <div className="h-2 w-16 bg-gray-200 rounded" />
                  <div className="h-2 w-24 bg-gray-100 rounded" />
                  <div className="h-6 w-full bg-rose-100 rounded" />
                </div>
                <p className="text-sm font-medium mt-2">Claro</p>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
              >
                <div className="bg-gray-900 rounded-lg p-3 space-y-2 shadow-sm">
                  <div className="h-2 w-16 bg-gray-700 rounded" />
                  <div className="h-2 w-24 bg-gray-800 rounded" />
                  <div className="h-6 w-full bg-rose-900/50 rounded" />
                </div>
                <p className="text-sm font-medium mt-2">Escuro</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Background Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Imagem de Fundo do Site
            </CardTitle>
            <CardDescription>Escolha uma imagem de fundo para o site (hero section)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              value={backgroundImage}
              onChange={setBackgroundImage}
              folder="site"
              label="Imagem de Fundo"
            />
            <Button onClick={handleSaveBackground} disabled={isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'A guardar...' : 'Guardar Fundo'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redes Sociais</CardTitle>
            <CardDescription>Atualize os links do Instagram, YouTube, Facebook e WhatsApp do site.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram URL
              </Label>
              <Input
                type="url"
                placeholder="https://instagram.com/seu-perfil"
                value={socialLinks.instagramUrl}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, instagramUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                YouTube URL
              </Label>
              <Input
                type="url"
                placeholder="https://youtube.com/@seu-canal"
                value={socialLinks.youtubeUrl}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook URL
              </Label>
              <Input
                type="url"
                placeholder="https://facebook.com/sua-pagina"
                value={socialLinks.facebookUrl}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, facebookUrl: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp URL
              </Label>
              <Input
                type="url"
                placeholder="https://wa.me/351900000000"
                value={socialLinks.whatsappUrl}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, whatsappUrl: e.target.value }))}
              />
            </div>

            <Button onClick={handleSaveSocialLinks} disabled={isSaving} className="w-full md:w-auto">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'A guardar...' : 'Guardar Redes Sociais'}
            </Button>
          </CardContent>
        </Card>

        {/* Store Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Loja</CardTitle>
            <CardDescription>Dados gerais da loja online</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">Nome da Loja</Label>
                <p className="font-medium">FIO & ALMA STUDIO</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Moeda</Label>
                <p className="font-medium">EUR (€)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Future features */}
        <Card>
          <CardHeader>
            <CardTitle>Funcionalidades em Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/50" />
                Exportação de contabilidade para Excel
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/50" />
                Emissão automática de faturas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/50" />
                Emails de confirmação de compra
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/50" />
                Configurações de envio e pagamento
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
