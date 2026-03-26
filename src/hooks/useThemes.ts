import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SeasonalTheme } from '@/types';
import { toast } from 'sonner';

const SETTINGS_KEY = 'seasonal_themes';

/**
 * Helper: Lê todos os temas do site_settings (armazenados como JSON array)
 */
async function fetchAllThemes(): Promise<SeasonalTheme[]> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  if (error) throw error;

  if (data?.value && Array.isArray(data.value)) {
    return data.value as unknown as SeasonalTheme[];
  }
  return [];
}

/**
 * Helper: Grava todos os temas no site_settings
 */
async function saveAllThemes(themes: SeasonalTheme[]) {
  const { data: existing } = await supabase
    .from('site_settings')
    .select('id')
    .eq('key', SETTINGS_KEY)
    .maybeSingle();

  const payload = JSON.parse(JSON.stringify(themes));

  if (existing) {
    const { error } = await supabase
      .from('site_settings')
      .update({ value: payload, updated_at: new Date().toISOString() })
      .eq('key', SETTINGS_KEY);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('site_settings')
      .insert([{ key: SETTINGS_KEY, value: payload }]);
    if (error) throw error;
  }
}

/**
 * Gera um UUID simples no browser
 */
function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ─── Hooks ───────────────────────────────────────────────────

/**
 * Hook para obter todos os temas sazonais (admin)
 */
export function useSeasonalThemes() {
  return useQuery({
    queryKey: ['seasonal-themes'],
    queryFn: fetchAllThemes,
  });
}

/**
 * Hook para obter o tema ativo atual (frontend)
 */
export function useActiveTheme() {
  return useQuery({
    queryKey: ['active-theme'],
    queryFn: async () => {
      const themes = await fetchAllThemes();
      const today = new Date().toISOString().split('T')[0];

      // 1. Tema manualmente ativo
      const manual = themes.find((t) => t.is_active);
      if (manual) return manual;

      // 2. Tema com auto-ativação dentro do período
      const auto = themes.find(
        (t) => t.is_auto_activate && t.start_date <= today && t.end_date >= today,
      );
      return auto ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para criar um tema sazonal
 */
export function useCreateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (theme: Omit<SeasonalTheme, 'id' | 'created_at' | 'updated_at'>) => {
      const themes = await fetchAllThemes();
      const now = new Date().toISOString();

      const newTheme: SeasonalTheme = {
        ...theme,
        id: generateId(),
        created_at: now,
        updated_at: now,
      };

      // Se o novo tema é ativo, desativar os outros
      if (newTheme.is_active) {
        themes.forEach((t) => (t.is_active = false));
      }

      themes.unshift(newTheme);
      await saveAllThemes(themes);
      return newTheme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-themes'] });
      queryClient.invalidateQueries({ queryKey: ['active-theme'] });
      toast.success('Tema criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating theme:', error);
      toast.error('Erro ao criar tema');
    },
  });
}

/**
 * Hook para atualizar um tema sazonal
 */
export function useUpdateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: Partial<SeasonalTheme> & { id: string }) => {
      const themes = await fetchAllThemes();
      const idx = themes.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error('Tema não encontrado');

      // Se estamos a ativar, desativar os outros
      if (update.is_active) {
        themes.forEach((t, i) => {
          if (i !== idx) t.is_active = false;
        });
      }

      themes[idx] = { ...themes[idx], ...update, updated_at: new Date().toISOString() };
      await saveAllThemes(themes);
      return themes[idx];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-themes'] });
      queryClient.invalidateQueries({ queryKey: ['active-theme'] });
      toast.success('Tema atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating theme:', error);
      toast.error('Erro ao atualizar tema');
    },
  });
}

/**
 * Hook para eliminar um tema sazonal
 */
export function useDeleteTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const themes = await fetchAllThemes();
      const filtered = themes.filter((t) => t.id !== id);
      await saveAllThemes(filtered);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-themes'] });
      queryClient.invalidateQueries({ queryKey: ['active-theme'] });
      toast.success('Tema eliminado com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting theme:', error);
      toast.error('Erro ao eliminar tema');
    },
  });
}

/**
 * Hook para ativar/desativar um tema (toggle)
 * Quando um tema é ativado, todos os outros são desativados
 */
export function useToggleTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const themes = await fetchAllThemes();

      // Se estamos a ativar, desativar todos os outros
      if (is_active) {
        themes.forEach((t) => (t.is_active = false));
      }

      const idx = themes.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error('Tema não encontrado');

      themes[idx].is_active = is_active;
      themes[idx].updated_at = new Date().toISOString();
      await saveAllThemes(themes);
      return themes[idx];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['seasonal-themes'] });
      queryClient.invalidateQueries({ queryKey: ['active-theme'] });
      toast.success(variables.is_active ? 'Tema ativado!' : 'Tema desativado!');
    },
    onError: (error) => {
      console.error('Error toggling theme:', error);
      toast.error('Erro ao alterar estado do tema');
    },
  });
}
