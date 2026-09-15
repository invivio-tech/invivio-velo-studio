export type PlanTier = 'lp' | 'solo' | 'multi' | 'pro' | 'enterprise';

export interface PlanLimits {
  // Tier
  plan: PlanTier;

  // Limites numéricos
  team: {
    maxProfessionals: number;
  };

  // Módulos de Agenda e Operações
  scheduling: { enabled: boolean };
  followups: { enabled: boolean };
  telehealth: { enabled: boolean };
  healthPlans: { enabled: boolean };
  rooms: { enabled: boolean };

  // Módulos Clínicos (Fase 3)
  clinical: {
    healthRecords: boolean;
    vaccination: boolean;
    prescriptions: boolean;
    labResults: boolean;
  };

  // Módulos de Negócio e Integrações
  financial: { enabled: boolean };
  marketing: { enabled: boolean; geminiApiKey?: string };

  // Add-on WhatsApp
  whatsappBot: {
    enabled: boolean;
    wabaId?: string;
    phoneNumberId?: string;
    systemToken?: string;
    webhookVerifyToken?: string;
  };
}

export const PLAN_PRESETS: Record<PlanTier, PlanLimits> = {
  lp: {
    plan: 'lp',
    team: { maxProfessionals: 3 }, // Permite cadastrar profissionais para exibi-los na LP
    scheduling: { enabled: false },
    followups: { enabled: false },
    telehealth: { enabled: false },
    healthPlans: { enabled: false },
    rooms: { enabled: false },
    clinical: { healthRecords: false, vaccination: false, prescriptions: false, labResults: false },
    financial: { enabled: false },
    marketing: { enabled: false },
    whatsappBot: { enabled: false },
  },

  solo: {
    plan: 'solo',
    team: { maxProfessionals: 1 },
    scheduling: { enabled: true },
    followups: { enabled: true },
    telehealth: { enabled: false },
    healthPlans: { enabled: false },
    rooms: { enabled: false },
    clinical: { healthRecords: false, vaccination: false, prescriptions: false, labResults: false },
    financial: { enabled: false },
    marketing: { enabled: false },
    whatsappBot: { enabled: false },
  },

  multi: {
    plan: 'multi',
    team: { maxProfessionals: 3 },
    scheduling: { enabled: true },
    followups: { enabled: true },
    telehealth: { enabled: false },
    healthPlans: { enabled: true },
    rooms: { enabled: true },
    clinical: { healthRecords: false, vaccination: false, prescriptions: false, labResults: false },
    financial: { enabled: false },
    marketing: { enabled: false },
    whatsappBot: { enabled: false },
  },

  pro: {
    plan: 'pro',
    team: { maxProfessionals: 6 },
    scheduling: { enabled: true },
    followups: { enabled: true },
    telehealth: { enabled: true },
    healthPlans: { enabled: true },
    rooms: { enabled: true },
    clinical: { healthRecords: true, vaccination: true, prescriptions: true, labResults: true },
    financial: { enabled: true },
    marketing: { enabled: false },
    whatsappBot: { enabled: false },
  },

  enterprise: {
    plan: 'enterprise',
    team: { maxProfessionals: 999 },
    scheduling: { enabled: true },
    followups: { enabled: true },
    telehealth: { enabled: true },
    healthPlans: { enabled: true },
    rooms: { enabled: true },
    clinical: { healthRecords: true, vaccination: true, prescriptions: true, labResults: true },
    financial: { enabled: true },
    marketing: { enabled: true },
    whatsappBot: { enabled: false },
  },
};

export const defaultPlanLimits = PLAN_PRESETS['solo'];

// Helper class/hook equivalent for evaluating capabilities
export function hasCapability(limits: PlanLimits | undefined | null, module: keyof Omit<PlanLimits, 'plan' | 'team' | 'clinical' | 'whatsappBot'> | 'healthRecords' | 'vaccination' | 'prescriptions' | 'labResults' | 'whatsapp'): boolean {
  if (!limits) return true; // Default to true if no limits are configured (dev / legacy)
  
  switch(module) {
    case 'healthRecords':
    case 'vaccination':
    case 'prescriptions':
    case 'labResults':
      return limits.clinical?.[module] ?? false;
    case 'whatsapp':
      return limits.whatsappBot?.enabled ?? false;
    default:
      const mod = limits[module as keyof PlanLimits] as { enabled?: boolean } | undefined;
      return mod?.enabled ?? false;
  }
}
