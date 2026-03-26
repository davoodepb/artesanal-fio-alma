import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, FolderOpen, Sparkles } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useProducts';
import { Category } from '@/types';
import { ImageUpload } from './ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const DEFAULT_CATEGORIES = [
  'Crochê',
  'Tricot',
  'Arranjos florais',
  'Bordados',
  'Cerâmica',
  'Pintura em tecido',
  'Bijuteria',
  'Diversos',
  'Costura criativa',
];

export function AdminCategories() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const hasSeeded = useRef(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    image_url: '',
  });
  const [isSlugManual, setIsSlugManual] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Auto-seed default categories if table is empty
  useEffect(() => {
    if (!isLoading && categories.length === 0 && !hasSeeded.current) {
      hasSeeded.current = true;
      seedDefaultCategories();
    }
  }, [isLoading, categories.length]);

  const seedDefaultCategories = async () => {
    setIsSeeding(true);
    try {
      const categoriesToInsert = DEFAULT_CATEGORIES.map(name => ({
        name,
        slug: generateSlug(name),
        image_url: null,
      }));

      const { error } = await supabase
        .from('categories')
        .insert(categoriesToInsert);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`${DEFAULT_CATEGORIES.length} categorias criadas com sucesso!`);
    } catch (error: any) {
      console.error('Error seeding categories:', error);
      // If it's a unique constraint error, categories may already exist
      if (error?.code === '23505') {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      } else {
        toast.error('Erro ao criar categorias padrão');
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const resetForm = () => {
    setCategoryForm({
      name: '',
      slug: '',
      image_url: '',
    });
    setEditingCategory(null);
    setIsSlugManual(false);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      image_url: category.image_url || '',
    });
    setIsSlugManual(true);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryForm.name) {
      toast.error('Por favor, introduza o nome da categoria');
      return;
    }

    const categoryData = {
      name: categoryForm.name,
      slug: categoryForm.slug || generateSlug(categoryForm.name),
      image_url: categoryForm.image_url || null,
    };

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...categoryData });
      } else {
        await createCategory.mutateAsync(categoryData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja eliminar a categoria "${name}"? Os produtos associados ficarão sem categoria.`)) {
      await deleteCategory.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground">Gerencie as categorias de produtos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCategoryForm({ 
                      ...categoryForm, 
                      name,
                      slug: isSlugManual ? categoryForm.slug : generateSlug(name)
                    });
                  }}
                  placeholder="Nome da categoria"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input
                  value={categoryForm.slug}
                  onChange={(e) => {
                    setIsSlugManual(true);
                    setCategoryForm({ ...categoryForm, slug: e.target.value });
                  }}
                  placeholder="url-da-categoria"
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para gerar automaticamente
                </p>
              </div>
              
              <ImageUpload
                value={categoryForm.image_url}
                onChange={(url) => setCategoryForm({ ...categoryForm, image_url: url })}
                folder="categories"
                label="Imagem da Categoria"
              />
              
              
              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                  {(createCategory.isPending || updateCategory.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCategory ? 'Guardar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {(isLoading || isSeeding) ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              {isSeeding && <p className="text-sm text-muted-foreground">A criar categorias padrão...</p>}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma categoria encontrada.
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Crie a primeira categoria para organizar os seus produtos.
              </p>
              <Button onClick={seedDefaultCategories} variant="outline" disabled={isSeeding}>
                <Sparkles className="h-4 w-4 mr-2" />
                Criar Categorias Padrão
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="w-10 h-10 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <span>{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      /{category.slug}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(category.created_at).toLocaleDateString('pt-PT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(category.id, category.name)}
                        disabled={deleteCategory.isPending}
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
