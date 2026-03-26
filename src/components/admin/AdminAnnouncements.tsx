import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  is_published: boolean;
  created_at: string;
}

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    is_published: true,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data || []) as Announcement[]);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', body: '', is_published: true });
    setEditingAnnouncement(null);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title,
      body: announcement.body || '',
      is_published: announcement.is_published,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Por favor, introduza o título do anúncio');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: form.title,
            body: form.body || null,
            is_published: form.is_published,
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;

        setAnnouncements(prev =>
          prev.map(a => a.id === editingAnnouncement.id
            ? { ...a, title: form.title, body: form.body || null, is_published: form.is_published }
            : a
          )
        );
        toast.success('Anúncio atualizado!');
      } else {
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            title: form.title,
            body: form.body || null,
            is_published: form.is_published,
          })
          .select()
          .single();

        if (error) throw error;
        setAnnouncements(prev => [data as Announcement, ...prev]);
        toast.success('Anúncio criado!');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Erro ao guardar anúncio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_published: !currentState })
        .eq('id', id);

      if (error) throw error;

      setAnnouncements(prev =>
        prev.map(a => a.id === id ? { ...a, is_published: !currentState } : a)
      );
      toast.success(!currentState ? 'Anúncio publicado!' : 'Anúncio ocultado');
    } catch (error) {
      toast.error('Erro ao atualizar estado');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja eliminar o anúncio "${title}"?`)) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Anúncio eliminado!');
    } catch (error) {
      toast.error('Erro ao eliminar anúncio');
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
          <h1 className="text-2xl font-serif font-bold text-foreground">Anúncios</h1>
          <p className="text-muted-foreground">Crie e gerencie anúncios para os clientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? 'Editar Anúncio' : 'Novo Anúncio'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Título do anúncio"
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Escreva o conteúdo do anúncio..."
                  rows={5}
                />
              </div>

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
                  {editingAnnouncement ? 'Guardar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum anúncio encontrado.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie o primeiro anúncio para informar os seus clientes.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium">{announcement.title}</TableCell>
                    <TableCell className="max-w-[250px]">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.body || '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={announcement.is_published ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleTogglePublish(announcement.id, announcement.is_published)}
                      >
                        {announcement.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(announcement.created_at).toLocaleDateString('pt-PT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(announcement.id, announcement.title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
