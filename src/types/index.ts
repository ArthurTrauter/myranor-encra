export type EncounterElementType = 'enemy' | 'social' | 'trap' | 'hazard';

export interface BaseElement {
  id: string;
  name: string;
  type: EncounterElementType;
  description: string;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface Attribute {
  name: string; // e.g., MU, KL, IN, CH, FF, GE, KO, KK
  value: number;
}

export interface Skill {
  name: string;
  value: number;
}

export interface Attack {
  name: string;
  tp: string; // Trefferpunkte (damage), e.g., 2D6+4
  at: number; // Attack value
  pa: number; // Parade value
  range?: string;
}

export interface EnemyNPC extends BaseElement {
  type: 'enemy';
  level: string; // e.g., "Leicht", "Mittel", "Schwer", "Boss" / "HG 1"
  hp_max: number; // Lebenspunkte
  hp_current: number;
  vp: number; // Rüstungsschutz / Verteidigungspunkte
  ini: number; // Initiative
  attributes: Attribute[];
  skills: Skill[];
  attacks: Attack[];
  abilities: string[]; // Special rules / actions
  
  // Extended fields for rich bestiary entries / Myranor translation
  rk?: number; // Rüstungsklasse (RK)
  bw?: string; // Bewegungsrate (BW)
  ub?: number; // Übungsbonus
  senses?: string; // Sinne
  languages?: string; // Sprachen
  tp_formula?: string; // Trefferpunkte-Formel (z.B. 5W8+15)
  traits?: { name: string; description: string }[]; // Eigenschaften
  actions?: any[]; // Aktionen
  bonus_actions?: any[]; // Bonusaktionen
  saves?: string; // Rettungswürfe (RW)
  immunities?: string; // Immunitäten
  reactions?: any[]; // Reaktionen
  legendary_actions?: any[]; // Legendäre Aktionen
  lair_actions?: any[]; // Hortaktionen
  regional_effects?: string; // Regionale Effekte
  
  // Variant system
  template_id?: string;
  active_variant?: string;
  variants_keys?: string[];
  is_multi_variant?: boolean;

  // Fluff fields
  groesse?: string;
  gewicht?: string;
  menge?: string;
  verbreitung?: string;
}


export interface SocialNPC extends BaseElement {
  type: 'social';
  role: string; // e.g., "Händler", "Adliger", "Gildenmeister"
  faction: string; // e.g., "House of X", "Gilde der Freischaffenden"
  motivation: string;
  secrets: string;
  key_skills: Skill[];
  relationships: {
    targetName: string;
    status: 'befreundet' | 'neutral' | 'feindselig' | 'unbekannt';
  }[];
}

export interface Trap extends BaseElement {
  type: 'trap';
  trigger: string; // e.g., "Druckplatte", "Stolperdraht"
  detection_dc: number; // Perception difficulty
  disarm_dc: number; // Disarm difficulty
  damage: string; // Damage / Effect, e.g., 3D6 TP + Gift
  cooldown: string; // e.g., "Einmalig", "Automatisch aufladend"
}

export interface Hazard extends BaseElement {
  type: 'hazard';
  hazard_type: string; // e.g., "Elementar", "Magisch", "Klimatisch", "Gelände"
  severity: string; // e.g., "Gering", "Moderat", "Tödlich"
  effects: string; // Gameplay mechanics
  avoidance: string; // How to avoid / resist
  duration: string; // e.g., "Permanent", "1W20 KR", "Bis Sonnenuntergang"
}

export type EncounterElement = EnemyNPC | SocialNPC | Trap | Hazard;

export interface EncounterContextType {
  elements: EncounterElement[];
  templates: EncounterElement[];
  loadingElements: boolean;
  loadingTemplates: boolean;
  signedUrls: Record<string, string>;
  addElement: (element: Omit<EncounterElement, 'id' | 'created_at' | 'updated_at'>) => Promise<EncounterElement | null>;
  updateElement: (id: string, updates: Partial<EncounterElement>) => Promise<void>;
  deleteElement: (id: string) => Promise<void>;
  addTemplate: (template: Omit<EncounterElement, 'id' | 'created_at' | 'updated_at'>) => Promise<EncounterElement | null>;
  deleteTemplate: (id: string) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<EncounterElement>) => Promise<void>;
}

export interface BattleParticipant {
  id: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  template_id?: string;
  name: string;
  original_name: string;
  hp_max: number;
  hp_current: number;
  rk?: number;
  ini?: number;
  saves?: string;
  bw?: string;
  ub?: number;
  attributes?: Attribute[];
  actions?: any[];
  bonus_actions?: any[];
  states: string[];
  active_variant?: string;
  image_url?: string;
}

export interface BattleContextType {
  battleParticipants: BattleParticipant[];
  loadingBattle: boolean;
  addBattleParticipant: (
    elementOrTemplate: any,
    customName: string,
    hpMax: number
  ) => Promise<BattleParticipant | null>;
  updateBattleParticipant: (id: string, updates: Partial<BattleParticipant>) => Promise<void>;
  deleteBattleParticipant: (id: string) => Promise<void>;
  clearBattle: () => Promise<void>;
}

