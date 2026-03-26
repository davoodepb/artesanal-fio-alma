-- =============================================
-- Seasonal Themes / Temas Sazonais
-- Sistema de temas para datas especiais
-- =============================================

-- Tabela de temas sazonais
CREATE TABLE IF NOT EXISTS public.seasonal_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_auto_activate BOOLEAN DEFAULT true,
  image_url TEXT,
  primary_color TEXT DEFAULT '#E86A6A',
  badge_label TEXT, -- ex: "Especial Natal", "Dia da Mãe"
  banner_title TEXT,
  banner_subtitle TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Validação: data de fim deve ser após data de início
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Índices para consultas frequentes
CREATE INDEX idx_seasonal_themes_active ON public.seasonal_themes (is_active);
CREATE INDEX idx_seasonal_themes_dates ON public.seasonal_themes (start_date, end_date);

-- Ativar Row Level Security
ALTER TABLE public.seasonal_themes ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler temas ativos
CREATE POLICY "Temas ativos são publicamente acessíveis"
  ON public.seasonal_themes
  FOR SELECT
  USING (true);

-- Política: Apenas admins podem criar/editar/eliminar
CREATE POLICY "Admins podem gerir temas"
  ON public.seasonal_themes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Função para ativar automaticamente temas com base na data
CREATE OR REPLACE FUNCTION public.auto_activate_seasonal_themes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Desativar temas cuja data já passou
  UPDATE public.seasonal_themes
  SET is_active = false, updated_at = now()
  WHERE is_auto_activate = true
    AND is_active = true
    AND (CURRENT_DATE < start_date OR CURRENT_DATE > end_date);

  -- Ativar temas cuja data está no período
  UPDATE public.seasonal_themes
  SET is_active = true, updated_at = now()
  WHERE is_auto_activate = true
    AND is_active = false
    AND CURRENT_DATE >= start_date
    AND CURRENT_DATE <= end_date;
END;
$$;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_seasonal_themes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_seasonal_themes
  BEFORE UPDATE ON public.seasonal_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seasonal_themes_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.seasonal_themes IS 'Temas sazonais para datas especiais (Natal, Dia da Mãe, etc.)';
COMMENT ON COLUMN public.seasonal_themes.badge_label IS 'Etiqueta para produtos destacados (ex: Especial Natal)';
COMMENT ON COLUMN public.seasonal_themes.is_auto_activate IS 'Se true, o tema é ativado/desativado automaticamente pelas datas';
COMMENT ON COLUMN public.seasonal_themes.primary_color IS 'Cor principal do tema (hex)';
