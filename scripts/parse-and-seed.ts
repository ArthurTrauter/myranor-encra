import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { parseBestiaryText, cleanText } from '../src/lib/bestiaryParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name: string) => {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')!;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RawMonster {
  id: string;
  name: string;
  description: string;
  groesse: string;
  gewicht: string;
  menge: string;
  verbreitung: string;
  stats_block: string;
  image_url: string;
}

async function run() {
  const rawMonstersPath = path.resolve(__dirname, 'extracted_raw_monsters.json');
  const rawMonsters: RawMonster[] = JSON.parse(fs.readFileSync(rawMonstersPath, 'utf8'));

  const templatesPath = path.resolve(__dirname, '../src/data/encounterTemplates.json');
  let existingTemplates: any[] = [];
  if (fs.existsSync(templatesPath)) {
    existingTemplates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  }

  console.log(`Loaded ${rawMonsters.length} raw monsters and ${existingTemplates.length} existing templates.`);

  const newTemplates: any[] = [];
  let parsedCount = 0;

  for (const raw of rawMonsters) {
    if (!raw.stats_block) {
      console.warn(`No stats block for ${raw.name}, skipping stats parsing.`);
      continue;
    }

    // Format stats block to have name and variants line at top
    // For single-variant, we don't have variants line, so we need to inject the name as line 1
    // and then type/size as line 2.
    // Wait, extract-monsters.py already keeps the name as the first line of the stats block!
    // Let's check. Yes, it starts with name.
    const parsed = parseBestiaryText(raw.stats_block);
    if (!parsed) {
      console.warn(`Failed to parse stats block for ${raw.name}`);
      continue;
    }

    parsedCount++;

    // Construct final template
    const template: any = {
      id: raw.id,
      name: raw.name,
      type: 'enemy',
      description: cleanText(raw.description) || `Ein Wesen namens ${raw.name} aus den Regionen Myranors.`,
      notes: cleanText(parsed.notes || ''),
      image_url: raw.image_url || null,
      is_multi_variant: parsed.is_multi_variant,
      default_variant: parsed.default_variant || null,
      groesse: raw.groesse || null,
      gewicht: raw.gewicht || null,
      menge: raw.menge || null,
      verbreitung: raw.verbreitung || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (parsed.is_multi_variant) {
      template.variants = parsed.variants;
    } else {
      // Copy single-variant properties
      template.level = parsed.level || 'HG 1';
      template.hp_max = parsed.hp_max || 30;
      template.vp = parsed.rk || parsed.vp || 10;
      template.rk = parsed.rk || parsed.vp || 10;
      template.tp_formula = parsed.tp_formula || null;
      template.bw = parsed.bw || '9 m';
      template.ub = parsed.ub || 2;
      template.senses = parsed.senses || null;
      template.languages = parsed.languages || null;
      template.saves = parsed.saves || null;
      template.immunities = parsed.immunities || null;
      template.ini = parsed.ini !== undefined ? parsed.ini : 10;
      template.attributes = parsed.attributes || [];
      template.skills = parsed.skills || [];
      template.attacks = parsed.attacks || [];
      template.abilities = parsed.abilities || [];
      template.traits = parsed.traits || [];
      template.actions = parsed.actions || [];
      template.bonus_actions = parsed.bonus_actions || [];
      template.reactions = parsed.reactions || [];
      template.legendary_actions = parsed.legendary_actions || [];
      template.lair_actions = parsed.lair_actions || [];
      template.regional_effects = parsed.regional_effects || null;
    }

    newTemplates.push(template);
  }

  console.log(`Successfully parsed ${parsedCount}/${rawMonsters.length} monsters.`);

  // Merge templates: overwrite by ID
  const mergedTemplates = [...existingTemplates];
  for (const tpl of newTemplates) {
    const idx = mergedTemplates.findIndex(x => x.id === tpl.id);
    if (idx !== -1) {
      // Keep existing created_at if possible
      tpl.created_at = mergedTemplates[idx].created_at || tpl.created_at;
      mergedTemplates[idx] = tpl;
    } else {
      mergedTemplates.push(tpl);
    }
  }

  // Save merged templates to encounterTemplates.json
  fs.writeFileSync(templatesPath, JSON.stringify(mergedTemplates, null, 2), 'utf8');
  console.log(`Saved merged templates to ${templatesPath}. Total templates: ${mergedTemplates.length}`);

  // Image Uploading
  console.log('Uploading images to Supabase storage...');
  for (const raw of rawMonsters) {
    if (!raw.image_url) continue;

    const imgPath = path.resolve(__dirname, 'temp_images', `${raw.id}.webp`);
    if (fs.existsSync(imgPath)) {
      const buffer = fs.readFileSync(imgPath);
      const { data, error } = await supabase.storage
        .from('encounter-images')
        .upload(raw.image_url, buffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (error) {
        console.error(`  Failed to upload ${raw.name} image:`, error.message);
      } else {
        console.log(`  Uploaded image for ${raw.name} (${raw.image_url})`);
      }
    }
  }

  console.log('Parse and seed process finished on node client.');
}

run().catch(err => {
  console.error('Fatal error in parse-and-seed:', err);
  process.exit(1);
});
