import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types';
import { toast } from 'sonner';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (Product & { category: Category | null })[];
    },
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (Product & { category: Category | null })[];
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as (Product & { category: Category | null }) | null;
    },
    enabled: !!slug,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useProductsByCategory(categorySlug: string) {
  return useQuery({
    queryKey: ['products', 'category', categorySlug],
    queryFn: async () => {
      const { data: category, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();
      
      if (catError) throw catError;
      if (!category) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (Product & { category: Category | null })[];
    },
    enabled: !!categorySlug,
  });
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (Product & { category: Category | null })[];
    },
    enabled: query.length > 0,
  });
}

// Admin mutations
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar produto: ' + error.message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar produto: ' + error.message);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto eliminado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar produto: ' + error.message);
    },
  });
}

// Category mutations
export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: { name: string; slug: string; image_url: string | null }) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name: string; slug: string; image_url: string | null }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria eliminada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao eliminar categoria: ' + error.message);
    },
  });
}
