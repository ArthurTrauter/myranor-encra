import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL or Anon Key not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const templatesPath = path.resolve(__dirname, '../src/data/encounterTemplates.json');
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

async function seed() {
  console.log(`Seeding ${templates.length} templates...`);
  
  for (const template of templates) {
    console.log(`Inserting ${template.name} (${template.id})...`);
    
    // Set standard properties, defaulting empty arrays to empty JSON arrays
    const payload = {
      id: template.id,
      name: template.name,
      type: template.type,
      description: template.description || null,
      notes: template.notes || null,
      is_multi_variant: template.is_multi_variant || false,
      default_variant: template.default_variant || null,
      variants: template.variants || null,
      level: template.level || null,
      hp_max: template.hp_max || null,
      vp: template.vp || null,
      rk: template.rk || null,
      tp_formula: template.tp_formula || null,
      bw: template.bw || null,
      ub: template.ub || null,
      senses: template.senses || null,
      languages: template.languages || null,
      ini: template.ini !== undefined ? template.ini : 10,
      attributes: template.attributes || [],
      skills: template.skills || [],
      attacks: template.attacks || [],
      abilities: template.abilities || [],
      traits: template.traits || [],
      actions: template.actions || [],
      bonus_actions: template.bonus_actions || [],
      saves: template.saves || null,
      immunities: template.immunities || null,
      reactions: template.reactions || [],
      legendary_actions: template.legendary_actions || [],
      lair_actions: template.lair_actions || [],
      regional_effects: template.regional_effects || null,
      user_id: null // Explicitly official
    };
    
    const { error } = await supabase
      .from('templates')
      .upsert(payload, { onConflict: 'id' });
      
    if (error) {
      console.error(`Error inserting ${template.name}:`, error.message);
    } else {
      console.log(`Successfully inserted ${template.name}`);
    }
  }
  
  console.log('Seeding completed.');
}

seed();
