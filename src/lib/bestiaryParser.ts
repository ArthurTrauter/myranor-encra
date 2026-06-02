import type { EnemyNPC } from '../types';

interface ActionItem {
  name: string;
  description: string;
}

export interface ParsedCreature {
  name: string;
  type: 'enemy';
  description: string;
  is_multi_variant: boolean;
  default_variant?: string;
  variants_keys?: string[];
  variants?: Record<string, Partial<EnemyNPC>>;
  
  // Single-variant fallback fields
  level?: string;
  hp_max?: number;
  hp_current?: number;
  rk?: number;
  vp?: number;
  tp_formula?: string;
  bw?: string;
  ub?: number;
  senses?: string;
  languages?: string;
  saves?: string;
  immunities?: string;
  ini?: number;
  attributes?: { name: string; value: number }[];
  skills?: { name: string; value: number; passive?: number }[];
  traits?: { name: string; description: string }[];
  actions?: ActionItem[];
  bonus_actions?: ActionItem[];
  reactions?: ActionItem[];
  legendary_actions?: ActionItem[];
  lair_actions?: ActionItem[];
  regional_effects?: string;

  // Fluff fields
  groesse?: string;
  gewicht?: string;
  menge?: string;
  verbreitung?: string;
}

export function cleanText(text: string): string {
  if (!text) return '';
  const junkRe = /\s*(?:\b(?:Abenteuerideen|Verbreitung|Michael\s+Jaecks|Eric\s+Lofgren|Iris\s+Aleit|Florian\s+Stitz|Colin\s+Ashcroft)\b.*?)?(?:Christian\s+Voshage\s*-\s*Lonwyrm@gmail\.com\s*-\s*\d+\/\d+\/\d+\/\d+)\s*/gi;
  let cleaned = text.replace(junkRe, '');
  cleaned = cleaned.replace(/\s*\b(?:Verbreitung|Abenteuerideen)\b\s*$/i, '');
  return cleaned.trim();
}

export function parseBestiaryText(text: string): ParsedCreature | null {
  if (!text || !text.trim()) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 3) return null;

  // 1. Name & Variants
  const name = lines[0];
  const normalizeForCheck = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
  const normName = normalizeForCheck(name);
  let skipIdx = 1;
  while (skipIdx < lines.length) {
    if (normalizeForCheck(lines[skipIdx]) === normName) {
      lines.splice(skipIdx, 1);
    } else {
      break;
    }
  }
  const secondLine = lines[1];
  
  const isMultiVariant = secondLine.includes('/');
  const variantsKeys = isMultiVariant 
    ? secondLine.split('/').map(v => v.trim()) 
    : ['Standard'];

  // Identify default variant (e.g., Ausgewachsen if exists, or the last variant)
  let defaultVariant = variantsKeys[variantsKeys.length - 1];
  const ausgewachsenIndex = variantsKeys.findIndex(v => v.toLowerCase().includes('ausgewachsen'));
  if (ausgewachsenIndex !== -1) {
    defaultVariant = variantsKeys[ausgewachsenIndex];
  }

  // 2. Locate Section Headings and divide text
  // Headings we look for in German:
  const sectionHeadings = [
    { key: 'actions', label: 'Aktionen' },
    { key: 'bonus_actions', label: 'Bonusaktionen' },
    { key: 'reactions', label: 'Reaktionen' },
    { key: 'legendary_actions', label: 'Legendäre Aktionen' },
    { key: 'lair_actions', label: 'Hortaktionen' },
    { key: 'regional_effects', label: 'Regionale Effekte' }
  ];

  const headingIndices: { key: string; index: number; lineIndex: number }[] = [];
  
  lines.forEach((line, lineIdx) => {
    const matchedHeading = sectionHeadings.find(h => 
      line.toLowerCase() === h.label.toLowerCase() ||
      line.toLowerCase().startsWith(h.label.toLowerCase() + ':') ||
      line.toLowerCase().startsWith(h.label.toLowerCase() + ' (')
    );
    if (matchedHeading) {
      headingIndices.push({
        key: matchedHeading.key,
        index: text.indexOf(line),
        lineIndex: lineIdx
      });
    }
  });

  // Sort headings by occurrence in text
  headingIndices.sort((a, b) => a.lineIndex - b.lineIndex);

  // Extract blocks of text
  const blocks: Record<string, string[]> = {};
  
  // The header block is everything before the first heading
  const firstHeadingLineIdx = headingIndices.length > 0 ? headingIndices[0].lineIndex : lines.length;
  const headerLines = lines.slice(2, firstHeadingLineIdx);

  for (let i = 0; i < headingIndices.length; i++) {
    const current = headingIndices[i];
    const next = headingIndices[i + 1];
    const startIdx = current.lineIndex + 1;
    const endIdx = next ? next.lineIndex : lines.length;
    blocks[current.key] = lines.slice(startIdx, endIdx);
  }

  // Helper: Parse stats from header lines
  let sizeTypeLine = '';
  let hgLine = '';
  let rkLine = '';
  let tpLine = '';
  let bwLine = '';
  let savesLine = '';
  let sensesLine = '';
  let languagesLine = '';
  let ubLine = '';
  let immunitiesLine = '';
  let perceptionLine = '';
  let stealthLine = '';

  let groesseLine = '';
  let gewichtLine = '';
  let mengeLine = '';
  const verbreitungLines: string[] = [];
  let lastFluffField: 'groesse' | 'gewicht' | 'menge' | 'verbreitung' | null = null;
  const fluffLines = new Set<string>();

  const attributeRows: { variant: string; values: number[] }[] = [];
  const attributeLines = new Set<string>();

  // 1. Search for headers to parse attributes (vertical or horizontal)
  let staIdx = -1;
  let hasVerticalAttributes = false;

  for (let i = 0; i < headerLines.length; i++) {
    const l = headerLines[i].toLowerCase();
    
    // Check for single-line horizontal header
    if ((l === 'stä' || l === 'stae' || l.startsWith('stä ') || l.startsWith('stae ')) && l.includes('ges') && l.includes('kon')) {
      let j = i + 1;
      while (j < headerLines.length) {
        const valLine = headerLines[j];
        const parts = valLine.split(/\s+/);
        if (parts.length >= 7) {
          const variantName = parts[0];
          const values = parts.slice(1, 7).map(v => parseInt(v.replace('+', ''), 10)).filter(v => !isNaN(v));
          if (values.length === 6) {
            attributeRows.push({ variant: variantName, values });
            attributeLines.add(valLine);
          }
        } else if (parts.length === 6) {
          const values = parts.map(v => parseInt(v.replace('+', ''), 10)).filter(v => !isNaN(v));
          if (values.length === 6) {
            attributeRows.push({ variant: 'Standard', values });
            attributeLines.add(valLine);
          }
        } else {
          break;
        }
        j++;
      }
      attributeLines.add(headerLines[i]);
      break;
    }
    
    // Check for vertical headers
    if (l === 'stä' || l === 'stae' || l.startsWith('stä ') || l.startsWith('stae ')) {
      if (i + 5 < headerLines.length &&
          (headerLines[i+1].toLowerCase() === 'ges' || headerLines[i+1].toLowerCase().includes('ges')) &&
          (headerLines[i+2].toLowerCase() === 'kon' || headerLines[i+2].toLowerCase().includes('kon')) &&
          (headerLines[i+3].toLowerCase() === 'int' || headerLines[i+3].toLowerCase().includes('int')) &&
          (headerLines[i+4].toLowerCase() === 'wei' || headerLines[i+4].toLowerCase().includes('wei')) &&
          (headerLines[i+5].toLowerCase() === 'cha' || headerLines[i+5].toLowerCase().includes('cha'))) {
        staIdx = i;
        hasVerticalAttributes = true;
        break;
      }
    }
  }

  if (hasVerticalAttributes && staIdx !== -1) {
    // Add header lines to attributeLines
    for (let offset = 0; offset < 6; offset++) {
      attributeLines.add(headerLines[staIdx + offset]);
    }
    if (headerLines[staIdx - 1]?.toLowerCase() === 'alter') {
      attributeLines.add(headerLines[staIdx - 1]);
    }
    
    let currentIdx = staIdx + 6;
    if (isMultiVariant) {
      // Group of 7 lines: VariantName, STÄ, GES, KON, INT, WEI, CHA
      while (currentIdx + 6 <= headerLines.length) {
        const variantName = headerLines[currentIdx].trim();
        const rawVals = headerLines.slice(currentIdx + 1, currentIdx + 7);
        const values = rawVals.map(v => parseInt(v.replace('+', '').replace('–', '-').replace('-', '-').trim(), 10));
        const allValid = values.every(v => !isNaN(v));
        if (allValid) {
          attributeRows.push({ variant: variantName, values });
          attributeLines.add(headerLines[currentIdx]);
          rawVals.forEach(v => attributeLines.add(v));
          currentIdx += 7;
        } else {
          break;
        }
      }
    } else {
      // Single variant: next 6 lines are integers
      if (currentIdx + 5 < headerLines.length) {
        const rawVals = headerLines.slice(currentIdx, currentIdx + 6);
        const values = rawVals.map(v => parseInt(v.replace('+', '').replace('–', '-').replace('-', '-').trim(), 10));
        const allValid = values.every(v => !isNaN(v));
        if (allValid) {
          attributeRows.push({ variant: 'Standard', values });
          rawVals.forEach(v => attributeLines.add(v));
        }
      }
    }
  }

  headerLines.forEach(line => {
    if (attributeLines.has(line)) {
      return;
    }
    const lower = line.toLowerCase();
    
    if (lower.startsWith('größe:') || lower.startsWith('groeße:') || lower.startsWith('groesse:')) {
      groesseLine = line;
      fluffLines.add(line);
      lastFluffField = 'groesse';
      return;
    }
    if (lower.startsWith('gewicht:')) {
      gewichtLine = line;
      fluffLines.add(line);
      lastFluffField = 'gewicht';
      return;
    }
    if (lower.startsWith('menge:')) {
      mengeLine = line;
      fluffLines.add(line);
      lastFluffField = 'menge';
      return;
    }
    if (lower.startsWith('verbreitung:')) {
      verbreitungLines.push(line);
      fluffLines.add(line);
      lastFluffField = 'verbreitung';
      return;
    }

    if (lower.includes('monstrosität') || lower.includes('drache') || lower.includes('humanoid') || lower.includes('bestie') || lower.includes('elementar')) {
      sizeTypeLine = line;
      lastFluffField = null;
    } else if (lower.includes('herausforderungsgrad') || lower.includes('hg ')) {
      hgLine = line;
      lastFluffField = null;
    } else if (lower.includes('rüstungsklasse') || lower.includes('rk ')) {
      rkLine = line;
      lastFluffField = null;
    } else if (lower.includes('trefferpunkte') || lower.includes('tp ')) {
      tpLine = line;
      lastFluffField = null;
    } else if (lower.includes('bewegungsrate') || lower.includes('bw ')) {
      bwLine = line;
      lastFluffField = null;
    } else if (lower.includes('rettungswürfe') || lower.includes('rw ')) {
      savesLine = line;
      lastFluffField = null;
    } else if (lower.includes('sinne')) {
      sensesLine = line;
      lastFluffField = null;
    } else if (lower.includes('sprachen')) {
      languagesLine = line;
      lastFluffField = null;
    } else if (lower.includes('übungsbonus') || lower.includes('ub ')) {
      ubLine = line;
      lastFluffField = null;
    } else if (lower.includes('immunitäten')) {
      immunitiesLine = line;
      lastFluffField = null;
    } else if (lower.includes('wahrnehmung')) {
      perceptionLine = line;
      lastFluffField = null;
    } else if (lower.includes('heimlichkeit')) {
      stealthLine = line;
      lastFluffField = null;
    } else {
      if (lastFluffField) {
        fluffLines.add(line);
        if (lastFluffField === 'verbreitung') {
          verbreitungLines.push(line);
        } else if (lastFluffField === 'groesse') {
          groesseLine += ' ' + line;
        } else if (lastFluffField === 'gewicht') {
          gewichtLine += ' ' + line;
        } else if (lastFluffField === 'menge') {
          mengeLine += ' ' + line;
        }
      }
    }
  });

  const extractVal = (fullLine: string): string => {
    if (!fullLine) return '';
    const colonIdx = fullLine.indexOf(':');
    if (colonIdx === -1) return fullLine.trim();
    return fullLine.substring(colonIdx + 1).trim();
  };

  const groesseVal = extractVal(groesseLine);
  const gewichtVal = extractVal(gewichtLine);
  const mengeVal = extractVal(mengeLine);
  const verbreitungVal = verbreitungLines.map((l, i) => i === 0 ? extractVal(l) : l).join(' ').trim();

  // Extract Traits (Eigenschaften) - everything in header that isn't a known stats line or attribute grid
  const traitsList: ActionItem[] = [];
  let currentTrait: ActionItem | null = null;

  headerLines.forEach(line => {
    const isStatLine = 
      line === sizeTypeLine || line === hgLine || line === rkLine || line === tpLine || 
      line === bwLine || line === savesLine || line === sensesLine || line === languagesLine || 
      line === ubLine || line === immunitiesLine || line === perceptionLine || line === stealthLine ||
      fluffLines.has(line) ||
      attributeLines.has(line) ||
      line.toLowerCase().includes('alter stä ges kon') || 
      attributeRows.some(r => line.startsWith(r.variant));

    if (isStatLine) {
      if (currentTrait) {
        traitsList.push(currentTrait);
        currentTrait = null;
      }
      return;
    }

    // Trait check: starts with Word:
    const colonMatch = line.match(/^([^:\n]+):\s*(.*)$/);
    if (colonMatch && colonMatch[1].length < 40 && !colonMatch[1].toLowerCase().includes('wahrnehmung') && !colonMatch[1].toLowerCase().includes('heimlichkeit')) {
      if (currentTrait) {
        traitsList.push(currentTrait);
      }
      currentTrait = {
        name: colonMatch[1].trim(),
        description: colonMatch[2].trim()
      };
    } else if (currentTrait) {
      currentTrait.description += ' ' + line;
    }
  });
  if (currentTrait) {
    traitsList.push(currentTrait);
  }

  // Parse Action Blocks helper
  const parseActionBlock = (linesList: string[] | undefined): ActionItem[] => {
    if (!linesList) return [];
    
    const items: ActionItem[] = [];
    let currentItem: ActionItem | null = null;
    const fluffKeys = ["größe", "groeße", "groesse", "gewicht", "menge", "verbreitung"];

    linesList.forEach(line => {
      // Check if this line starts with a new action: "Name:"
      // Ensure we don't match colons inside descriptions (e.g. "Treffer: 15 (2d10+4)")
      // We look for capitalized words, optionally with parentheses like "Gewitterodem (Aufladung 5-6):"
      const colonMatch = line.match(/^([^:\n]+):\s*(.*)$/);
      const isHeaderStart = colonMatch && 
        colonMatch[1].length < 50 && 
        !colonMatch[1].toLowerCase().includes('treffer') && 
        !colonMatch[1].toLowerCase().includes('reichweite') &&
        !colonMatch[1].match(/^\d+$/);

      if (isHeaderStart) {
        if (currentItem) {
          items.push(currentItem);
        }
        currentItem = {
          name: colonMatch[1].trim(),
          description: colonMatch[2].trim()
        };
      } else {
        if (currentItem) {
          currentItem.description += ' ' + line;
        } else if (line.trim().length > 0) {
          // If there's text before the first colon item, append to general description or make it a note
          currentItem = {
            name: 'Beschreibung',
            description: line
          };
        }
      }
    });

    if (currentItem) {
      items.push(currentItem);
    }
    
    return items
      .filter(item => !fluffKeys.some(fk => item.name.toLowerCase().includes(fk)))
      .map(item => ({
        name: item.name,
        description: cleanText(item.description)
      }));
  };

  const parsedActions = parseActionBlock(blocks['actions']);
  const parsedBonusActions = parseActionBlock(blocks['bonus_actions']);
  const parsedReactions = parseActionBlock(blocks['reactions']);
  const parsedLegendaryActions = parseActionBlock(blocks['legendary_actions']);
  const parsedLairActions = parseActionBlock(blocks['lair_actions']);
  const parsedRegionalEffects = cleanText(blocks['regional_effects']?.join(' ') || '');

  // Helper to split slash-separated stats for variants
  const getVariantValue = (line: string, index: number, total: number, prefix: string): string => {
    if (!line) return '';
    const clean = line.replace(new RegExp(`^${prefix}\\s*`, 'i'), '').trim();
    if (!clean.includes('/')) return clean;
    const parts = clean.split('/');
    if (parts.length === total) {
      return parts[index].trim();
    }
    // If mismatch, return the last or first item
    return (parts[index] || parts[parts.length - 1] || clean).trim();
  };

  // Helper to determine if an action applies to a given variant
  const appliesToVariant = (actionName: string, variantName: string): boolean => {
    const nameLower = actionName.toLowerCase();
    const parenMatch = nameLower.match(/\(([^)]+)\)/);
    if (!parenMatch) return true; // applies to all if no constraints

    const parenContent = parenMatch[1];
    let hasAnyVariantMentioned = false;
    let matchesCurrent = false;

    for (const v of variantsKeys) {
      if (parenContent.includes(v.toLowerCase())) {
        hasAnyVariantMentioned = true;
        if (v.toLowerCase() === variantName.toLowerCase()) {
          matchesCurrent = true;
        }
      }
    }

    if (parenContent.includes('älter')) {
      const jungIdx = variantsKeys.findIndex(x => x.toLowerCase() === 'jung');
      const currIdx = variantsKeys.findIndex(x => x.toLowerCase() === variantName.toLowerCase());
      if (jungIdx !== -1 && currIdx >= jungIdx) {
        return true;
      }
    }

    if (!hasAnyVariantMentioned) return true; // e.g. (Aufladung 5-6)
    return matchesCurrent;
  };

  // Generate variants map
  const variants: Record<string, Partial<EnemyNPC>> = {};

  variantsKeys.forEach((varName, idx) => {
    const totalVars = variantsKeys.length;

    // 1. Level / HG
    const hgVal = getVariantValue(hgLine, idx, totalVars, 'Herausforderungsgrad');

    // 2. RK
    const rkStr = getVariantValue(rkLine, idx, totalVars, 'Rüstungsklasse');
    const rkVal = parseInt(rkStr, 10) || 10;

    // 3. HP / TP
    const tpStr = getVariantValue(tpLine, idx, totalVars, 'Trefferpunkte');
    // Extract max and formula, e.g. "189 (14W10+112)"
    const hpMatch = tpStr.match(/^(\d+)\s*\(([^)]+)\)/);
    const hpMax = hpMatch ? parseInt(hpMatch[1], 10) : parseInt(tpStr, 10) || 30;
    const tpFormula = hpMatch ? hpMatch[2] : '';

    // 4. BW
    const bwVal = getVariantValue(bwLine, idx, totalVars, 'Bewegungsrate');

    // 5. UB
    const ubStr = getVariantValue(ubLine, idx, totalVars, 'Übungsbonus');
    const ubVal = parseInt(ubStr.replace('+', ''), 10) || 2;

    // 6. Attributes
    // Check if we have this specific variant in row, else look for substring match, else use first
    let row = attributeRows.find(r => r.variant.toLowerCase() === varName.toLowerCase());
    if (!row) {
      row = attributeRows.find(r => varName.toLowerCase().includes(r.variant.toLowerCase()));
    }
    if (!row && attributeRows.length > 0) {
      row = attributeRows[Math.min(idx, attributeRows.length - 1)];
    }

    const attributes = row ? [
      { name: 'STÄ', value: row.values[0] },
      { name: 'GES', value: row.values[1] },
      { name: 'KON', value: row.values[2] },
      { name: 'INT', value: row.values[3] },
      { name: 'WEI', value: row.values[4] },
      { name: 'CHA', value: row.values[5] }
    ] : [
      { name: 'STÄ', value: 0 }, { name: 'GES', value: 0 }, { name: 'KON', value: 0 },
      { name: 'INT', value: 0 }, { name: 'WEI', value: 0 }, { name: 'CHA', value: 0 }
    ];

    // 7. Skills
    const skillsList: { name: string; value: number; passive?: number }[] = [];
    
    if (perceptionLine) {
      const percStr = getVariantValue(perceptionLine, idx, totalVars, 'Wahrnehmung');
      // Format is e.g. "+9 (19)" or "+9"
      const percMatch = percStr.match(/^([+-]?\d+)\s*\(([^)]+)\)/);
      const val = percMatch ? parseInt(percMatch[1], 10) : parseInt(percStr, 10) || 0;
      const passive = percMatch ? parseInt(percMatch[2], 10) : 10 + val;
      skillsList.push({ name: 'Wahrnehmung', value: val, passive });
    }
    
    if (stealthLine) {
      const stealthStr = getVariantValue(stealthLine, idx, totalVars, 'Heimlichkeit');
      const stealthMatch = stealthStr.match(/^([+-]?\d+)\s*\(([^)]+)\)/);
      const val = stealthMatch ? parseInt(stealthMatch[1], 10) : parseInt(stealthStr, 10) || 0;
      const passive = stealthMatch ? parseInt(stealthMatch[2], 10) : 10 + val;
      skillsList.push({ name: 'Heimlichkeit', value: val, passive });
    }

    // 8. Filter Actions & Traits for this variant
    const traits = traitsList
      .filter(t => appliesToVariant(t.name, varName))
      .map(t => ({ name: t.name, description: cleanText(t.description) }));

    // Helper: Map actions to proper formats (Nahkampf / Fernkampf check)
    const mapAction = (act: ActionItem) => {
      const isFK = act.description.toLowerCase().includes('fernkampf');
      
      // Parse attack bonus and range if possible
      // Biss: Nahkampfangriffswurf +10/+13, Reichweite 1,5 Meter. Treffer: 17 (2W10+6)
      const atMatch = act.description.match(/angriffswurf\s+([+-]?\d+(?:\/[+-]?\d+)*)/i);
      const atVal = atMatch ? parseInt(getVariantValue(atMatch[1], idx, totalVars, ''), 10) : 0;

      const rwMatch = act.description.match(/reichweite\s*([^.]+)/i);
      const rwVal = rwMatch ? rwMatch[1].trim() : '';

      const dmgMatch = act.description.match(/treffer:\s*([^.]+)/i);
      const dmgVal = dmgMatch ? getVariantValue(dmgMatch[1], idx, totalVars, '') : '';

      return {
        name: act.name,
        type: isFK ? 'FK' : 'NK',
        at: atVal || 4,
        pa: 0,
        range: rwVal || undefined,
        damage: dmgVal || undefined,
        description: act.description
      };
    };

    const actions = parsedActions
      .filter(a => appliesToVariant(a.name, varName))
      .map(mapAction);

    const bonus_actions = parsedBonusActions
      .filter(a => appliesToVariant(a.name, varName))
      .map(a => ({ name: a.name, description: a.description }));

    const reactions = parsedReactions
      .filter(a => appliesToVariant(a.name, varName))
      .map(a => ({ name: a.name, description: a.description }));

    const legendary_actions = parsedLegendaryActions
      .filter(a => appliesToVariant(a.name, varName))
      .map(a => ({ name: a.name, description: a.description }));

    const lair_actions = parsedLairActions
      .filter(a => appliesToVariant(a.name, varName))
      .map(a => ({ name: a.name, description: a.description }));

    // Saves & Immunities strings
    const savesVal = savesLine ? getVariantValue(savesLine, idx, totalVars, 'Rettungswürfe') : '';
    const immunitiesVal = immunitiesLine ? getVariantValue(immunitiesLine, idx, totalVars, 'Immunitäten:') : '';
    const sensesVal = sensesLine ? getVariantValue(sensesLine, idx, totalVars, 'Sinne') : '';
    const languagesVal = languagesLine ? getVariantValue(languagesLine, idx, totalVars, 'Sprachen') : '';

    // Calculate initiative based on GES modifier
    const gesMod = attributes.find(a => a.name === 'GES')?.value || 0;
    const iniVal = 10 + gesMod;

    variants[varName] = {
      level: hgVal || 'HG 1',
      hp_max: hpMax,
      hp_current: hpMax,
      rk: rkVal,
      vp: rkVal,
      tp_formula: tpFormula || undefined,
      bw: bwVal || undefined,
      ub: ubVal,
      saves: savesVal || undefined,
      immunities: immunitiesVal || undefined,
      senses: sensesVal || undefined,
      languages: languagesVal || undefined,
      ini: iniVal,
      attributes,
      skills: skillsList as any[],
      attacks: actions as any[],
      traits: traits as any[],
      actions: actions as any[],
      bonus_actions: bonus_actions as any[],
      reactions: reactions as any[],
      legendary_actions: legendary_actions as any[],
      lair_actions: lair_actions as any[],
      regional_effects: parsedRegionalEffects || undefined
    };
  });

  // Build the final result
  const result: ParsedCreature = {
    name,
    type: 'enemy',
    description: sizeTypeLine || `Ein ${name} Bestiarium Eintrag`,
    is_multi_variant: isMultiVariant,
    default_variant: defaultVariant,
    variants_keys: isMultiVariant ? variantsKeys : undefined,
    variants: isMultiVariant ? variants : undefined,
    groesse: groesseVal || undefined,
    gewicht: gewichtVal || undefined,
    menge: mengeVal || undefined,
    verbreitung: verbreitungVal || undefined
  };

  // If single variant, copy the standard variant stats to top level
  if (!isMultiVariant) {
    const stdStats = variants['Standard'];
    Object.assign(result, stdStats);
  }

  return result;
}
