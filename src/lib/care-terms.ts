export type CareCategory =
  | 'psychology'
  | 'dentistry'
  | 'physiotherapy'
  | 'nutrition'
  | 'dermatology'
  | 'psychiatry'
  | 'general_practice'
  | 'pediatrics'
  | 'orthopedics'
  | 'speech_therapy'
  | 'occupational_therapy'
  | 'veterinary'
  | 'veterinary_exotic'
  | 'veterinary_large'
  | 'veterinary_dental'
  | 'other_health';

export const isVetCategory = (cat?: string) => {
  if (!cat) return false;
  return cat.startsWith('veterinary');
};

// ─────────────────────────────────────────────────────────────────────────────
// Termos contextuais (rótulos dinâmicos por categoria)
// ─────────────────────────────────────────────────────────────────────────────

export interface CareTerms {
  patient: string;
  professional: string;
  appointment: string;
  bookCTA: string;
  booker: string;
  // Rótulos para os módulos de registro clínico
  healthRecord: string;       // ex: "Prontuário", "Evolução de Sessão"
  prescription: string;       // ex: "Receita Médica", "Plano Alimentar", "Protocolo de Exercícios"
  vaccination: string;        // ex: "Carteira de Vacinação", "Caderneta de Vacinas"
  labResult: string;          // ex: "Exame / Laudo", "Resultado de Exame"
}

// ─────────────────────────────────────────────────────────────────────────────
// Capacidades por categoria — controla quais módulos ficam visíveis na UI
// ─────────────────────────────────────────────────────────────────────────────

export interface CareCapabilities {
  /** Prontuário / notas clínicas por atendimento — universal em saúde */
  healthRecords: boolean;
  /** Histórico cronológico do paciente na página de perfil */
  patientHistory: boolean;
  /** Vacinas / imunizações (veterinária, pediatria, clínica geral) */
  vaccination: boolean;
  /** Receita médica / prescrições / planos (médicos e vet, não terapeutas) */
  prescriptions: boolean;
  /** Exames laboratoriais e laudos (imagem, PDF) */
  labResults: boolean;
  /** Módulo de perfil de pet (só veterinária — paciente ≠ usuário) */
  petProfiles: boolean;
}

export interface CareCategoryConfig {
  terms: CareTerms;
  capabilities: CareCapabilities;
}

const ALL_CLINICAL: CareCapabilities = {
  healthRecords: true, patientHistory: true,
  vaccination: true, prescriptions: true, labResults: true, petProfiles: false,
};

const THERAPY: CareCapabilities = {
  healthRecords: true, patientHistory: true,
  vaccination: false, prescriptions: false, labResults: false, petProfiles: false,
};

const THERAPY_WITH_PLAN: CareCapabilities = {
  ...THERAPY,
  prescriptions: true, // plano alimentar / protocolo de exercícios
};

const VET: CareCapabilities = {
  healthRecords: true, patientHistory: true,
  vaccination: true, prescriptions: true, labResults: true, petProfiles: true,
};

export const careCategoryConfig: Record<CareCategory | 'default', CareCategoryConfig> = {
  psychology: {
    capabilities: THERAPY,
    terms: {
      patient: 'Paciente', professional: 'Psicólogo(a)',
      appointment: 'Sessão', bookCTA: 'Agendar Sessão', booker: 'Paciente',
      healthRecord: 'Evolução de Sessão', prescription: 'Plano Terapêutico',
      vaccination: 'Imunização', labResult: 'Laudo / Avaliação',
    },
  },
  dentistry: {
    capabilities: ALL_CLINICAL,
    terms: {
      patient: 'Paciente', professional: 'Dentista',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Paciente',
      healthRecord: 'Evolução do Tratamento', prescription: 'Receita / Prescrição',
      vaccination: 'Imunização', labResult: 'Exame / Imagem',
    },
  },
  physiotherapy: {
    capabilities: THERAPY_WITH_PLAN,
    terms: {
      patient: 'Paciente', professional: 'Fisioterapeuta',
      appointment: 'Sessão', bookCTA: 'Agendar Sessão', booker: 'Paciente',
      healthRecord: 'Evolução Terapêutica', prescription: 'Protocolo de Exercícios',
      vaccination: 'Imunização', labResult: 'Laudo / Exame',
    },
  },
  nutrition: {
    capabilities: THERAPY_WITH_PLAN,
    terms: {
      patient: 'Paciente', professional: 'Nutricionista',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Paciente',
      healthRecord: 'Acompanhamento Nutricional', prescription: 'Plano Alimentar',
      vaccination: 'Imunização', labResult: 'Resultado de Exame',
    },
  },
  dermatology: {
    capabilities: ALL_CLINICAL,
    terms: {
      patient: 'Paciente', professional: 'Dermatologista',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Paciente',
      healthRecord: 'Prontuário Dermatológico', prescription: 'Receita Médica',
      vaccination: 'Imunização', labResult: 'Exame / Biópsia',
    },
  },
  psychiatry: {
    capabilities: { ...ALL_CLINICAL, vaccination: false },
    terms: {
      patient: 'Paciente', professional: 'Psiquiatra',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Paciente',
      healthRecord: 'Evolução Psiquiátrica', prescription: 'Receita / Medicação',
      vaccination: 'Imunização', labResult: 'Resultado de Exame',
    },
  },
  general_practice: {
    capabilities: ALL_CLINICAL,
    terms: {
      patient: 'Paciente', professional: 'Clínico Geral',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Paciente',
      healthRecord: 'Prontuário Médico', prescription: 'Receita Médica',
      vaccination: 'Registro de Vacinas', labResult: 'Resultado de Exame',
    },
  },
  pediatrics: {
    capabilities: ALL_CLINICAL,
    terms: {
      patient: 'Criança', professional: 'Pediatra',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Responsável',
      healthRecord: 'Prontuário da Criança', prescription: 'Receita / Medicação',
      vaccination: 'Caderneta de Vacinas', labResult: 'Resultado de Exame',
    },
  },
  orthopedics: {
    capabilities: ALL_CLINICAL,
    terms: {
      patient: 'Paciente', professional: 'Ortopedista',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Paciente',
      healthRecord: 'Evolução do Tratamento', prescription: 'Receita / Prescrição',
      vaccination: 'Imunização', labResult: 'Exame / Imagem (RX, RM)',
    },
  },
  speech_therapy: {
    capabilities: THERAPY_WITH_PLAN,
    terms: {
      patient: 'Paciente', professional: 'Fonoaudiólogo(a)',
      appointment: 'Sessão', bookCTA: 'Agendar Sessão', booker: 'Paciente',
      healthRecord: 'Evolução da Sessão', prescription: 'Plano Terapêutico',
      vaccination: 'Imunização', labResult: 'Laudo / Avaliação',
    },
  },
  occupational_therapy: {
    capabilities: THERAPY_WITH_PLAN,
    terms: {
      patient: 'Paciente', professional: 'Terapeuta Ocupacional',
      appointment: 'Sessão', bookCTA: 'Agendar Sessão', booker: 'Paciente',
      healthRecord: 'Evolução da Sessão', prescription: 'Plano Terapêutico',
      vaccination: 'Imunização', labResult: 'Laudo / Avaliação',
    },
  },
  veterinary: {
    capabilities: VET,
    terms: {
      patient: 'Pet', professional: 'Veterinário(a)',
      appointment: 'Consulta/Procedimento', bookCTA: 'Agendar para meu Pet', booker: 'Tutor',
      healthRecord: 'Prontuário do Pet', prescription: 'Receita Veterinária',
      vaccination: 'Carteira de Vacinação', labResult: 'Exame / Laudo',
    },
  },
  veterinary_exotic: {
    capabilities: VET,
    terms: {
      patient: 'Pet Silvestre', professional: 'Veterinário(a)',
      appointment: 'Consulta', bookCTA: 'Agendar para meu Pet', booker: 'Tutor',
      healthRecord: 'Prontuário do Animal', prescription: 'Receita Veterinária',
      vaccination: 'Carteira de Vacinação', labResult: 'Exame / Laudo',
    },
  },
  veterinary_large: {
    capabilities: VET,
    terms: {
      patient: 'Animal', professional: 'Veterinário(a)',
      appointment: 'Atendimento', bookCTA: 'Agendar Atendimento', booker: 'Proprietário',
      healthRecord: 'Prontuário do Animal', prescription: 'Receita Veterinária',
      vaccination: 'Registro de Vacinação', labResult: 'Exame / Laudo',
    },
  },
  veterinary_dental: {
    capabilities: VET,
    terms: {
      patient: 'Pet', professional: 'Dentista Veterinário',
      appointment: 'Tratamento', bookCTA: 'Agendar Tratamento', booker: 'Tutor',
      healthRecord: 'Evolução do Tratamento', prescription: 'Receita Veterinária',
      vaccination: 'Carteira de Vacinação', labResult: 'Exame / Imagem',
    },
  },
  other_health: {
    capabilities: { ...THERAPY, healthRecords: true, patientHistory: true },
    terms: {
      patient: 'Paciente', professional: 'Especialista',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Paciente',
      healthRecord: 'Prontuário', prescription: 'Prescrição',
      vaccination: 'Imunização', labResult: 'Exame / Laudo',
    },
  },
  default: {
    capabilities: THERAPY,
    terms: {
      patient: 'Paciente', professional: 'Especialista',
      appointment: 'Consulta', bookCTA: 'Agendar Consulta', booker: 'Paciente',
      healthRecord: 'Prontuário', prescription: 'Prescrição',
      vaccination: 'Imunização', labResult: 'Exame / Laudo',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de acesso rápido (backward-compatible)
// ─────────────────────────────────────────────────────────────────────────────

/** Retorna os termos contextuais da categoria */
export const getCareTerms = (cat?: string): CareTerms => {
  const config = careCategoryConfig[cat as CareCategory];
  return config?.terms ?? careCategoryConfig.default.terms;
};

/** Retorna as capacidades (módulos habilitados) da categoria */
export const getCareCapabilities = (cat?: string): CareCapabilities => {
  const config = careCategoryConfig[cat as CareCategory];
  return config?.capabilities ?? careCategoryConfig.default.capabilities;
};

// Mantém compatibilidade com código legado que importa careTerms diretamente
export const careTerms: Record<CareCategory | 'default', CareTerms> = Object.fromEntries(
  Object.entries(careCategoryConfig).map(([k, v]) => [k, v.terms])
) as Record<CareCategory | 'default', CareTerms>;

