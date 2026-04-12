import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from '@/integrations/firebase/client';
import { Product, Category } from '@/types';
import { toast } from 'sonner';

type ProductDoc = Omit<Product, 'id' | 'category'>;

const categoriesCol = collection(firestore, 'categories');
const categoriesPtCol = collection(firestore, 'categorias');
const productsCol = collection(firestore, 'products');
const productsPtCol = collection(firestore, 'produtos');

async function addWithFallback(cols: ReturnType<typeof collection>[], payload: any) {
  let lastErr: unknown = null;
  for (const col of cols) {
    try {
      return await addDoc(col, payload);
    } catch (error) {
      lastErr = error;
    }
  }
  throw lastErr;
}

async function updateWithFallback(paths: string[], id: string, payload: any) {
  let lastErr: unknown = null;
  for (const p of paths) {
    try {
      await updateDoc(doc(firestore, p, id), payload);
      return;
    } catch (error) {
      lastErr = error;
    }
  }
  throw lastErr;
}

async function deleteWithFallback(paths: string[], id: string) {
  let lastErr: unknown = null;
  for (const p of paths) {
    try {
      await deleteDoc(doc(firestore, p, id));
      return;
    } catch (error) {
      lastErr = error;
    }
  }
  throw lastErr;
}

function withId<T extends object>(id: string, data: T) {
  return { id, ...data };
}

async function getCategoriesMap() {
  const [categoriesSnapshot, categoriesPtSnapshot] = await Promise.all([
    getDocs(categoriesCol),
    getDocs(categoriesPtCol),
  ]);

  const categories = [...categoriesSnapshot.docs, ...categoriesPtSnapshot.docs]
    .map((d) => withId(d.id, d.data() as Omit<Category, 'id'>))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  return {
    list: categories,
    byId: categories.reduce<Record<string, Category>>((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {}),
  };
}

async function getProductsMerged() {
  const [productsSnapshot, productsPtSnapshot] = await Promise.all([
    getDocs(productsCol),
    getDocs(productsPtCol),
  ]);

  return [...productsSnapshot.docs, ...productsPtSnapshot.docs]
    .map((d) => withId(d.id, d.data() as ProductDoc))
    .sort((a, b) => {
      const ad = String(a.created_at || '');
      const bd = String(b.created_at || '');
      return bd.localeCompare(ad);
    });
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { byId } = await getCategoriesMap();
      const items = await getProductsMerged();

      return items
        .filter((item) => item.is_active === true)
        .map((item) => {
        return {
          ...item,
          category: item.category_id ? byId[item.category_id] || null : null,
        };
      }) as (Product & { category: Category | null })[];
    },
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const { byId } = await getCategoriesMap();
      const items = await getProductsMerged();

      return items.map((item) => {
        return {
          ...item,
          category: item.category_id ? byId[item.category_id] || null : null,
        };
      }) as (Product & { category: Category | null })[];
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { byId } = await getCategoriesMap();
      const items = await getProductsMerged();
      const item = items.find((p) => p.slug === slug && p.is_active === true);
      if (!item) return null;

      return {
        ...item,
        category: item.category_id ? byId[item.category_id] || null : null,
      } as Product & { category: Category | null };
    },
    enabled: !!slug,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { list } = await getCategoriesMap();
      return list;
    },
  });
}

export function useProductsByCategory(categorySlug: string) {
  return useQuery({
    queryKey: ['products', 'category', categorySlug],
    queryFn: async () => {
      const { list, byId } = await getCategoriesMap();
      const category = list.find((c) => c.slug === categorySlug);
      if (!category) return [];

      const items = await getProductsMerged();

      return items
        .filter((item) => item.category_id === category.id && item.is_active === true)
        .map((item) => {
        return {
          ...item,
          category: item.category_id ? byId[item.category_id] || null : null,
        };
      }) as (Product & { category: Category | null })[];
    },
    enabled: !!categorySlug,
  });
}

export function useSearchProducts(searchQuery: string) {
  return useQuery({
    queryKey: ['products', 'search', searchQuery],
    queryFn: async () => {
      const search = searchQuery.trim().toLowerCase();
      if (!search) return [];

      const { byId } = await getCategoriesMap();
      const items = await getProductsMerged();

      return items
        .filter((p) => p.is_active === true)
        .filter((p) => {
          const name = (p.name || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          return name.includes(search) || desc.includes(search);
        })
        .map((item) => ({
          ...item,
          category: item.category_id ? byId[item.category_id] || null : null,
        })) as (Product & { category: Category | null })[];
    },
    enabled: searchQuery.length > 0,
  });
}

// Admin mutations
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      const now = new Date().toISOString();
      const docRef = await addWithFallback([productsPtCol, productsCol], {
        ...product,
        created_at: now,
        updated_at: now,
      });

      return { id: docRef.id, ...product, created_at: now, updated_at: now };
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
      await updateWithFallback(['produtos', 'products'], id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      return { id, ...updates };
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
      await deleteWithFallback(['produtos', 'products'], id);
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
      const now = new Date().toISOString();
      const docRef = await addWithFallback([categoriesPtCol, categoriesCol], {
        ...category,
        created_at: now,
      });
      return { id: docRef.id, ...category, created_at: now };
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
      await updateWithFallback(['categorias', 'categories'], id, updates);
      return { id, ...updates };
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
      await deleteWithFallback(['categorias', 'categories'], id);
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
