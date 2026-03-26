import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, Newspaper, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from './ImageUpload';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url: string;
  is_published: boolean;
  created_at: string;
}

interface NewsData {
  items: NewsItem[];
}

export function AdminNews() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    image_url: '',
    is_published: true,
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'news')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const newsData = data.value as unknown as NewsData;
        setNewsItems(newsData.items || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNewsToSupabase = async (items: NewsItem[]) => {
    const newsData: NewsData = { items };

    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .eq('key', 'news')
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('site_settings')
        .update({
          value: JSON.parse(JSON.stringify(newsData)),
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'news');
      error = result.error;
    } else {
      const result = await supabase
        .from('site_settings')
        .insert([{
          key: 'news',
          value: JSON.parse(JSON.stringify(newsData)),
        }]);
      error = result.error;
    }

    if (error) throw error;
  };

  const resetForm = () => {
    setForm({ title: '', content: '', image_url: '', is_published: true });
    setEditingItem(null);
  };

  const openEditDialog = (item: NewsItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      content: item.content,
      image_url: item.image_url,
      is_published: item.is_published,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Por favor, introduza o título da novidade');
      return;
    }

    setIsSaving(true);
    try {
      let updatedItems: NewsItem[];

      if (editingItem) {
        updatedItems = newsItems.map(item =>
          item.id === editingItem.id
            ? { ...item, title: form.title, content: form.content, image_url: form.image_url, is_published: form.is_published }
            : item
        );
      } else {
        const newItem: NewsItem = {
          id: Date.now().toString() + '-' + Math.random().toString(36).substring(2),
          title: form.title,
          content: form.content,
          image_url: form.image_url,
          is_published: form.is_published,
          created_at: new Date().toISOString(),
        };
        updatedItems = [newItem, ...newsItems];
      }

      await saveNewsToSupabase(updatedItems);
      setNewsItems(updatedItems);
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingItem ? 'Novidade atualizada!' : 'Novidade criada!');
    } catch (error) {
      console.error('Error saving news:', error);
      toast.error('Erro ao guardar novidade');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      const updatedItems = newsItems.map(item =>
        item.id === id ? { ...item, is_published: !item.is_published } : item
      );
      await saveNewsToSupabase(updatedItems);
      setNewsItems(updatedItems);
      toast.success('Estado atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar estado');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja eliminar a novidade "${title}"?`)) return;

    try {
      const updatedItems = newsItems.filter(item => item.id !== id);
      await saveNewsToSupabase(updatedItems);
      setNewsItems(updatedItems);
      toast.success('Novidade eliminada!');
    } catch (error) {
      toast.error('Erro ao eliminar novidade');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Novidades</h1>
          <p className="text-muted-foreground">Gerencie as novidades e notícias da loja</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Novidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Novidade' : 'Nova Novidade'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Título da novidade"
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Escreva o conteúdo da novidade..."
                  rows={5}
                />
              </div>

              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                folder="news"
                label="Imagem da Novidade"
              />

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                />
                <Label>Publicar imediatamente</Label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingItem ? 'Guardar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* News Cards */}
      {newsItems.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="text-center py-12">
              <Newspaper className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma novidade encontrada.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie a primeira novidade para manter os clientes informados.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.image_url && (
                <div className="aspect-video overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                  <Badge
                    variant={item.is_published ? 'default' : 'secondary'}
                    className="cursor-pointer shrink-0"
                    onClick={() => handleTogglePublish(item.id)}
                  >
                    {item.is_published ? 'Publicado' : 'Rascunho'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString('pt-PT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {item.content || 'Sem conteúdo'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id, item.title)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
