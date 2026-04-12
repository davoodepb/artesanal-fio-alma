export interface UploadDiagnostic {
  summary: string;
  code: string;
  technical: string;
  hint: string;
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Erro desconhecido';
  }
}

function toCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim()) return code;
  }
  return 'unknown';
}

export function parseFirebaseUploadError(error: unknown): UploadDiagnostic {
  const code = toCode(error);
  const technical = toMessage(error);

  const byCode: Record<string, { summary: string; hint: string }> = {
    'storage/unauthorized': {
      summary: 'Sem permissao para upload no Firebase Storage.',
      hint: 'Verifique as storage.rules e se o utilizador admin esta autenticado.',
    },
    'storage/bucket-not-found': {
      summary: 'Bucket do Firebase Storage nao encontrado.',
      hint: 'Confirme VITE_FIREBASE_STORAGE_BUCKET e a configuracao do projeto Firebase.',
    },
    'storage/project-not-found': {
      summary: 'Projeto Firebase nao encontrado.',
      hint: 'Confirme credenciais do Firebase e projeto ativo.',
    },
    'storage/quota-exceeded': {
      summary: 'Limite de quota do Storage excedido.',
      hint: 'Revise plano/limites do Firebase e consumo do bucket.',
    },
    'storage/retry-limit-exceeded': {
      summary: 'Tentativas de upload excederam o limite.',
      hint: 'Ligacao instavel ou timeout; tente imagem menor ou rede mais estavel.',
    },
    'storage/canceled': {
      summary: 'Upload cancelado por timeout de seguranca.',
      hint: 'Rede lenta ou bloqueio de permissao. Tente novamente e confirme regras.',
    },
    'storage/invalid-checksum': {
      summary: 'Falha de integridade no ficheiro enviado.',
      hint: 'Tente enviar novamente a imagem (possivel corrupcao ou rede instavel).',
    },
    'storage/unknown': {
      summary: 'Erro desconhecido no Firebase Storage.',
      hint: 'Consulte o detalhe tecnico e logs para diagnostico.',
    },
  };

  const networkIssue = technical.toLowerCase().includes('network') || technical.toLowerCase().includes('failed to fetch');
  if (networkIssue) {
    return {
      summary: 'Falha de rede durante o upload.',
      code,
      technical,
      hint: 'Verifique internet, VPN/proxy e bloqueios CORS/firewall.',
    };
  }

  const mapped = byCode[code] || {
    summary: 'Erro ao carregar imagem no Firebase Storage.',
    hint: 'Use o detalhe tecnico para validar regras, bucket e autenticacao.',
  };

  return {
    summary: mapped.summary,
    code,
    technical,
    hint: mapped.hint,
  };
}
