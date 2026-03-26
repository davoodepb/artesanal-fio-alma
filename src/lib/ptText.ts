const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const CATEGORY_NAME_MAP: Record<string, string> = {
  'arranjos floraos': 'Arranjos florais',
  'arranjos florais': 'Arranjos florais',
  bijuteria: 'Bijuteria',
  bordados: 'Bordados',
  ceramica: 'Cerâmica',
  'costura criativa': 'Costura criativa',
  croche: 'Croché',
  tricot: 'Tricot',
  diversos: 'Diversos',
  'pinturas em tecido': 'Pinturas em tecido',
};

export const normalizeCategoryDisplayName = (name: string) => {
  const key = normalizeKey(name);
  return CATEGORY_NAME_MAP[key] || name;
};
