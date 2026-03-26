import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, Calendar, Eye, Power, Palette } from 'lucide-react';
import { useSeasonalThemes, useCreateTheme, useUpdateTheme, useDeleteTheme, useToggleTheme } from '@/hooks/useThemes';
import { ImageUpload } from './ImageUpload';
import { SeasonalTheme } from '@/types';

type ThemeFormData = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_auto_activate: boolean;
  image_url: string;
  primary_color: string;
  badge_label: string;
  banner_title: string;
  banner_subtitle: string;
};

const defaultFormData: ThemeFormData = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  is_active: false,
  is_auto_activate: true,
  image_url: '',
  primary_color: '#E86A6A',
  badge_label: '',
  banner_title: '',
  banner_subtitle: '',
};

// Temas pré-definidos para facilitar a criação rápida
const themePresets = [
  { name: 'Natal', badge: 'Especial Natal 🎄', color: '#C41E3A', banner: 'Natal com Alma Artesanal' },
  { name: 'Dia dos Namorados', badge: 'Dia dos Namorados ❤️', color: '#E91E63', banner: 'Amor Feito à Mão' },
  { name: 'Dia da Mãe', badge: 'Dia da Mãe 💐', color: '#FF69B4', banner: 'Para a Melhor Mãe do Mundo' },
  { name: 'Dia do Pai', badge: 'Dia do Pai 👔', color: '#1976D2', banner: 'Um Presente com Alma' },
  { name: 'Páscoa', badge: 'Páscoa 🐣', color: '#FFA726', banner: 'Páscoa Artesanal' },
  { name: 'Black Friday', badge: 'Black Friday 🖤', color: '#212121', banner: 'Artesanato com Desconto' },
];

/**
 * AdminThemes — Componente de gestão de temas sazonais
 * Permite criar, editar, ativar/desativar e eliminar temas
 */
export function AdminThemes() {
  const { data: themes = [], isLoading } = useSeasonalThemes();
  const createTheme = useCreateTheme();
  const updateTheme = useUpdateTheme();
  const deleteTheme = useDeleteTheme();
  const toggleTheme = useToggleTheme();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<SeasonalTheme | null>(null);
  const [form, setForm] = useState<ThemeFormData>(defaultFormData);
  const [filter, setFilter] = useState<string>('all');
  const [previewTheme, setPreviewTheme] = useState<SeasonalTheme | null>(null);

  const resetForm = () => {
    setForm(defaultFormData);
    setEditingTheme(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (theme: SeasonalTheme) => {
    setEditingTheme(theme);
    setForm({
      name: theme.name,
      description: theme.description || '',
      start_date: theme.start_date,
      end_date: theme.end_date,
      is_active: theme.is_active,
      is_auto_activate: theme.is_auto_activate,
      image_url: theme.image_url || '',
      primary_color: theme.primary_color || '#E86A6A',
      badge_label: theme.badge_label || '',
      banner_title: theme.banner_title || '',
      banner_subtitle: theme.banner_subtitle || '',
    });
    setIsDialogOpen(true);
  };

  const applyPreset = (preset: typeof themePresets[0]) => {
    setForm(prev => ({
      ...prev,
      name: preset.name,
      badge_label: preset.badge,
      primary_color: preset.color,
      banner_title: preset.banner,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.start_date || !form.end_date) {
      toast.error('Preencha o nome, data de início e data de fim');
      return;
    }

    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error('A data de fim deve ser após a data de início');
      return;
    }

    const themeData = {
      name: form.name,
      description: form.description || null,
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: form.is_active,
      is_auto_activate: form.is_auto_activate,
      image_url: form.image_url || null,
      primary_color: form.primary_color || null,
      badge_label: form.badge_label || null,
      banner_title: form.banner_title || null,
      banner_subtitle: form.banner_subtitle || null,
    };

    try {
      if (editingTheme) {
        await updateTheme.mutateAsync({ id: editingTheme.id, ...themeData });
      } else {
        await createTheme.mutateAsync(themeData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch {
      // errors handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja eliminar este tema?')) {
      await deleteTheme.mutateAsync(id);
    }
  };

  const handleToggle = async (theme: SeasonalTheme) => {
    await toggleTheme.mutateAsync({ id: theme.id, is_active: !theme.is_active });
  };

  // Filtrar temas
  const today = new Date().toISOString().split('T')[0];
  const filteredThemes = themes.filter(theme => {
    if (filter === 'active') return theme.is_active;
    if (filter === 'inactive') return !theme.is_active;
    if (filter === 'upcoming') return theme.start_date > today;
    if (filter === 'past') return theme.end_date < today;
    return true;
  });

  // Determinar estado visual de um tema
  const getThemeStatus = (theme: SeasonalTheme) => {
    if (theme.is_active) return { label: 'Ativo', variant: 'default' as const };
    if (theme.end_date < today) return { label: 'Terminado', variant: 'secondary' as const };
    if (theme.start_date > today) return { label: 'Agendado', variant: 'outline' as const };
    return { label: 'Inativo', variant: 'secondary' as const };
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Temas Sazonais</h1>
          <p className="text-muted-foreground">Gerir temas para datas e ocasiões especiais</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTheme ? 'Editar Tema' : 'Novo Tema Sazonal'}
              </DialogTitle>
            </DialogHeader>

            {/* Presets rápidos */}
            {!editingTheme && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Modelos rápidos:</Label>
                <div className="flex flex-wrap gap-2">
                  {themePresets.map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset)}
                      className="text-xs"
                    >
                      {preset.badge}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome e Etiqueta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Tema *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Natal 2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Etiqueta (Badge)</Label>
                  <Input
                    value={form.badge_label}
                    onChange={(e) => setForm({ ...form, badge_label: e.target.value })}
                    placeholder="Ex: Especial Natal 🎄"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição do tema e campanha..."
                  rows={2}
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Fim *</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Banner Title/Subtitle */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título do Banner</Label>
                  <Input
                    value={form.banner_title}
                    onChange={(e) => setForm({ ...form, banner_title: e.target.value })}
                    placeholder="Título para o banner promocional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo do Banner</Label>
                  <Input
                    value={form.banner_subtitle}
                    onChange={(e) => setForm({ ...form, banner_subtitle: e.target.value })}
                    placeholder="Subtítulo ou chamada para ação"
                  />
                </div>
              </div>

              {/* Cor e Imagem */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor Principal
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      placeholder="#E86A6A"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <ImageUpload
                    value={form.image_url}
                    onChange={(url) => setForm({ ...form, image_url: url })}
                    folder="themes"
                    label="Imagem de Destaque"
                  />
                </div>
              </div>

              {/* Switches */}
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.is_auto_activate}
                    onCheckedChange={(checked) => setForm({ ...form, is_auto_activate: checked })}
                  />
                  <Label>Ativação automática por datas</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                  <Label>Tema ativo agora</Label>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTheme.isPending || updateTheme.isPending}
                >
                  {(createTheme.isPending || updateTheme.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingTheme ? 'Guardar' : 'Criar Tema'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Temas</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="upcoming">Agendados</SelectItem>
            <SelectItem value="past">Terminados</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredThemes.length} tema(s)
        </span>
      </div>

      {/* Lista de Temas */}
      <Card>
        <CardContent className="p-0">
          {filteredThemes.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum tema encontrado.</p>
              <p className="text-sm text-muted-foreground mt-1">Crie o seu primeiro tema sazonal!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tema</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredThemes.map((theme) => {
                  const status = getThemeStatus(theme);
                  return (
                    <TableRow key={theme.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {theme.image_url ? (
                            <img
                              src={theme.image_url}
                              alt={theme.name}
                              className="w-10 h-10 rounded-lg object-cover border"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: theme.primary_color || '#E86A6A' }}
                            >
                              {theme.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{theme.name}</p>
                            {theme.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{theme.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(theme.start_date).toLocaleDateString('pt-PT')} — {new Date(theme.end_date).toLocaleDateString('pt-PT')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {theme.badge_label && (
                          <Badge variant="outline" className="text-xs">
                            {theme.badge_label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={theme.is_auto_activate ? 'default' : 'secondary'} className="text-xs">
                          {theme.is_auto_activate ? 'Auto' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Pré-visualizar"
                            onClick={() => setPreviewTheme(theme)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={theme.is_active ? 'Desativar' : 'Ativar'}
                            onClick={() => handleToggle(theme)}
                          >
                            <Power className={`h-4 w-4 ${theme.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(theme)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(theme.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pré-visualização do Tema */}
      <Dialog open={!!previewTheme} onOpenChange={() => setPreviewTheme(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pré-visualização: {previewTheme?.name}</DialogTitle>
          </DialogHeader>
          {previewTheme && (
            <div className="space-y-4">
              {/* Banner Preview */}
              <div
                className="rounded-xl overflow-hidden p-8 text-center text-white relative"
                style={{ backgroundColor: previewTheme.primary_color || '#E86A6A' }}
              >
                {previewTheme.image_url && (
                  <img
                    src={previewTheme.image_url}
                    alt={previewTheme.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                )}
                <div className="relative z-10">
                  {previewTheme.badge_label && (
                    <span className="inline-block bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm mb-3">
                      {previewTheme.badge_label}
                    </span>
                  )}
                  <h3 className="text-2xl font-serif font-bold">
                    {previewTheme.banner_title || previewTheme.name}
                  </h3>
                  {previewTheme.banner_subtitle && (
                    <p className="mt-2 text-white/90">{previewTheme.banner_subtitle}</p>
                  )}
                  <Button className="mt-4 bg-white/20 hover:bg-white/30 text-white border border-white/30">
                    Ver Coleção
                  </Button>
                </div>
              </div>

              {/* Detalhes */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Período:</span>
                  <p className="font-medium">
                    {new Date(previewTheme.start_date).toLocaleDateString('pt-PT')} — {new Date(previewTheme.end_date).toLocaleDateString('pt-PT')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Estado:</span>
                  <p className="font-medium">
                    {previewTheme.is_active ? '✅ Ativo' : '⏸️ Inativo'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ativação:</span>
                  <p className="font-medium">
                    {previewTheme.is_auto_activate ? '🤖 Automática' : '👤 Manual'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cor:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full border"
                      style={{ backgroundColor: previewTheme.primary_color || '#E86A6A' }}
                    />
                    <span className="font-mono text-xs">{previewTheme.primary_color}</span>
                  </div>
                </div>
              </div>

              {previewTheme.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Descrição:</span>
                  <p className="mt-1">{previewTheme.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Info box */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Como funcionam os Temas Sazonais?
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Crie temas para datas especiais (Natal, Dia da Mãe, Black Friday, etc.)</li>
            <li>Os temas com <strong>ativação automática</strong> ligam/desligam conforme as datas</li>
            <li>Apenas <strong>um tema pode estar ativo</strong> por vez (ao ativar um, os outros são desativados)</li>
            <li>O tema ativo mostra um <strong>banner especial na homepage</strong> e etiquetas nos produtos</li>
            <li>Pode <strong>pré-visualizar</strong> qualquer tema antes de o ativar</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
