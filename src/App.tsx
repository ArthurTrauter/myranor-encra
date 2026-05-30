import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useEncounters } from './context/EncounterContext';
import type { EncounterElement, EncounterElementType } from './types';
import { parseBestiaryText } from './lib/bestiaryParser';
import { supabase } from './lib/supabase';
import { compressToWebP } from './lib/imageCompressor';

export const App: React.FC = () => {
  const { user, signOut } = useAuth();
  const {
    elements,
    templates,
    loadingElements,
    signedUrls,
    addElement,
    updateElement,
    deleteElement,
    addTemplate,
    deleteTemplate,
    updateTemplate
  } = useEncounters();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<EncounterElementType | 'all'>('all');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  
  // Settings & Font-Size States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem('rpg-font-size') || '100');
  });

  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    document.documentElement.style.fontSize = `${val}%`;
    localStorage.setItem('rpg-font-size', val.toString());
  };

  // Tab within the "+ Element" drawer
  const [creatorTab, setCreatorTab] = useState<'template' | 'parser' | 'manual'>('template');
  const [manualSubTab, setManualSubTab] = useState<'stats' | 'attributes' | 'traits' | 'actions'>('stats');

  // Template Loader States
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');

  // Raw text import states
  const [rawBestiaryText, setRawBestiaryText] = useState('');
  const [parserError, setParserError] = useState('');
  const [parserSuccess, setParserSuccess] = useState('');

  // Form states (reused & extended for advanced manual creation/autofill)
  const [saveToTemplates, setSaveToTemplates] = useState(false);
  const [parsedMultiVariantData, setParsedMultiVariantData] = useState<any>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateVariant, setEditingTemplateVariant] = useState<string | null>(null);
  const [newVariantNameInput, setNewVariantNameInput] = useState('');
  const [tempCopyTemplateId, setTempCopyTemplateId] = useState('');
  const [tempCopyVariantName, setTempCopyVariantName] = useState('');

  // Quick-Add Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<EncounterElementType>('enemy');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreviewUrls, setLocalPreviewUrls] = useState<Record<string, string>>({});

  // Core enemy fields
  const [newEnemyLevel, setNewEnemyLevel] = useState('HG 1');
  const [newEnemyHP, setNewEnemyHP] = useState(30);
  const [newEnemyVP, setNewEnemyVP] = useState(10); // Rüstungsklasse (RK)
  const [newEnemyIni, setNewEnemyIni] = useState(10);

  // Extended enemy fields
  const [newEnemyBW, setNewEnemyBW] = useState('9 m');
  const [newEnemyUB, setNewEnemyUB] = useState(2);
  const [newEnemySaves, setNewEnemySaves] = useState('');
  const [newEnemyImmunities, setNewEnemyImmunities] = useState('');
  const [newEnemySenses, setNewEnemySenses] = useState('Dunkelsicht 36 m');
  const [newEnemyLanguages, setNewEnemyLanguages] = useState('Gemeinsprache');

  // Attributes states (STÄ GES KON INT WEI CHA)
  const [newAttrSTA, setNewAttrSTA] = useState(0);
  const [newAttrGES, setNewAttrGES] = useState(0);
  const [newAttrKON, setNewAttrKON] = useState(0);
  const [newAttrINT, setNewAttrINT] = useState(0);
  const [newAttrWEI, setNewAttrWEI] = useState(0);
  const [newAttrCHA, setNewAttrCHA] = useState(0);

  // Dynamic Lists states
  const [newTraits, setNewTraits] = useState<{ name: string; description: string }[]>([]);
  const [newActions, setNewActions] = useState<any[]>([]);
  const [newBonusActions, setNewBonusActions] = useState<{ name: string; description: string }[]>([]);
  const [newReactions, setNewReactions] = useState<{ name: string; description: string }[]>([]);
  const [newLegendaryActions, setNewLegendaryActions] = useState<{ name: string; description: string }[]>([]);
  const [newLairActions, setNewLairActions] = useState<{ name: string; description: string }[]>([]);
  const [newRegionalEffects, setNewRegionalEffects] = useState('');
  
  // Fluff states
  const [newEnemyGroesse, setNewEnemyGroesse] = useState('');
  const [newEnemyGewicht, setNewEnemyGewicht] = useState('');
  const [newEnemyMenge, setNewEnemyMenge] = useState('');
  const [newEnemyVerbreitung, setNewEnemyVerbreitung] = useState('');

  // Fields to add single items dynamically in UI
  const [tempTraitName, setTempTraitName] = useState('');
  const [tempTraitDesc, setTempTraitDesc] = useState('');
  const [tempActionName, setTempActionName] = useState('');
  const [tempActionType, setTempActionType] = useState<'NK' | 'FK'>('NK');
  const [tempActionAt, setTempActionAt] = useState(4);
  const [tempActionDmg, setTempActionDmg] = useState('1D6');
  const [tempActionDesc, setTempActionDesc] = useState('');

  // Social states
  const [newSocialRole, setNewSocialRole] = useState('');
  const [newSocialFaction, setNewSocialFaction] = useState('');
  const [newSocialMotivation, setNewSocialMotivation] = useState('');
  const [newSocialSecret, setNewSocialSecret] = useState('');

  // Trap states
  const [newTrapTrigger, setNewTrapTrigger] = useState('');
  const [newTrapDetect, setNewTrapDetect] = useState(12);
  const [newTrapDisarm, setNewTrapDisarm] = useState(12);
  const [newTrapDamage, setNewTrapDamage] = useState('');

  // Hazard states
  const [newHazardType, setNewHazardType] = useState('');
  const [newHazardSeverity, setNewHazardSeverity] = useState('Moderat');
  const [newHazardEffects, setNewHazardEffects] = useState('');

  const getImageUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('user-uploads/')) {
      return localPreviewUrls[url] || signedUrls[url];
    }
    return url;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      alert('Bitte logge dich ein, um eigene Bilder hochzuladen.');
      return;
    }

    try {
      setUploading(true);

      // 1. Client-side compress WebP
      const compressedBlob = await compressToWebP(file);

      // 2. Upload to private Supabase bucket
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.webp`;
      const filePath = `user-uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('encounter-images')
        .upload(filePath, compressedBlob, {
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      // 3. Request signed URL for immediate preview
      const { data: signedData, error: signedError } = await supabase.storage
        .from('encounter-images')
        .createSignedUrl(filePath, 86400);

      if (signedError) throw signedError;

      if (signedData?.signedUrl) {
        setLocalPreviewUrls(prev => ({ ...prev, [filePath]: signedData.signedUrl }));
      }

      setNewImageUrl(filePath);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Fehler beim Hochladen des Bildes: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleSecret = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId) as any;
    if (template && template.is_multi_variant) {
      setSelectedVariant(template.default_variant || Object.keys(template.variants)[0]);
    } else {
      setSelectedVariant('');
    }
  };

  const handleAddFromTemplate = async () => {
    if (!selectedTemplateId) return;
    const template = templates.find(t => t.id === selectedTemplateId) as any;
    if (!template) return;

    let payload: any = {};

    if (template.is_multi_variant && selectedVariant) {
      const variantData = template.variants[selectedVariant];
      payload = {
        name: `${template.name} (${selectedVariant})`,
        type: template.type,
        description: template.description,
        notes: template.notes || '',
        image_url: template.image_url || undefined,
        groesse: template.groesse,
        gewicht: template.gewicht,
        menge: template.menge,
        verbreitung: template.verbreitung,
        level: variantData.level,
        hp_max: variantData.tp_max,
        hp_current: variantData.tp_max,
        vp: variantData.rk,
        rk: variantData.rk,
        tp_formula: variantData.tp_formula,
        bw: variantData.bw,
        ub: variantData.ub,
        senses: variantData.senses,
        languages: variantData.languages,
        saves: variantData.saves,
        immunities: variantData.immunities,
        reactions: variantData.reactions,
        legendary_actions: variantData.legendary_actions,
        lair_actions: variantData.lair_actions,
        regional_effects: variantData.regional_effects,
        ini: variantData.attributes?.find((a: any) => a.name === 'GES' || a.name === 'GE')?.value || 10,
        attributes: variantData.attributes,
        skills: variantData.skills,
        attacks: variantData.attacks || [],
        abilities: [],
        traits: variantData.traits,
        actions: variantData.actions,
        bonus_actions: variantData.bonus_actions,
        template_id: template.id,
        active_variant: selectedVariant,
        variants_keys: Object.keys(template.variants),
        is_multi_variant: true
      };
    } else {
      // Simple template
      payload = {
        name: template.name,
        type: template.type,
        description: template.description,
        notes: template.notes || '',
        image_url: template.image_url || undefined,
        groesse: template.groesse,
        gewicht: template.gewicht,
        menge: template.menge,
        verbreitung: template.verbreitung,
        level: template.level || 'Mittel',
        hp_max: template.hp_max || 30,
        hp_current: template.hp_max || 30,
        vp: template.vp || 0,
        rk: template.rk || template.vp || 10,
        ini: template.ini || 10,
        bw: template.bw || '9 m',
        ub: template.ub || 2,
        senses: template.senses || '',
        languages: template.languages || '',
        saves: template.saves || '',
        immunities: template.immunities || '',
        attributes: template.attributes || [],
        skills: template.skills || [],
        attacks: template.attacks || [],
        abilities: template.abilities || [],
        traits: template.traits || [],
        actions: template.actions || [],
        bonus_actions: template.bonus_actions || [],
        reactions: template.reactions || [],
        legendary_actions: template.legendary_actions || [],
        lair_actions: template.lair_actions || [],
        regional_effects: template.regional_effects || '',
        template_id: template.id
      };
    }

    await addElement(payload);

    // Reset template selection
    setSelectedTemplateId('');
    setSelectedVariant('');
    setShowAddForm(false);
  };

  const handleCardVariantChange = async (id: string, newVariantName: string) => {
    const activeEl = elements.find(el => el.id === id) as any;
    if (!activeEl || !activeEl.template_id) return;

    const template = templates.find(t => t.id === activeEl.template_id) as any;
    if (!template || !template.variants) return;

    const variantData = template.variants[newVariantName];
    if (!variantData) return;

    const updates = {
      name: `${template.name} (${newVariantName})`,
      level: variantData.level,
      hp_max: variantData.tp_max,
      hp_current: variantData.tp_max, // Reset HP for new variant
      vp: variantData.rk,
      rk: variantData.rk,
      tp_formula: variantData.tp_formula,
      bw: variantData.bw,
      ub: variantData.ub,
      senses: variantData.senses,
      languages: variantData.languages,
      saves: variantData.saves,
      immunities: variantData.immunities,
      reactions: variantData.reactions,
      legendary_actions: variantData.legendary_actions,
      lair_actions: variantData.lair_actions,
      regional_effects: variantData.regional_effects,
      attributes: variantData.attributes,
      skills: variantData.skills,
      traits: variantData.traits,
      actions: variantData.actions,
      bonus_actions: variantData.bonus_actions,
      active_variant: newVariantName
    };

    await updateElement(id, updates);
  };

  const handleParseText = () => {
    try {
      setParserError('');
      setParserSuccess('');

      const parsed = parseBestiaryText(rawBestiaryText);
      if (!parsed) {
        setParserError('Konnte den Bestiarium-Text nicht parsen. Bitte überprüfe das Format (Name in Zeile 1, Stufen in Zeile 2).');
        return;
      }

      setNewName(parsed.name);
      setNewDesc(parsed.description || '');
      setNewType('enemy'); // Bestiary copy parses enemies
      
      setNewEnemyGroesse(parsed.groesse || '');
      setNewEnemyGewicht(parsed.gewicht || '');
      setNewEnemyMenge(parsed.menge || '');
      setNewEnemyVerbreitung(parsed.verbreitung || '');

      if (parsed.is_multi_variant && parsed.variants && parsed.variants_keys) {
        setParsedMultiVariantData(parsed);
        const defVar = parsed.default_variant || parsed.variants_keys[0];
        const stats = parsed.variants[defVar];
        if (stats) {
          setNewEnemyLevel(stats.level || 'HG 1');
          setNewEnemyHP(stats.hp_max || 30);
          setNewEnemyVP(stats.rk || 10);
          setNewEnemyIni(stats.ini || 10);
          setNewEnemyBW(stats.bw || '9 m');
          setNewEnemyUB(stats.ub || 2);
          setNewEnemySaves(stats.saves || '');
          setNewEnemyImmunities(stats.immunities || '');
          setNewEnemySenses(stats.senses || '');
          setNewEnemyLanguages(stats.languages || '');

          setNewAttrSTA(stats.attributes?.find(a => a.name === 'STÄ')?.value ?? 0);
          setNewAttrGES(stats.attributes?.find(a => a.name === 'GES')?.value ?? 0);
          setNewAttrKON(stats.attributes?.find(a => a.name === 'KON')?.value ?? 0);
          setNewAttrINT(stats.attributes?.find(a => a.name === 'INT')?.value ?? 0);
          setNewAttrWEI(stats.attributes?.find(a => a.name === 'WEI')?.value ?? 0);
          setNewAttrCHA(stats.attributes?.find(a => a.name === 'CHA')?.value ?? 0);

          setNewTraits(stats.traits || []);
          setNewActions(stats.actions || []);
          setNewBonusActions(stats.bonus_actions || []);
          setNewReactions(stats.reactions || []);
          setNewLegendaryActions(stats.legendary_actions || []);
          setNewLairActions(stats.lair_actions || []);
          setNewRegionalEffects(stats.regional_effects || '');
        }
        setParserSuccess(`Bestiarium-Text "${parsed.name}" (${parsed.variants_keys.length} Varianten) erfolgreich analysiert! Standardvariante "${defVar}" geladen.`);
      } else {
        setParsedMultiVariantData(null);
        setNewEnemyLevel(parsed.level || 'HG 1');
        setNewEnemyHP(parsed.hp_max || 30);
        setNewEnemyVP(parsed.rk || 10);
        setNewEnemyIni(parsed.ini || 10);
        setNewEnemyBW(parsed.bw || '9 m');
        setNewEnemyUB(parsed.ub || 2);
        setNewEnemySaves(parsed.saves || '');
        setNewEnemyImmunities(parsed.immunities || '');
        setNewEnemySenses(parsed.senses || '');
        setNewEnemyLanguages(parsed.languages || '');

        setNewAttrSTA(parsed.attributes?.find(a => a.name === 'STÄ')?.value ?? 0);
        setNewAttrGES(parsed.attributes?.find(a => a.name === 'GES')?.value ?? 0);
        setNewAttrKON(parsed.attributes?.find(a => a.name === 'KON')?.value ?? 0);
        setNewAttrINT(parsed.attributes?.find(a => a.name === 'INT')?.value ?? 0);
        setNewAttrWEI(parsed.attributes?.find(a => a.name === 'WEI')?.value ?? 0);
        setNewAttrCHA(parsed.attributes?.find(a => a.name === 'CHA')?.value ?? 0);

        setNewTraits(parsed.traits || []);
        setNewActions(parsed.actions || []);
        setNewBonusActions(parsed.bonus_actions || []);
        setNewReactions(parsed.reactions || []);
        setNewLegendaryActions(parsed.legendary_actions || []);
        setNewLairActions(parsed.lair_actions || []);
        setNewRegionalEffects(parsed.regional_effects || '');

        setParserSuccess(`Bestiarium-Text "${parsed.name}" erfolgreich analysiert!`);
      }

      setCreatorTab('manual');
    } catch (err) {
      console.error(err);
      setParserError('Fehler beim Text-Parsing. Bitte überprüfe den Text auf Vollständigkeit.');
    }
  };

  const handleEditTemplate = (tpl: any) => {
    setShowAddForm(true);
    setEditingTemplateId(tpl.id);
    setNewName(tpl.name);
    setNewDesc(tpl.description || '');
    setNewNotes(tpl.notes || '');
    setNewImageUrl(tpl.image_url || '');
    setNewType(tpl.type || 'enemy');
    setNewEnemyGroesse(tpl.groesse || '');
    setNewEnemyGewicht(tpl.gewicht || '');
    setNewEnemyMenge(tpl.menge || '');
    setNewEnemyVerbreitung(tpl.verbreitung || '');
    setCreatorTab('manual');
    setParserSuccess('');
    setParserError('');

    if (tpl.is_multi_variant && tpl.variants) {
      setParsedMultiVariantData(tpl);
      const variantsList = Object.keys(tpl.variants);
      const defVar = tpl.default_variant || variantsList[0];
      setEditingTemplateVariant(defVar);

      const stats = tpl.variants[defVar];
      if (stats) {
        setNewEnemyLevel(stats.level || 'HG 1');
        setNewEnemyHP(stats.hp_max || stats.tp_max || 30);
        setNewEnemyVP(stats.rk || stats.vp || 10);
        setNewEnemyIni(stats.ini || 10);
        setNewEnemyBW(stats.bw || '9 m');
        setNewEnemyUB(stats.ub || 2);
        setNewEnemySaves(stats.saves || '');
        setNewEnemyImmunities(stats.immunities || '');
        setNewEnemySenses(stats.senses || '');
        setNewEnemyLanguages(stats.languages || '');

        setNewAttrSTA(stats.attributes?.find((a: any) => a.name === 'STÄ')?.value ?? 0);
        setNewAttrGES(stats.attributes?.find((a: any) => a.name === 'GES')?.value ?? 0);
        setNewAttrKON(stats.attributes?.find((a: any) => a.name === 'KON')?.value ?? 0);
        setNewAttrINT(stats.attributes?.find((a: any) => a.name === 'INT')?.value ?? 0);
        setNewAttrWEI(stats.attributes?.find((a: any) => a.name === 'WEI')?.value ?? 0);
        setNewAttrCHA(stats.attributes?.find((a: any) => a.name === 'CHA')?.value ?? 0);

        setNewTraits(stats.traits || []);
        setNewActions(stats.actions || []);
        setNewBonusActions(stats.bonus_actions || []);
        setNewReactions(stats.reactions || []);
        setNewLegendaryActions(stats.legendary_actions || []);
        setNewLairActions(stats.lair_actions || []);
        setNewRegionalEffects(stats.regional_effects || '');
      }
    } else {
      setParsedMultiVariantData(null);
      setEditingTemplateVariant(null);
      setNewEnemyLevel(tpl.level || 'HG 1');
      setNewEnemyHP(tpl.hp_max || 30);
      setNewEnemyVP(tpl.rk || tpl.vp || 10);
      setNewEnemyIni(tpl.ini || 10);
      setNewEnemyBW(tpl.bw || '9 m');
      setNewEnemyUB(tpl.ub || 2);
      setNewEnemySaves(tpl.saves || '');
      setNewEnemyImmunities(tpl.immunities || '');
      setNewEnemySenses(tpl.senses || '');
      setNewEnemyLanguages(tpl.languages || '');

      setNewAttrSTA(tpl.attributes?.find((a: any) => a.name === 'STÄ')?.value ?? 0);
      setNewAttrGES(tpl.attributes?.find((a: any) => a.name === 'GES')?.value ?? 0);
      setNewAttrKON(tpl.attributes?.find((a: any) => a.name === 'KON')?.value ?? 0);
      setNewAttrINT(tpl.attributes?.find((a: any) => a.name === 'INT')?.value ?? 0);
      setNewAttrWEI(tpl.attributes?.find((a: any) => a.name === 'WEI')?.value ?? 0);
      setNewAttrCHA(tpl.attributes?.find((a: any) => a.name === 'CHA')?.value ?? 0);

      setNewTraits(tpl.traits || []);
      setNewActions(tpl.actions || []);
      setNewBonusActions(tpl.bonus_actions || []);
      setNewReactions(tpl.reactions || []);
      setNewLegendaryActions(tpl.legendary_actions || []);
      setNewLairActions(tpl.lair_actions || []);
      setNewRegionalEffects(tpl.regional_effects || '');
    }
  };

  const handleCopyTemplateStats = (templateId: string, variantName: string) => {
    const tpl = templates.find(t => t.id === templateId) as any;
    if (!tpl) return;

    setNewName(tpl.name + " (Kopie)");
    setNewDesc(tpl.description || '');
    setNewNotes(tpl.notes || '');
    setNewImageUrl(tpl.image_url || '');
    setNewType(tpl.type || 'enemy');
    setNewEnemyGroesse(tpl.groesse || '');
    setNewEnemyGewicht(tpl.gewicht || '');
    setNewEnemyMenge(tpl.menge || '');
    setNewEnemyVerbreitung(tpl.verbreitung || '');
    setParserSuccess(`Werte aus Vorlage "${tpl.name}" erfolgreich kopiert!`);
    setParserError('');

    if (tpl.is_multi_variant && tpl.variants) {
      const activeVar = variantName || tpl.default_variant || Object.keys(tpl.variants)[0];
      const stats = tpl.variants[activeVar];
      if (stats) {
        setNewEnemyLevel(stats.level || 'HG 1');
        setNewEnemyHP(stats.hp_max || stats.tp_max || 30);
        setNewEnemyVP(stats.rk || stats.vp || 10);
        setNewEnemyIni(stats.ini || 10);
        setNewEnemyBW(stats.bw || '9 m');
        setNewEnemyUB(stats.ub || 2);
        setNewEnemySaves(stats.saves || '');
        setNewEnemyImmunities(stats.immunities || '');
        setNewEnemySenses(stats.senses || '');
        setNewEnemyLanguages(stats.languages || '');

        setNewAttrSTA(stats.attributes?.find((a: any) => a.name === 'STÄ')?.value ?? 0);
        setNewAttrGES(stats.attributes?.find((a: any) => a.name === 'GES')?.value ?? 0);
        setNewAttrKON(stats.attributes?.find((a: any) => a.name === 'KON')?.value ?? 0);
        setNewAttrINT(stats.attributes?.find((a: any) => a.name === 'INT')?.value ?? 0);
        setNewAttrWEI(stats.attributes?.find((a: any) => a.name === 'WEI')?.value ?? 0);
        setNewAttrCHA(stats.attributes?.find((a: any) => a.name === 'CHA')?.value ?? 0);

        setNewTraits(stats.traits || []);
        setNewActions(stats.actions || []);
        setNewBonusActions(stats.bonus_actions || []);
        setNewReactions(stats.reactions || []);
        setNewLegendaryActions(stats.legendary_actions || []);
        setNewLairActions(stats.lair_actions || []);
        setNewRegionalEffects(stats.regional_effects || '');

        setParsedMultiVariantData({
          ...tpl,
          id: undefined,
          name: tpl.name + " (Kopie)",
          user_id: undefined
        });
        setEditingTemplateVariant(activeVar);
      }
    } else {
      setParsedMultiVariantData(null);
      setEditingTemplateVariant(null);
      setNewEnemyLevel(tpl.level || 'HG 1');
      setNewEnemyHP(tpl.hp_max || 30);
      setNewEnemyVP(tpl.rk || tpl.vp || 10);
      setNewEnemyIni(tpl.ini || 10);
      setNewEnemyBW(tpl.bw || '9 m');
      setNewEnemyUB(tpl.ub || 2);
      setNewEnemySaves(tpl.saves || '');
      setNewEnemyImmunities(tpl.immunities || '');
      setNewEnemySenses(tpl.senses || '');
      setNewEnemyLanguages(tpl.languages || '');

      setNewAttrSTA(tpl.attributes?.find((a: any) => a.name === 'STÄ')?.value ?? 0);
      setNewAttrGES(tpl.attributes?.find((a: any) => a.name === 'GES')?.value ?? 0);
      setNewAttrKON(tpl.attributes?.find((a: any) => a.name === 'KON')?.value ?? 0);
      setNewAttrINT(tpl.attributes?.find((a: any) => a.name === 'INT')?.value ?? 0);
      setNewAttrWEI(tpl.attributes?.find((a: any) => a.name === 'WEI')?.value ?? 0);
      setNewAttrCHA(tpl.attributes?.find((a: any) => a.name === 'CHA')?.value ?? 0);

      setNewTraits(tpl.traits || []);
      setNewActions(tpl.actions || []);
      setNewBonusActions(tpl.bonus_actions || []);
      setNewReactions(tpl.reactions || []);
      setNewLegendaryActions(tpl.legendary_actions || []);
      setNewLairActions(tpl.lair_actions || []);
      setNewRegionalEffects(tpl.regional_effects || '');
    }

    setTempCopyTemplateId('');
    setTempCopyVariantName('');
  };

  const handleSwitchEditVariant = (newVarName: string) => {
    if (!parsedMultiVariantData || !editingTemplateVariant) return;

    const currentVariantData = {
      level: newEnemyLevel,
      hp_max: newEnemyHP,
      hp_current: newEnemyHP,
      rk: newEnemyVP,
      vp: newEnemyVP,
      ini: newEnemyIni,
      bw: newEnemyBW,
      ub: newEnemyUB,
      saves: newEnemySaves || undefined,
      immunities: newEnemyImmunities || undefined,
      senses: newEnemySenses || undefined,
      languages: newEnemyLanguages || undefined,
      attributes: [
        { name: "STÄ", value: newAttrSTA },
        { name: "GES", value: newAttrGES },
        { name: "KON", value: newAttrKON },
        { name: "INT", value: newAttrINT },
        { name: "WEI", value: newAttrWEI },
        { name: "CHA", value: newAttrCHA }
      ],
      skills: [
        { name: 'Wahrnehmung', value: newAttrWEI, passive: 10 + newAttrWEI },
        { name: 'Heimlichkeit', value: newAttrGES, passive: 10 + newAttrGES }
      ],
      attacks: newActions,
      traits: newTraits,
      actions: newActions,
      bonus_actions: newBonusActions,
      reactions: newReactions,
      legendary_actions: newLegendaryActions,
      lair_actions: newLairActions,
      regional_effects: newRegionalEffects || undefined
    };

    const updatedVariants = {
      ...parsedMultiVariantData.variants,
      [editingTemplateVariant]: currentVariantData
    };

    const updatedTemplateData = {
      ...parsedMultiVariantData,
      variants: updatedVariants
    };

    setParsedMultiVariantData(updatedTemplateData);
    setEditingTemplateVariant(newVarName);

    const stats = updatedVariants[newVarName];
    if (stats) {
      setNewEnemyLevel(stats.level || 'HG 1');
      setNewEnemyHP(stats.hp_max || stats.tp_max || 30);
      setNewEnemyVP(stats.rk || stats.vp || 10);
      setNewEnemyIni(stats.ini || 10);
      setNewEnemyBW(stats.bw || '9 m');
      setNewEnemyUB(stats.ub || 2);
      setNewEnemySaves(stats.saves || '');
      setNewEnemyImmunities(stats.immunities || '');
      setNewEnemySenses(stats.senses || '');
      setNewEnemyLanguages(stats.languages || '');

      setNewAttrSTA(stats.attributes?.find((a: any) => a.name === 'STÄ')?.value ?? 0);
      setNewAttrGES(stats.attributes?.find((a: any) => a.name === 'GES')?.value ?? 0);
      setNewAttrKON(stats.attributes?.find((a: any) => a.name === 'KON')?.value ?? 0);
      setNewAttrINT(stats.attributes?.find((a: any) => a.name === 'INT')?.value ?? 0);
      setNewAttrWEI(stats.attributes?.find((a: any) => a.name === 'WEI')?.value ?? 0);
      setNewAttrCHA(stats.attributes?.find((a: any) => a.name === 'CHA')?.value ?? 0);

      setNewTraits(stats.traits || []);
      setNewActions(stats.actions || []);
      setNewBonusActions(stats.bonus_actions || []);
      setNewReactions(stats.reactions || []);
      setNewLegendaryActions(stats.legendary_actions || []);
      setNewLairActions(stats.lair_actions || []);
      setNewRegionalEffects(stats.regional_effects || '');
    }
  };

  const handleAddNewVariant = () => {
    if (!newVariantNameInput.trim() || !parsedMultiVariantData) return;
    const newNameClean = newVariantNameInput.trim();

    const currentVariantData = {
      level: newEnemyLevel,
      hp_max: newEnemyHP,
      hp_current: newEnemyHP,
      rk: newEnemyVP,
      vp: newEnemyVP,
      ini: newEnemyIni,
      bw: newEnemyBW,
      ub: newEnemyUB,
      saves: newEnemySaves || undefined,
      immunities: newEnemyImmunities || undefined,
      senses: newEnemySenses || undefined,
      languages: newEnemyLanguages || undefined,
      attributes: [
        { name: "STÄ", value: newAttrSTA },
        { name: "GES", value: newAttrGES },
        { name: "KON", value: newAttrKON },
        { name: "INT", value: newAttrINT },
        { name: "WEI", value: newAttrWEI },
        { name: "CHA", value: newAttrCHA }
      ],
      skills: [
        { name: 'Wahrnehmung', value: newAttrWEI, passive: 10 + newAttrWEI },
        { name: 'Heimlichkeit', value: newAttrGES, passive: 10 + newAttrGES }
      ],
      attacks: newActions,
      traits: newTraits,
      actions: newActions,
      bonus_actions: newBonusActions,
      reactions: newReactions,
      legendary_actions: newLegendaryActions,
      lair_actions: newLairActions,
      regional_effects: newRegionalEffects || undefined
    };

    const updatedVariants = {
      ...parsedMultiVariantData.variants,
      [newNameClean]: currentVariantData
    };

    const updatedTemplateData = {
      ...parsedMultiVariantData,
      variants: updatedVariants,
      variants_keys: [...(parsedMultiVariantData.variants_keys || []), newNameClean]
    };

    setParsedMultiVariantData(updatedTemplateData);
    setNewVariantNameInput('');
    setEditingTemplateVariant(newNameClean);
  };

  const handleDeleteVariant = (varNameToDelete: string) => {
    if (!parsedMultiVariantData || !parsedMultiVariantData.variants) return;

    const remainingKeys = Object.keys(parsedMultiVariantData.variants).filter(k => k !== varNameToDelete);
    if (remainingKeys.length === 0) {
      alert('Eine Kreatur muss mindestens eine Variante besitzen.');
      return;
    }

    const { [varNameToDelete]: _, ...remainingVariants } = parsedMultiVariantData.variants;

    const updatedTemplateData = {
      ...parsedMultiVariantData,
      variants: remainingVariants,
      variants_keys: remainingKeys
    };

    setParsedMultiVariantData(updatedTemplateData);
    const fallbackVar = remainingKeys[0];
    setEditingTemplateVariant(fallbackVar);

    const stats = remainingVariants[fallbackVar];
    if (stats) {
      setNewEnemyLevel(stats.level || 'HG 1');
      setNewEnemyHP(stats.hp_max || stats.tp_max || 30);
      setNewEnemyVP(stats.rk || stats.vp || 10);
      setNewEnemyIni(stats.ini || 10);
      setNewEnemyBW(stats.bw || '9 m');
      setNewEnemyUB(stats.ub || 2);
      setNewEnemySaves(stats.saves || '');
      setNewEnemyImmunities(stats.immunities || '');
      setNewEnemySenses(stats.senses || '');
      setNewEnemyLanguages(stats.languages || '');

      setNewAttrSTA(stats.attributes?.find((a: any) => a.name === 'STÄ')?.value ?? 0);
      setNewAttrGES(stats.attributes?.find((a: any) => a.name === 'GES')?.value ?? 0);
      setNewAttrKON(stats.attributes?.find((a: any) => a.name === 'KON')?.value ?? 0);
      setNewAttrINT(stats.attributes?.find((a: any) => a.name === 'INT')?.value ?? 0);
      setNewAttrWEI(stats.attributes?.find((a: any) => a.name === 'WEI')?.value ?? 0);
      setNewAttrCHA(stats.attributes?.find((a: any) => a.name === 'CHA')?.value ?? 0);

      setNewTraits(stats.traits || []);
      setNewActions(stats.actions || []);
      setNewBonusActions(stats.bonus_actions || []);
      setNewReactions(stats.reactions || []);
      setNewLegendaryActions(stats.legendary_actions || []);
      setNewLairActions(stats.lair_actions || []);
      setNewRegionalEffects(stats.regional_effects || '');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (editingTemplateId) {
      // Editing template flow
      let updates: any = {};

      if (newType === 'enemy') {
        const attributes = [
          { name: "STÄ", value: newAttrSTA }, { name: "GES", value: newAttrGES }, { name: "KON", value: newAttrKON },
          { name: "INT", value: newAttrINT }, { name: "WEI", value: newAttrWEI }, { name: "CHA", value: newAttrCHA }
        ];

        if (parsedMultiVariantData && parsedMultiVariantData.is_multi_variant) {
          // Sync current form fields to active variant before saving template
          let finalVariants = { ...parsedMultiVariantData.variants };
          if (editingTemplateVariant) {
            const activeVariantData = {
              level: newEnemyLevel,
              hp_max: newEnemyHP,
              hp_current: newEnemyHP,
              rk: newEnemyVP,
              vp: newEnemyVP,
              ini: newEnemyIni,
              bw: newEnemyBW,
              ub: newEnemyUB,
              saves: newEnemySaves || undefined,
              immunities: newEnemyImmunities || undefined,
              senses: newEnemySenses || undefined,
              languages: newEnemyLanguages || undefined,
              attributes,
              skills: [
                { name: 'Wahrnehmung', value: newAttrWEI, passive: 10 + newAttrWEI },
                { name: 'Heimlichkeit', value: newAttrGES, passive: 10 + newAttrGES }
              ],
              attacks: newActions,
              traits: newTraits,
              actions: newActions,
              bonus_actions: newBonusActions,
              reactions: newReactions,
              legendary_actions: newLegendaryActions,
              lair_actions: newLairActions,
              regional_effects: newRegionalEffects || undefined
            };
            finalVariants[editingTemplateVariant] = activeVariantData;
          }

          const defaultVar = editingTemplateVariant || Object.keys(finalVariants)[0];
          updates = {
            name: newName,
            type: 'enemy',
            description: newDesc,
            notes: newNotes,
            image_url: newImageUrl || undefined,
            groesse: newEnemyGroesse || undefined,
            gewicht: newEnemyGewicht || undefined,
            menge: newEnemyMenge || undefined,
            verbreitung: newEnemyVerbreitung || undefined,
            is_multi_variant: true,
            default_variant: defaultVar,
            variants: finalVariants,
            attributes: [],
            skills: [],
            attacks: [],
            abilities: []
          };
        } else {
          // Single variant enemy template
          updates = {
            name: newName,
            type: 'enemy',
            description: newDesc,
            notes: newNotes,
            image_url: newImageUrl || undefined,
            groesse: newEnemyGroesse || undefined,
            gewicht: newEnemyGewicht || undefined,
            menge: newEnemyMenge || undefined,
            verbreitung: newEnemyVerbreitung || undefined,
            level: newEnemyLevel,
            hp_max: newEnemyHP,
            vp: newEnemyVP,
            rk: newEnemyVP,
            ini: newEnemyIni,
            bw: newEnemyBW,
            ub: newEnemyUB,
            saves: newEnemySaves || undefined,
            immunities: newEnemyImmunities || undefined,
            senses: newEnemySenses || undefined,
            languages: newEnemyLanguages || undefined,
            attributes,
            skills: [
              { name: 'Wahrnehmung', value: newAttrWEI, passive: 10 + newAttrWEI },
              { name: 'Heimlichkeit', value: newAttrGES, passive: 10 + newAttrGES }
            ],
            attacks: newActions,
            abilities: [],
            traits: newTraits,
            actions: newActions,
            bonus_actions: newBonusActions,
            reactions: newReactions,
            legendary_actions: newLegendaryActions,
            lair_actions: newLairActions,
            regional_effects: newRegionalEffects || undefined,
            is_multi_variant: false
          };
        }
      } else {
        // Social, Trap, or Hazard template
        let specificData = {};
        if (newType === 'social') {
          specificData = {
            role: newSocialRole || 'Unbekannt',
            faction: newSocialFaction || 'Keine',
            motivation: newSocialMotivation || 'Geheim',
            secrets: newSocialSecret || 'Keine Geheimnisse',
            key_skills: [],
            relationships: []
          };
        } else if (newType === 'trap') {
          specificData = {
            trigger: newTrapTrigger || 'Trittplatte',
            detection_dc: newTrapDetect,
            disarm_dc: newTrapDisarm,
            damage: newTrapDamage || '1D6 TP',
            cooldown: 'Einmalig'
          };
        } else if (newType === 'hazard') {
          specificData = {
            hazard_type: newHazardType || 'Magisch',
            severity: newHazardSeverity,
            effects: newHazardEffects || 'Keine besonderen Effekte.',
            avoidance: 'Zähigkeitsprobe',
            duration: 'Permanent'
          };
        }

        updates = {
          name: newName,
          type: newType,
          description: newDesc,
          notes: newNotes,
          image_url: newImageUrl || undefined,
          ...specificData,
          is_multi_variant: false
        };
      }

      await updateTemplate(editingTemplateId, updates);
      setEditingTemplateId(null);
      setEditingTemplateVariant(null);
    } else {
      // Original summoning flow (create element in deck)
      let payload: any = {};

      if (newType === 'enemy') {
        const attributes = [
          { name: "STÄ", value: newAttrSTA }, { name: "GES", value: newAttrGES }, { name: "KON", value: newAttrKON },
          { name: "INT", value: newAttrINT }, { name: "WEI", value: newAttrWEI }, { name: "CHA", value: newAttrCHA }
        ];

        // If we parsed a multi-variant template and checked "saveToTemplates"
        if (parsedMultiVariantData && parsedMultiVariantData.is_multi_variant) {
          const defaultVar = parsedMultiVariantData.default_variant || parsedMultiVariantData.variants_keys[0];
          const activeVariantData = parsedMultiVariantData.variants[defaultVar];

          payload = {
            name: `${parsedMultiVariantData.name} (${defaultVar})`,
            type: 'enemy',
            description: parsedMultiVariantData.description,
            notes: newNotes,
            image_url: parsedMultiVariantData.image_url || newImageUrl || undefined,
            groesse: parsedMultiVariantData.groesse || undefined,
            gewicht: parsedMultiVariantData.gewicht || undefined,
            menge: parsedMultiVariantData.menge || undefined,
            verbreitung: parsedMultiVariantData.verbreitung || undefined,
            level: activeVariantData.level,
            hp_max: activeVariantData.hp_max,
            hp_current: activeVariantData.hp_max,
            vp: activeVariantData.rk,
            rk: activeVariantData.rk,
            tp_formula: activeVariantData.tp_formula,
            bw: activeVariantData.bw,
            ub: activeVariantData.ub,
            senses: activeVariantData.senses,
            languages: activeVariantData.languages,
            ini: activeVariantData.ini,
            saves: activeVariantData.saves,
            immunities: activeVariantData.immunities,
            attributes: activeVariantData.attributes,
            skills: activeVariantData.skills,
            attacks: activeVariantData.attacks || [],
            abilities: [],
            traits: activeVariantData.traits,
            actions: activeVariantData.actions,
            bonus_actions: activeVariantData.bonus_actions,
            reactions: activeVariantData.reactions,
            legendary_actions: activeVariantData.legendary_actions,
            lair_actions: activeVariantData.lair_actions,
            regional_effects: activeVariantData.regional_effects,
            template_id: parsedMultiVariantData.id || `custom-${parsedMultiVariantData.name.toLowerCase().replace(/\s+/g, '-')}`,
            active_variant: defaultVar,
            variants_keys: parsedMultiVariantData.variants_keys,
            is_multi_variant: true
          };

          if (saveToTemplates) {
            const tplPayload = {
              id: parsedMultiVariantData.id || `custom-${parsedMultiVariantData.name.toLowerCase().replace(/\s+/g, '-')}`,
              name: parsedMultiVariantData.name,
              type: 'enemy',
              description: parsedMultiVariantData.description,
              notes: newNotes,
              image_url: parsedMultiVariantData.image_url || newImageUrl || undefined,
              groesse: parsedMultiVariantData.groesse || undefined,
              gewicht: parsedMultiVariantData.gewicht || undefined,
              menge: parsedMultiVariantData.menge || undefined,
              verbreitung: parsedMultiVariantData.verbreitung || undefined,
              is_multi_variant: true,
              default_variant: defaultVar,
              variants: parsedMultiVariantData.variants,
              attributes: [],
              skills: [],
              attacks: [],
              abilities: []
            };
            await addTemplate(tplPayload as any);
          }
        } else {
          // Single variant enemy payload
          payload = {
            name: newName,
            type: 'enemy',
            description: newDesc,
            notes: newNotes,
            image_url: newImageUrl || undefined,
            groesse: newEnemyGroesse || undefined,
            gewicht: newEnemyGewicht || undefined,
            menge: newEnemyMenge || undefined,
            verbreitung: newEnemyVerbreitung || undefined,
            level: newEnemyLevel,
            hp_max: newEnemyHP,
            hp_current: newEnemyHP,
            vp: newEnemyVP,
            rk: newEnemyVP,
            ini: newEnemyIni,
            bw: newEnemyBW,
            ub: newEnemyUB,
            saves: newEnemySaves || undefined,
            immunities: newEnemyImmunities || undefined,
            senses: newEnemySenses || undefined,
            languages: newEnemyLanguages || undefined,
            attributes,
            skills: [
              { name: 'Wahrnehmung', value: newAttrWEI, passive: 10 + newAttrWEI },
              { name: 'Heimlichkeit', value: newAttrGES, passive: 10 + newAttrGES }
            ],
            attacks: newActions,
            abilities: [],
            traits: newTraits,
            actions: newActions,
            bonus_actions: newBonusActions,
            reactions: newReactions,
            legendary_actions: newLegendaryActions,
            lair_actions: newLairActions,
            regional_effects: newRegionalEffects || undefined
          };

          if (saveToTemplates) {
            const tplPayload = {
              name: newName,
              type: 'enemy',
              description: newDesc,
              notes: newNotes,
              image_url: newImageUrl || undefined,
              groesse: newEnemyGroesse || undefined,
              gewicht: newEnemyGewicht || undefined,
              menge: newEnemyMenge || undefined,
              verbreitung: newEnemyVerbreitung || undefined,
              level: newEnemyLevel,
              hp_max: newEnemyHP,
              vp: newEnemyVP,
              rk: newEnemyVP,
              ini: newEnemyIni,
              bw: newEnemyBW,
              ub: newEnemyUB,
              saves: newEnemySaves || undefined,
              immunities: newEnemyImmunities || undefined,
              senses: newEnemySenses || undefined,
              languages: newEnemyLanguages || undefined,
              attributes,
              skills: payload.skills,
              attacks: newActions,
              abilities: [],
              traits: newTraits,
              actions: newActions,
              bonus_actions: newBonusActions,
              reactions: newReactions,
              legendary_actions: newLegendaryActions,
              lair_actions: newLairActions,
              regional_effects: newRegionalEffects || undefined,
              is_multi_variant: false
            };
            await addTemplate(tplPayload as any);
          }
        }
      } else {
        // Social, Trap, or Hazard
        let specificData = {};
        if (newType === 'social') {
          specificData = {
            role: newSocialRole || 'Unbekannt',
            faction: newSocialFaction || 'Keine',
            motivation: newSocialMotivation || 'Geheim',
            secrets: newSocialSecret || 'Keine Geheimnisse',
            key_skills: [],
            relationships: []
          };
        } else if (newType === 'trap') {
          specificData = {
            trigger: newTrapTrigger || 'Trittplatte',
            detection_dc: newTrapDetect,
            disarm_dc: newTrapDisarm,
            damage: newTrapDamage || '1D6 TP',
            cooldown: 'Einmalig'
          };
        } else if (newType === 'hazard') {
          specificData = {
            hazard_type: newHazardType || 'Magisch',
            severity: newHazardSeverity,
            effects: newHazardEffects || 'Keine besonderen Effekte.',
            avoidance: 'Zähigkeitsprobe',
            duration: 'Permanent'
          };
        }

        payload = {
          name: newName,
          type: newType,
          description: newDesc,
          notes: newNotes,
          image_url: newImageUrl || undefined,
          ...specificData
        };

        if (saveToTemplates) {
          const tplPayload = {
            ...payload,
            is_multi_variant: false
          };
          await addTemplate(tplPayload as any);
        }
      }

      await addElement(payload as any);
    }

    // Reset Form & Form states
    setNewName('');
    setNewDesc('');
    setNewNotes('');
    setNewImageUrl('');
    setNewEnemyHP(30);
    setNewEnemyVP(10);
    setNewEnemyIni(10);
    setNewEnemyLevel('HG 1');
    setNewEnemyBW('9 m');
    setNewEnemyUB(2);
    setNewEnemySaves('');
    setNewEnemyImmunities('');
    setNewEnemySenses('Dunkelsicht 36 m');
    setNewEnemyLanguages('Gemeinsprache');
    
    setNewEnemyGroesse('');
    setNewEnemyGewicht('');
    setNewEnemyMenge('');
    setNewEnemyVerbreitung('');

    setNewAttrSTA(0);
    setNewAttrGES(0);
    setNewAttrKON(0);
    setNewAttrINT(0);
    setNewAttrWEI(0);
    setNewAttrCHA(0);

    setNewTraits([]);
    setNewActions([]);
    setNewBonusActions([]);
    setNewReactions([]);
    setNewLegendaryActions([]);
    setNewLairActions([]);
    setNewRegionalEffects('');

    setNewSocialRole('');
    setNewSocialFaction('');
    setNewSocialMotivation('');
    setNewSocialSecret('');
    setNewTrapTrigger('');
    setNewTrapDamage('');
    setNewHazardType('');
    setNewHazardEffects('');

    setRawBestiaryText('');
    setParserSuccess('');
    setParserError('');
    setParsedMultiVariantData(null);
    setSaveToTemplates(false);

    setShowAddForm(false);
  };

  const addTempTrait = () => {
    if (!tempTraitName.trim()) return;
    setNewTraits([...newTraits, { name: tempTraitName, description: tempTraitDesc }]);
    setTempTraitName('');
    setTempTraitDesc('');
  };

  const removeTempTrait = (idx: number) => {
    setNewTraits(newTraits.filter((_, i) => i !== idx));
  };

  const addTempAction = () => {
    if (!tempActionName.trim()) return;
    setNewActions([...newActions, {
      name: tempActionName,
      type: tempActionType,
      at: tempActionAt,
      damage: tempActionDmg,
      description: tempActionDesc
    }]);
    setTempActionName('');
    setTempActionDesc('');
    setTempActionDmg('1D6');
    setTempActionAt(4);
  };

  const removeTempAction = (idx: number) => {
    setNewActions(newActions.filter((_, i) => i !== idx));
  };

  const filteredElements = elements.filter(el => {
    const matchesSearch = el.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      el.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || el.type === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">

      {/* HEADER */}
      <header className="border-b border-slate-800 bg-[#131b2e]/60 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shadow-md shadow-amber-900/10 shrink-0">
            M
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-display uppercase leading-tight">
              Myranor Encra
            </h1>
            <p className="text-[0.6875rem] text-slate-400 uppercase tracking-widest font-semibold hidden sm:block">ENCRA ENcounter + CReature Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-400 font-medium">Spielleiter</p>
            <p className="text-sm font-semibold text-slate-200">{user?.email}</p>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 sm:p-2.5 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Einstellungen"
            id="btn-settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => signOut()}
            className="p-2 sm:px-4 sm:py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            id="btn-sign-out"
            title="Ausloggen"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Ausloggen</span>
          </button>
        </div>
      </header>

      {/* DASHBOARD ACTIONS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">

        {/* UPPER ROW: SEARCH AND FILTERS */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* TAB FILTERS */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl w-full md:w-auto">
            {(['all', 'enemy', 'social', 'trap', 'hazard'] as const).map(tab => {
              const label = {
                all: 'Alle',
                enemy: 'Gegner',
                social: 'Soziale NPCs',
                trap: 'Fallen',
                hazard: 'Umweltgefahren'
              }[tab];

              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${isActive
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* SEARCH & ADD ACTION */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <div className="relative flex-1 md:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all text-xs"
              />
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all"
            >
              <span>+ Element</span>
            </button>
          </div>
        </div>
        {/* QUICK ADD DRAWER / COMPONENT */}
        {showAddForm && (() => {
          return (
            <div className="bg-[#131b2e]/85 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 shadow-xl animate-fade-in space-y-6">
              <h3 className="text-lg font-bold text-amber-400 border-b border-slate-800 pb-3 flex items-center justify-between">
                <span>Neues RPG-Element beschwören</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-200 text-sm font-semibold cursor-pointer"
                >
                  Abbrechen
                </button>
              </h3>

              {/* MAIN CREATOR TABS */}
              <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
                {[
                  { id: 'template', label: '✨ Aus Vorlage' },
                  { id: 'parser', label: '📖 Text-Import (Bestiarium)' },
                  { id: 'manual', label: '✍️ Manuell erstellen' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCreatorTab(tab.id as any);
                      setParserError('');
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${creatorTab === tab.id
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-900/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: TEMPLATE SELECTION */}
              {creatorTab === 'template' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>✨</span> Wähle ein Monster oder Element
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Vorlage wählen</label>
                        <select
                          value={selectedTemplateId}
                          onChange={e => handleTemplateChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 text-xs font-semibold"
                        >
                          <option value="">-- Keine Vorlage --</option>
                          {(() => {
                            const official = templates.filter(t => !t.user_id);
                            const custom = templates.filter(t => t.user_id);
                            return (
                              <>
                                {official.length > 0 && (
                                  <optgroup label="Offizielle Monster">
                                    {official.map((t: any) => (
                                      <option key={t.id} value={t.id}>{t.name} (HG {t.level || t.variants?.[Object.keys(t.variants)[0]]?.level || '?'})</option>
                                    ))}
                                  </optgroup>
                                )}
                                {custom.length > 0 && (
                                  <optgroup label="Eigene Vorlagen">
                                    {custom.map((t: any) => (
                                      <option key={t.id} value={t.id}>{t.name} (Custom)</option>
                                    ))}
                                  </optgroup>
                                )}
                              </>
                            );
                          })()}
                        </select>
                      </div>

                      {/* Variant Selection */}
                      {selectedTemplateId && (() => {
                        const t = templates.find((tmp: any) => tmp.id === selectedTemplateId) as any;
                        return t && t.is_multi_variant ? (
                          <div>
                            <label className="block text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Kategorie / Variante</label>
                            <select
                              value={selectedVariant}
                              onChange={e => setSelectedVariant(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 text-xs font-semibold"
                            >
                              {Object.keys(t.variants).map(v => (
                                <option key={v} value={v}>{v} ({t.variants[v].level})</option>
                              ))}
                            </select>
                          </div>
                        ) : null;
                      })()}

                      <div className={
                        (() => {
                          const t = templates.find((tmp: any) => tmp.id === selectedTemplateId) as any;
                          return t && t.is_multi_variant ? "col-span-1" : "col-span-1 sm:col-span-2";
                        })()
                      }>
                        <button
                          type="button"
                          disabled={!selectedTemplateId}
                          onClick={handleAddFromTemplate}
                          className="w-full px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-800 disabled:border text-slate-950 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer disabled:cursor-not-allowed"
                        >
                          Beschwörung ausführen
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Manage Custom Templates Section */}
                  {(() => {
                    const custom = templates.filter(t => t.user_id);
                    if (custom.length === 0) return null;
                    return (
                      <div className="border-t border-slate-800/80 pt-4">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">Eigene Vorlagen verwalten</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                          {custom.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs hover:border-slate-700/80 transition-all">
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-200">{t.name}</p>
                                <p className="text-[0.6875rem] text-slate-400 font-medium uppercase tracking-wider">
                                  {{ enemy: 'Gegner', social: 'Sozialer NPC', trap: 'Falle', hazard: 'Gefahr' }[t.type as EncounterElementType]}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditTemplate(t)}
                                  className="text-amber-400 hover:text-amber-300 font-semibold px-2 py-1 rounded hover:bg-amber-500/10 transition-all text-[0.6875rem] uppercase tracking-wider border border-amber-500/20"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteTemplate(t.id)}
                                  className="text-red-400 hover:text-red-300 font-semibold px-2 py-1 rounded hover:bg-red-500/10 transition-all text-[0.6875rem] uppercase tracking-wider border border-red-500/20"
                                >
                                  Löschen
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: TEXT IMPORT */}
              {creatorTab === 'parser' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📖</span> Raw Text importieren
                    </h4>
                    <p className="text-xs text-slate-400">
                      Kopiere den Text eines Monsters aus dem Bestiarium (inklusive Name in Zeile 1 und Varianten in Zeile 2). Der Parser zerlegt den Text in Stats, Saves, Attribute und Aktionen.
                    </p>
                  </div>

                  {parserError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {parserError}
                    </div>
                  )}

                  <textarea
                    rows={8}
                    value={rawBestiaryText}
                    onChange={e => setRawBestiaryText(e.target.value)}
                    placeholder="Chrattac-Königin&#10;Jungkönigin/Königin&#10;Große/riesige Monstrosität&#10;Herausforderungsgrad 11 (7.200 EP) / 18 (20.000 EP)&#10;Rüstungsklasse 19 (natürliche Rüstung)&#10;Trefferpunkte 189 (14W10+112)..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-amber-500 text-xs font-mono leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={handleParseText}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                  >
                    Text analysieren & Formular befüllen
                  </button>
                </div>
              )}

              {/* TAB 3: UPGRADED MANUAL CREATION FORM */}
              {creatorTab === 'manual' && (
                <form onSubmit={handleCreate} className="space-y-5">
                  {editingTemplateId ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center justify-between flex-wrap gap-2 animate-fade-in">
                      <div>
                        Du bearbeitest gerade die Vorlage: <strong className="text-slate-100">{newName}</strong> (ID: {editingTemplateId}).
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplateId(null);
                          setEditingTemplateVariant(null);
                          setParsedMultiVariantData(null);
                          // Reset Form & Form states
                          setNewName('');
                          setNewDesc('');
                          setNewNotes('');
                          setNewImageUrl('');
                          setNewEnemyHP(30);
                          setNewEnemyVP(10);
                          setNewEnemyIni(10);
                          setNewEnemyLevel('HG 1');
                          setNewEnemyBW('9 m');
                          setNewEnemyUB(2);
                          setNewEnemySaves('');
                          setNewEnemyImmunities('');
                          setNewEnemySenses('Dunkelsicht 36 m');
                          setNewEnemyLanguages('Gemeinsprache');

                          setNewEnemyGroesse('');
                          setNewEnemyGewicht('');
                          setNewEnemyMenge('');
                          setNewEnemyVerbreitung('');

                          setNewAttrSTA(0);
                          setNewAttrGES(0);
                          setNewAttrKON(0);
                          setNewAttrINT(0);
                          setNewAttrWEI(0);
                          setNewAttrCHA(0);

                          setNewTraits([]);
                          setNewActions([]);
                          setNewBonusActions([]);
                          setNewReactions([]);
                          setNewLegendaryActions([]);
                          setNewLairActions([]);
                          setNewRegionalEffects('');

                          setNewSocialRole('');
                          setNewSocialFaction('');
                          setNewSocialMotivation('');
                          setNewSocialSecret('');
                          setNewTrapTrigger('');
                          setNewTrapDamage('');
                          setNewHazardType('');
                          setNewHazardEffects('');
                        }}
                        className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all cursor-pointer text-[0.6875rem] uppercase tracking-wider"
                      >
                        Bearbeitung beenden (Leeres Formular)
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                            Vorlage kopieren / Formular leeren
                          </h4>
                          <p className="text-[0.6875rem] text-slate-400">
                            Kopiere Werte aus einer Vorlage als Basis für ein neues Element oder setze das Formular zurück.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewName('');
                            setNewDesc('');
                            setNewNotes('');
                            setNewImageUrl('');
                            setNewEnemyHP(30);
                            setNewEnemyVP(10);
                            setNewEnemyIni(10);
                            setNewEnemyLevel('HG 1');
                            setNewEnemyBW('9 m');
                            setNewEnemyUB(2);
                            setNewEnemySaves('');
                            setNewEnemyImmunities('');
                            setNewEnemySenses('Dunkelsicht 36 m');
                            setNewEnemyLanguages('Gemeinsprache');
                            
                            setNewEnemyGroesse('');
                            setNewEnemyGewicht('');
                            setNewEnemyMenge('');
                            setNewEnemyVerbreitung('');

                            setNewAttrSTA(0);
                            setNewAttrGES(0);
                            setNewAttrKON(0);
                            setNewAttrINT(0);
                            setNewAttrWEI(0);
                            setNewAttrCHA(0);

                            setNewTraits([]);
                            setNewActions([]);
                            setNewBonusActions([]);
                            setNewReactions([]);
                            setNewLegendaryActions([]);
                            setNewLairActions([]);
                            setNewRegionalEffects('');

                            setNewSocialRole('');
                            setNewSocialFaction('');
                            setNewSocialMotivation('');
                            setNewSocialSecret('');
                            setNewTrapTrigger('');
                            setNewTrapDamage('');
                            setNewHazardType('');
                            setNewHazardEffects('');

                            setParsedMultiVariantData(null);
                            setEditingTemplateVariant(null);
                          }}
                          className="px-2.5 py-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-350 font-bold transition-all cursor-pointer text-[0.6875rem] uppercase tracking-wider shrink-0"
                        >
                          Formular leeren
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1 border-t border-slate-900">
                        <div>
                          <label className="block text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Vorlage wählen</label>
                          <select
                            value={tempCopyTemplateId}
                            onChange={e => {
                              setTempCopyTemplateId(e.target.value);
                              const t = templates.find(tmp => tmp.id === e.target.value) as any;
                              if (t && t.is_multi_variant) {
                                setTempCopyVariantName(t.default_variant || Object.keys(t.variants)[0]);
                              } else {
                                setTempCopyVariantName('');
                              }
                            }}
                            className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 text-xs font-semibold"
                          >
                            <option value="">-- Keine Vorlage --</option>
                            {(() => {
                              const official = templates.filter(t => !t.user_id);
                              const custom = templates.filter(t => t.user_id);
                              return (
                                <>
                                  {official.length > 0 && (
                                    <optgroup label="Offizielle Monster">
                                      {official.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name} (HG {t.level || t.variants?.[Object.keys(t.variants)[0]]?.level || '?'})</option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {custom.length > 0 && (
                                    <optgroup label="Eigene Vorlagen">
                                      {custom.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name} (Custom)</option>
                                      ))}
                                    </optgroup>
                                  )}
                                </>
                              );
                            })()}
                          </select>
                        </div>

                        {tempCopyTemplateId && (() => {
                          const t = templates.find(tmp => tmp.id === tempCopyTemplateId) as any;
                          return t && t.is_multi_variant ? (
                            <div>
                              <label className="block text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Variante wählen</label>
                              <select
                                value={tempCopyVariantName}
                                onChange={e => setTempCopyVariantName(e.target.value)}
                                className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 text-xs font-semibold"
                              >
                                {Object.keys(t.variants).map(v => (
                                  <option key={v} value={v}>{v} ({t.variants[v].level})</option>
                                ))}
                              </select>
                            </div>
                          ) : null;
                        })()}

                        <div className={
                          (() => {
                            const t = templates.find(tmp => tmp.id === tempCopyTemplateId) as any;
                            return t && t.is_multi_variant ? "col-span-1" : "col-span-1 sm:col-span-2";
                          })()
                        }>
                          <button
                            type="button"
                            disabled={!tempCopyTemplateId}
                            onClick={() => handleCopyTemplateStats(tempCopyTemplateId, tempCopyVariantName)}
                            className="w-full px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-slate-900 disabled:text-slate-650 disabled:border-slate-800 disabled:border text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed"
                          >
                            Vorlage reinkopieren
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {parserSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex justify-between items-center animate-fade-in">
                      <span className="font-semibold">{parserSuccess}</span>
                      <button type="button" onClick={() => setParserSuccess('')} className="text-emerald-500 hover:text-slate-200 font-bold text-sm">×</button>
                    </div>
                  )}

                  {parsedMultiVariantData && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                      <span className="font-bold">⚠️ Multi-Varianten Kreatur geladen:</span> Beim Erschaffen wird standardmäßig die Variante <span className="underline font-bold">"{parsedMultiVariantData.default_variant}"</span> als aktives Element erzeugt. Wenn du "Speichern" aktivierst, wird die komplette Multi-Varianten Struktur in deinen Vorlagen abgelegt!
                    </div>
                  )}

                  {/* General Row: Type & Name */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[0.6875rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">RPG-Typ</label>
                      <select
                        value={newType}
                        onChange={e => setNewType(e.target.value as EncounterElementType)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 text-xs font-semibold"
                      >
                        <option value="enemy">Gegner (Enemy NPC)</option>
                        <option value="social">Sozialer NPC</option>
                        <option value="trap">Falle</option>
                        <option value="hazard">Gefahr / Umwelt</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[0.6875rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Name</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="z.B. Myranische Riesenspinne..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-amber-500 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Beschreibung</label>
                    <textarea
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      placeholder="Hintergrund, Aussehen, Verhalten..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-amber-500 text-xs leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.6875rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Bild (Optional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[0.625rem] text-slate-550 font-bold uppercase tracking-wider mb-1">Bild-URL</span>
                        <input
                          type="text"
                          value={newImageUrl}
                          onChange={e => setNewImageUrl(e.target.value)}
                          placeholder="z.B. /images/verkuender.png oder HTTPS Link..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-amber-500 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <span className="block text-[0.625rem] text-slate-550 font-bold uppercase tracking-wider mb-1">Datei hochladen (Sicher & Privat)</span>
                        {user ? (
                          <div className="flex items-center gap-2">
                            <label className="flex-1 flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl cursor-pointer text-xs font-semibold transition-all relative">
                              {uploading ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4 border-2 border-slate-650 border-t-amber-500 rounded-full animate-spin" />
                                  Lädt hoch...
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  Bild auswählen (WebP)
                                </span>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                            {newImageUrl && newImageUrl.startsWith('user-uploads/') && (
                              <button
                                type="button"
                                onClick={() => setNewImageUrl('')}
                                className="p-2 border border-slate-800 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-xl transition-all"
                                title="Bild entfernen"
                              >
                                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="px-4 py-2 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs font-medium">
                            Melde dich an, um Bilder sicher hochzuladen.
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Upload Preview */}
                    {newImageUrl && (
                      <div className="mt-3 flex items-center gap-3 p-2 bg-slate-900/35 border border-slate-800/60 rounded-xl w-fit">
                        <img
                          src={getImageUrl(newImageUrl)}
                          alt="Vorschau"
                          className="w-14 h-14 object-cover rounded-lg border border-slate-800/80"
                        />
                        <div className="text-[0.6875rem] space-y-0.5 pr-2">
                          <span className="text-slate-500 font-extrabold block uppercase tracking-wider">Bild-Vorschau</span>
                          <span className="text-slate-350 font-semibold truncate block max-w-xs">{newImageUrl}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ENEMY-SPECIFIC UPGRADED FORMS WITH SUB-TABS */}
                  {newType === 'enemy' && (
                    <div className="space-y-4 border border-slate-800/80 rounded-2xl p-4 bg-slate-900/20">
                      {/* Variant Manager */}
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-900 pb-2.5">
                          <div>
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">
                              Varianten-Verwaltung
                            </h4>
                            <p className="text-[0.6875rem] text-slate-400">
                              Erstelle verschiedene Varianten für diese Vorlage (z.B. Mittelschwer, Schwer, Boss)
                            </p>
                          </div>
                          {!parsedMultiVariantData ? (
                            <button
                              type="button"
                              onClick={() => {
                                const currentVariantName = newEnemyLevel || 'Standard';
                                const currentVariantData = {
                                  level: newEnemyLevel,
                                  hp_max: newEnemyHP,
                                  hp_current: newEnemyHP,
                                  rk: newEnemyVP,
                                  vp: newEnemyVP,
                                  ini: newEnemyIni,
                                  bw: newEnemyBW,
                                  ub: newEnemyUB,
                                  saves: newEnemySaves || undefined,
                                  immunities: newEnemyImmunities || undefined,
                                  senses: newEnemySenses || undefined,
                                  languages: newEnemyLanguages || undefined,
                                  attributes: [
                                    { name: "STÄ", value: newAttrSTA },
                                    { name: "GES", value: newAttrGES },
                                    { name: "KON", value: newAttrKON },
                                    { name: "INT", value: newAttrINT },
                                    { name: "WEI", value: newAttrWEI },
                                    { name: "CHA", value: newAttrCHA }
                                  ],
                                  skills: [
                                    { name: 'Wahrnehmung', value: newAttrWEI, passive: 10 + newAttrWEI },
                                    { name: 'Heimlichkeit', value: newAttrGES, passive: 10 + newAttrGES }
                                  ],
                                  attacks: newActions,
                                  traits: newTraits,
                                  actions: newActions,
                                  bonus_actions: newBonusActions,
                                  reactions: newReactions,
                                  legendary_actions: newLegendaryActions,
                                  lair_actions: newLairActions,
                                  regional_effects: newRegionalEffects || undefined
                                };

                                setParsedMultiVariantData({
                                  name: newName || 'Neue Vorlage',
                                  type: 'enemy',
                                  description: newDesc,
                                  notes: newNotes,
                                  is_multi_variant: true,
                                  default_variant: currentVariantName,
                                  variants: {
                                    [currentVariantName]: currentVariantData
                                  },
                                  variants_keys: [currentVariantName]
                                });
                                setEditingTemplateVariant(currentVariantName);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-400 hover:bg-amber-500/25 text-[0.6875rem] font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              🔀 Varianten-System aktivieren
                            </button>
                          ) : (
                            <span className="text-[0.625rem] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full font-bold uppercase tracking-wider">
                              Multi-Varianten Aktiv
                            </span>
                          )}
                        </div>

                        {parsedMultiVariantData && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Switch & Delete */}
                            <div className="flex items-end gap-2.5">
                              <div className="flex-1">
                                <label className="block text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                  Aktive Variante bearbeiten
                                </label>
                                <select
                                  value={editingTemplateVariant || ''}
                                  onChange={e => handleSwitchEditVariant(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs font-semibold focus:outline-none focus:border-amber-500"
                                >
                                  {Object.keys(parsedMultiVariantData.variants || {}).map(v => (
                                    <option key={v} value={v}>
                                      {v} ({parsedMultiVariantData.variants[v]?.level || 'HG ?'})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteVariant(editingTemplateVariant || '')}
                                className="px-3 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/15 text-xs font-semibold transition-all cursor-pointer shrink-0"
                                title="Diese Variante löschen"
                              >
                                Löschen
                              </button>
                            </div>

                            {/* Add New Variant */}
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <label className="block text-[0.625rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                                  Neue Variante hinzufügen
                                </label>
                                <input
                                  type="text"
                                  placeholder="z.B. Mittelschwer, Schwer..."
                                  value={newVariantNameInput}
                                  onChange={e => setNewVariantNameInput(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleAddNewVariant}
                                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0"
                              >
                                Hinzufügen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sub-tab navigation */}
                      <div className="flex flex-wrap gap-1 p-1 bg-slate-950 border border-slate-800/60 rounded-xl max-w-lg">
                        {[
                          { id: 'stats', label: 'Stats & Schutz' },
                          { id: 'attributes', label: 'Hauptattribute' },
                          { id: 'traits', label: 'Eigenschaften' },
                          { id: 'actions', label: 'Aktionen & Skills' }
                        ].map(sub => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setManualSubTab(sub.id as any)}
                            className={`flex-1 py-1.5 rounded-lg font-bold text-[0.6875rem] uppercase tracking-wider transition-all cursor-pointer ${manualSubTab === sub.id
                                ? 'bg-[#1e293b] text-amber-400 border border-slate-700/50'
                                : 'text-slate-400 hover:text-slate-200'
                              }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>

                      {/* Sub-Tab Content: STATS & SCHUTZ */}
                      {manualSubTab === 'stats' && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Stufe / HG</label>
                              <input
                                type="text"
                                value={newEnemyLevel}
                                onChange={e => setNewEnemyLevel(e.target.value)}
                                placeholder="z.B. HG 3"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Trefferpunkte (TP)</label>
                              <input
                                type="number"
                                value={newEnemyHP}
                                onChange={e => setNewEnemyHP(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Rüstungsklasse (RK)</label>
                              <input
                                type="number"
                                value={newEnemyVP}
                                onChange={e => setNewEnemyVP(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Initiative (INI)</label>
                              <input
                                type="number"
                                value={newEnemyIni}
                                onChange={e => setNewEnemyIni(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Bewegungsrate (BW)</label>
                              <input
                                type="text"
                                value={newEnemyBW}
                                onChange={e => setNewEnemyBW(e.target.value)}
                                placeholder="z.B. 9 m, Fliegen 18 m"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Übungsbonus (UB)</label>
                              <input
                                type="number"
                                value={newEnemyUB}
                                onChange={e => setNewEnemyUB(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Rettungswürfe (Saves)</label>
                              <input
                                type="text"
                                value={newEnemySaves}
                                onChange={e => setNewEnemySaves(e.target.value)}
                                placeholder="z.B. INT +12, WEI +9"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Immunitäten</label>
                              <input
                                type="text"
                                value={newEnemyImmunities}
                                onChange={e => setNewEnemyImmunities(e.target.value)}
                                placeholder="z.B. Blitz, Schall"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Sinne</label>
                              <input
                                type="text"
                                value={newEnemySenses}
                                onChange={e => setNewEnemySenses(e.target.value)}
                                placeholder="z.B. Dunkelsicht 36 m"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Sprachen</label>
                              <input
                                type="text"
                                value={newEnemyLanguages}
                                onChange={e => setNewEnemyLanguages(e.target.value)}
                                placeholder="z.B. Drachisch"
                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs"
                              />
                            </div>
                          </div>

                          {/* Fluff-Attribute (Größe, Gewicht, Menge, Verbreitung) */}
                          <div className="border-t border-slate-800/60 pt-4 mt-4 space-y-4">
                            <h5 className="text-[0.6875rem] font-bold text-amber-500 uppercase tracking-widest">Fluff-Beschreibung (Optional)</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Größe</label>
                                <input
                                  type="text"
                                  value={newEnemyGroesse}
                                  onChange={e => setNewEnemyGroesse(e.target.value)}
                                  placeholder="z.B. 5 m Körperlänge"
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Gewicht</label>
                                <input
                                  type="text"
                                  value={newEnemyGewicht}
                                  onChange={e => setNewEnemyGewicht(e.target.value)}
                                  placeholder="z.B. 300 kg"
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Menge</label>
                                <input
                                  type="text"
                                  value={newEnemyMenge}
                                  onChange={e => setNewEnemyMenge(e.target.value)}
                                  placeholder="z.B. Einzelgänger"
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Verbreitung</label>
                                <input
                                  type="text"
                                  value={newEnemyVerbreitung}
                                  onChange={e => setNewEnemyVerbreitung(e.target.value)}
                                  placeholder="z.B. nahezu alle myranischen Laub- und Mischwälder, außer Amaunath"
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab Content: HAUPTATTRIBUTE */}
                      {manualSubTab === 'attributes' && (
                        <div className="space-y-3 animate-fade-in">
                          <p className="text-[0.6875rem] text-slate-450 uppercase tracking-wider font-semibold">Attributs-Modifikatoren (z.B. +4 oder -2)</p>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                            {[
                              { name: 'STÄ', val: newAttrSTA, set: setNewAttrSTA },
                              { name: 'GES', val: newAttrGES, set: setNewAttrGES },
                              { name: 'KON', val: newAttrKON, set: setNewAttrKON },
                              { name: 'INT', val: newAttrINT, set: setNewAttrINT },
                              { name: 'WEI', val: newAttrWEI, set: setNewAttrWEI },
                              { name: 'CHA', val: newAttrCHA, set: setNewAttrCHA }
                            ].map(a => (
                              <div key={a.name} className="text-center p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                                <label className="block text-[0.6875rem] font-extrabold text-amber-500 mb-1">{a.name}</label>
                                <input
                                  type="number"
                                  value={a.val}
                                  onChange={e => a.set(Number(e.target.value))}
                                  className="w-full text-center bg-transparent text-slate-100 text-xs font-bold focus:outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab Content: EIGENSCHAFTEN (TRAITS) */}
                      {manualSubTab === 'traits' && (
                        <div className="space-y-4 animate-fade-in">
                          {/* Current Traits List */}
                          {newTraits.length > 0 && (
                            <div className="space-y-2">
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Aktuelle Eigenschaften</label>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {newTraits.map((t, idx) => (
                                  <div key={idx} className="flex items-start justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs gap-3">
                                    <div className="space-y-0.5">
                                      <p className="font-bold text-amber-400">{t.name}</p>
                                      <p className="text-slate-350 text-xs leading-relaxed">{t.description}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeTempTrait(idx)}
                                      className="text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider text-[0.625rem] shrink-0 cursor-pointer"
                                    >
                                      Löschen
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Add Trait Form */}
                          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60 space-y-3">
                            <h5 className="text-[0.6875rem] font-bold text-amber-500 uppercase tracking-widest">Eigenschaft hinzufügen</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-1">
                                <input
                                  type="text"
                                  placeholder="Name (z.B. Amphibisch)"
                                  value={tempTraitName}
                                  onChange={e => setTempTraitName(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200"
                                />
                              </div>
                              <div className="sm:col-span-2 flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Beschreibung..."
                                  value={tempTraitDesc}
                                  onChange={e => setTempTraitDesc(e.target.value)}
                                  className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={addTempTrait}
                                  className="px-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sub-Tab Content: AKTIONEN & ATTACKS */}
                      {manualSubTab === 'actions' && (
                        <div className="space-y-4 animate-fade-in">
                          {/* Current Actions List */}
                          {newActions.length > 0 && (
                            <div className="space-y-2">
                              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Aktuelle Aktionen</label>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {newActions.map((a, idx) => (
                                  <div key={idx} className="flex items-start justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs gap-3">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-red-400">{a.name}</span>
                                        <span className="text-[0.625rem] px-1.5 py-0.5 bg-slate-800 rounded font-semibold text-slate-400">{a.type}</span>
                                        {a.damage && <span className="text-[0.6875rem] text-red-300 font-medium">({a.damage})</span>}
                                      </div>
                                      <p className="text-slate-350 text-xs leading-relaxed">{a.description}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeTempAction(idx)}
                                      className="text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider text-[0.625rem] shrink-0 cursor-pointer"
                                    >
                                      Löschen
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Add Action Form */}
                          <div className="p-3.5 rounded-xl bg-slate-955 border border-slate-800/60 space-y-3">
                            <h5 className="text-[0.6875rem] font-bold text-amber-500 uppercase tracking-widest">Aktion/Angriff hinzufügen</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <input
                                  type="text"
                                  placeholder="Name (z.B. Biss)"
                                  value={tempActionName}
                                  onChange={e => setTempActionName(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 font-bold"
                                />
                              </div>
                              <div>
                                <select
                                  value={tempActionType}
                                  onChange={e => setTempActionType(e.target.value as any)}
                                  className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 font-semibold"
                                >
                                  <option value="NK">Nahkampf (NK)</option>
                                  <option value="FK">Fernkampf (FK)</option>
                                </select>
                              </div>
                              <div>
                                <input
                                  type="number"
                                  placeholder="Angriffs-Bonus"
                                  value={tempActionAt}
                                  onChange={e => setTempActionAt(Number(e.target.value))}
                                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  placeholder="Schaden (z.B. 2W10+4)"
                                  value={tempActionDmg}
                                  onChange={e => setTempActionDmg(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Zusätzliche Angriffs-Beschreibung..."
                                value={tempActionDesc}
                                onChange={e => setTempActionDesc(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200"
                              />
                              <button
                                type="button"
                                onClick={addTempAction}
                                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-955 text-xs font-bold uppercase tracking-wider shrink-0 cursor-pointer"
                              >
                                Hinzufügen
                              </button>
                            </div>
                          </div>

                          {/* Regional effects input */}
                          <div>
                            <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Regionale Effekte (Text)</label>
                            <textarea
                              value={newRegionalEffects}
                              onChange={e => setNewRegionalEffects(e.target.value)}
                              placeholder="Effekte im Territorium der Kreatur..."
                              rows={2}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs leading-relaxed focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SOCIAL FORM */}
                  {newType === 'social' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-fade-in">
                      <div>
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Rolle / Beruf</label>
                        <input
                          type="text"
                          value={newSocialRole}
                          onChange={e => setNewSocialRole(e.target.value)}
                          placeholder="z.B. Senator, Gladiator, Schmied"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Fraktion</label>
                        <input
                          type="text"
                          value={newSocialFaction}
                          onChange={e => setNewSocialFaction(e.target.value)}
                          placeholder="z.B. Haus der Optimaten, Gilde..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Motivation</label>
                        <input
                          type="text"
                          value={newSocialMotivation}
                          onChange={e => setNewSocialMotivation(e.target.value)}
                          placeholder="Was treibt die Person an?"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Geheimnis (DM Info)</label>
                        <input
                          type="text"
                          value={newSocialSecret}
                          onChange={e => setNewSocialSecret(e.target.value)}
                          placeholder="Verborgene Information..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* TRAP FORM */}
                  {newType === 'trap' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-fade-in">
                      <div className="md:col-span-2">
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Auslöser</label>
                        <input
                          type="text"
                          value={newTrapTrigger}
                          onChange={e => setNewTrapTrigger(e.target.value)}
                          placeholder="Druckplatte, Stolperdraht..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Entdecken (Probe)</label>
                        <input
                          type="number"
                          value={newTrapDetect}
                          onChange={e => setNewTrapDetect(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Entschärfen (Probe)</label>
                        <input
                          type="number"
                          value={newTrapDisarm}
                          onChange={e => setNewTrapDisarm(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Schaden / Effekt</label>
                        <input
                          type="text"
                          value={newTrapDamage}
                          onChange={e => setNewTrapDamage(e.target.value)}
                          placeholder="z.B. 2D6 TP + Steinschlag"
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* HAZARD FORM */}
                  {newType === 'hazard' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-fade-in">
                      <div>
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Gefahrenart</label>
                        <input
                          type="text"
                          value={newHazardType}
                          onChange={e => setNewHazardType(e.target.value)}
                          placeholder="Magisch, Hitze, Einsturz..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Bedrohungsstufe</label>
                        <select
                          value={newHazardSeverity}
                          onChange={e => setNewHazardSeverity(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        >
                          <option value="Gering">Gering</option>
                          <option value="Moderat">Moderat</option>
                          <option value="Schwer">Schwer</option>
                          <option value="Tödlich">Tödlich</option>
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 mb-1">Auswirkungen</label>
                        <input
                          type="text"
                          value={newHazardEffects}
                          onChange={e => setNewHazardEffects(e.target.value)}
                          placeholder="Mechanische Auswirkung, Probenerschwernis..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[0.6875rem] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">DM Notizen (Nur für dich sichtbar)</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={e => setNewNotes(e.target.value)}
                      placeholder="Verhalten, Taktiken oder Beute..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>

                  {/* SAVE TO TEMPLATES CHECKBOX */}
                  {!editingTemplateId && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 max-w-sm">
                      <input
                        type="checkbox"
                        id="chk-save-template"
                        checked={saveToTemplates}
                        onChange={e => setSaveToTemplates(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-800 text-amber-500 bg-slate-900 focus:ring-amber-500"
                      />
                      <label htmlFor="chk-save-template" className="text-xs font-bold text-slate-350 cursor-pointer select-none">
                        In meiner Vorlagen-Datenbank speichern
                      </label>
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                    >
                      {editingTemplateId ? 'Vorlage speichern' : 'Beschwörung abschließen'}
                    </button>
                    {editingTemplateId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplateId(null);
                          setEditingTemplateVariant(null);
                          setParsedMultiVariantData(null);
                          // Reset Form & Form states
                          setNewName('');
                          setNewDesc('');
                          setNewNotes('');
                          setNewEnemyHP(30);
                          setNewEnemyVP(10);
                          setNewEnemyIni(10);
                          setNewEnemyLevel('HG 1');
                          setNewEnemyBW('9 m');
                          setNewEnemyUB(2);
                          setNewEnemySaves('');
                          setNewEnemyImmunities('');
                          setNewEnemySenses('Dunkelsicht 36 m');
                          setNewEnemyLanguages('Gemeinsprache');

                           setNewEnemyGroesse('');
                           setNewEnemyGewicht('');
                           setNewEnemyMenge('');
                           setNewEnemyVerbreitung('');

                          setNewAttrSTA(0);
                          setNewAttrGES(0);
                          setNewAttrKON(0);
                          setNewAttrINT(0);
                          setNewAttrWEI(0);
                          setNewAttrCHA(0);

                          setNewTraits([]);
                          setNewActions([]);
                          setNewBonusActions([]);
                          setNewReactions([]);
                          setNewLegendaryActions([]);
                          setNewLairActions([]);
                          setNewRegionalEffects('');

                          setNewSocialRole('');
                          setNewSocialFaction('');
                          setNewSocialMotivation('');
                          setNewSocialSecret('');
                          setNewTrapTrigger('');
                          setNewTrapDamage('');
                          setNewHazardType('');
                          setNewHazardEffects('');

                          setRawBestiaryText('');
                          setParserSuccess('');
                          setParserError('');
                          setSaveToTemplates(false);

                          setShowAddForm(false);
                        }}
                        className="px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-350 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          );
        })()}

        {/* LOADING INDICATOR */}
        {loadingElements ? (
          <div className="py-20 text-center text-slate-400 space-y-4">
            <div className="w-12 h-12 border-3 border-slate-800 border-t-amber-500 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold tracking-widest uppercase">Rufe Datenbank ab...</p>
          </div>
        ) : filteredElements.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-base font-bold text-slate-300">Keine Elemente gefunden</h4>
            <p className="text-xs text-slate-500 mt-1">Ändere deine Filter oder erstelle ein neues Element.</p>
          </div>
        ) : (
          /* ELEMENTS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredElements.map((el: EncounterElement) => {

              // Define Type Tag styling
              const tagColors = {
                enemy: 'bg-red-500/10 border-red-500/30 text-red-400',
                social: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                trap: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
                hazard: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }[el.type];

              const tagLabel = {
                enemy: 'Gegner',
                social: 'Sozialer NPC',
                trap: 'Falle',
                hazard: 'Gefahr'
              }[el.type];

              return (
                <div
                  key={el.id}
                  className="bg-[#131b2e]/60 border border-slate-800 hover:border-slate-700/85 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all hover:translate-y-[-2px] group"
                >
                  <div>
                    {el.image_url && (
                      <div className="w-full h-32 mb-4 overflow-hidden rounded-xl border border-slate-800/80">
                        <img
                          src={getImageUrl(el.image_url)}
                          alt={el.name}
                          onClick={() => setActiveLightboxImage(el.image_url || null)}
                          className="object-cover w-full h-full cursor-pointer hover:opacity-90 transition-all duration-200"
                        />
                      </div>
                    )}
                    {/* Header: Name and Type Tag */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[0.625rem] font-extrabold uppercase px-2.5 py-1 rounded-full border ${tagColors}`}>
                            {tagLabel}
                          </span>
                          {el.type === 'enemy' && el.is_multi_variant && el.active_variant && (
                            <select
                              value={el.active_variant}
                              onChange={(e) => handleCardVariantChange(el.id, e.target.value)}
                              className="text-[0.625rem] font-extrabold uppercase px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 focus:outline-none cursor-pointer hover:bg-amber-500/20 transition-all"
                            >
                              {el.variants_keys?.map(v => (
                                <option key={v} value={v} className="bg-slate-900 text-slate-200">{v}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-100 font-display tracking-tight group-hover:text-amber-400 transition-colors">
                          {el.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => deleteElement(el.id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800/40 transition-colors shrink-0"
                        title="Element löschen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <p className="text-xs text-slate-350 leading-relaxed mb-4">
                      {el.description}
                    </p>

                    {/* TYPE-SPECIFIC DETAIL PANELS */}
                    {el.type === 'enemy' && (
                      <div className="space-y-4 border-t border-slate-800/60 pt-4 text-xs">
                        {/* Fluff Attributes Grid */}
                        {(el.groesse || el.gewicht || el.menge || el.verbreitung) && (
                          <div className="grid grid-cols-2 gap-2 mb-2 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 text-[0.6875rem] text-slate-350">
                            {el.groesse && (
                              <div>
                                <span className="text-amber-500/80 font-extrabold block uppercase text-[0.55rem] tracking-wider">Größe</span>
                                <span className="font-medium text-slate-200">{el.groesse}</span>
                              </div>
                            )}
                            {el.gewicht && (
                              <div>
                                <span className="text-amber-500/80 font-extrabold block uppercase text-[0.55rem] tracking-wider">Gewicht</span>
                                <span className="font-medium text-slate-200">{el.gewicht}</span>
                              </div>
                            )}
                            {el.menge && (
                              <div>
                                <span className="text-amber-500/80 font-extrabold block uppercase text-[0.55rem] tracking-wider">Menge</span>
                                <span className="font-medium text-slate-200">{el.menge}</span>
                              </div>
                            )}
                            {el.verbreitung && (
                              <div className="col-span-2 border-t border-slate-800/30 pt-1.5 mt-0.5">
                                <span className="text-amber-500/80 font-extrabold block uppercase text-[0.55rem] tracking-wider">Verbreitung</span>
                                <span className="font-medium text-slate-200">{el.verbreitung}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[0.6875rem] text-slate-500 font-bold uppercase">Stufe / HG</span>
                            <span className="font-semibold text-slate-200 px-2 py-0.5 bg-slate-850 rounded border border-slate-800">{el.level}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <span className="text-[0.6875rem] text-slate-500 font-bold uppercase">TP</span>
                              <span className="font-extrabold text-red-400 bg-red-950/20 px-2 py-0.5 border border-red-900/30 rounded" title={el.tp_formula}>
                                {el.hp_current}/{el.hp_max} {el.tp_formula && `(${el.tp_formula})`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[0.6875rem] text-slate-500 font-bold uppercase">RK</span>
                              <span className="font-bold text-slate-200 bg-slate-850 px-2 py-0.5 border border-slate-800 rounded">
                                {el.rk !== undefined ? el.rk : el.vp}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Extra general stats for rich entries */}
                        {(el.bw || el.ub !== undefined || el.senses || el.languages || el.saves || el.immunities) && (
                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-900/35 border border-slate-800/50 text-[0.6875rem] text-slate-350">
                            {el.bw && (
                              <div>
                                <span className="text-slate-500 font-extrabold block uppercase text-[0.625rem]">BW (Bewegung)</span>
                                <span className="font-semibold">{el.bw}</span>
                              </div>
                            )}
                            {el.ub !== undefined && (
                              <div>
                                <span className="text-slate-500 font-extrabold block uppercase text-[0.625rem]">ÜB (Übungsbonus)</span>
                                <span className="font-semibold text-amber-500 font-bold">+{el.ub}</span>
                              </div>
                            )}
                            {el.saves && (
                              <div className="col-span-2 border-t border-slate-800/30 pt-1.5 mt-0.5">
                                <span className="text-slate-500 font-extrabold block uppercase text-[0.625rem]">Rettungswürfe (RW)</span>
                                <span className="font-semibold text-slate-200">{el.saves}</span>
                              </div>
                            )}
                            {el.immunities && (
                              <div className="col-span-2 border-t border-slate-800/30 pt-1.5 mt-0.5">
                                <span className="text-slate-500 font-extrabold block uppercase text-[0.625rem]">Immunitäten</span>
                                <span className="font-semibold text-orange-400">{el.immunities}</span>
                              </div>
                            )}
                            {el.senses && (
                              <div className="col-span-2 border-t border-slate-800/30 pt-1.5 mt-0.5">
                                <span className="text-slate-500 font-extrabold block uppercase text-[0.625rem]">Sinne</span>
                                <span className="font-semibold">{el.senses}</span>
                              </div>
                            )}
                            {el.languages && (
                              <div className="col-span-2 border-t border-slate-800/30 pt-1.5 mt-0.5">
                                <span className="text-slate-500 font-extrabold block uppercase text-[0.625rem]">Sprachen</span>
                                <span className="font-semibold">{el.languages}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Attribute Grid */}
                        <div className="grid grid-cols-4 gap-1 text-[0.6875rem] text-center font-bold">
                          {el.attributes?.map(attr => (
                            <div key={attr.name} className="bg-slate-900/50 rounded p-1 border border-slate-800/40">
                              <span className="text-slate-500 block">{attr.name}</span>
                              <span className="text-slate-300 font-extrabold">{attr.value > 0 ? `+${attr.value}` : attr.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Skills and passive values */}
                        {el.skills && el.skills.length > 0 && (
                          <div className="pt-1.5 space-y-1">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block">Fertigkeiten (Skills)</span>
                            <div className="flex flex-wrap gap-1">
                              {el.skills.map((sk: any, idx) => (
                                <span key={idx} className="bg-slate-900 border border-slate-800 text-[0.6875rem] px-2.5 py-0.5 rounded font-medium text-slate-300">
                                  {sk.name}: +{sk.value} {sk.passive !== undefined && <span className="text-slate-500">(pRW: {sk.passive})</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Traits / Eigenschaften */}
                        {el.traits && el.traits.length > 0 && (
                          <div className="pt-1.5 space-y-1">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block">Eigenschaften (Traits)</span>
                            <div className="space-y-1">
                              {el.traits.map((t: any, idx) => (
                                <div key={idx} className="bg-slate-900/30 border border-slate-850 p-2 rounded text-xs">
                                  <strong className="text-amber-500">{t.name}:</strong> <span className="text-slate-300">{t.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions (Bestiary actions, e.g. multiattack, bite, ram etc) */}
                        {el.actions && el.actions.length > 0 && (
                          <div className="pt-2 space-y-1.5">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block border-b border-slate-800/40 pb-0.5">Aktionen</span>
                            <div className="space-y-1.5">
                              {el.actions.map((act: any, idx) => (
                                <div key={idx} className="bg-slate-900/30 border border-slate-850 p-2 rounded text-xs space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <strong className="text-red-400">{act.name}</strong>
                                    {act.type && (
                                      <span className="text-[0.625rem] font-extrabold uppercase px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">
                                        {act.type}
                                      </span>
                                    )}
                                  </div>
                                  {act.description && <p className="text-slate-350 text-xs leading-relaxed">{act.description}</p>}
                                  {(act.at !== undefined || act.rw || act.damage) && (
                                    <div className="text-[0.6875rem] text-slate-400 flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-slate-850">
                                      {act.at !== undefined && <span><strong>AT:</strong> +{act.at}</span>}
                                      {act.rw && <span><strong>RW:</strong> {act.rw}</span>}
                                      {act.damage && <span><strong>Treffer:</strong> {act.damage}</span>}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bonusactions */}
                        {el.bonus_actions && el.bonus_actions.length > 0 && (
                          <div className="pt-2 space-y-1.5">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block border-b border-slate-800/40 pb-0.5">Bonusaktionen</span>
                            <div className="space-y-1.5">
                              {el.bonus_actions.map((act: any, idx) => (
                                <div key={idx} className="bg-slate-900/30 border border-slate-850 p-2 rounded text-xs space-y-1">
                                  <strong className="text-purple-400">{act.name}</strong>
                                  {act.description && <p className="text-slate-350 text-xs leading-relaxed">{act.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reaktionen */}
                        {el.reactions && el.reactions.length > 0 && (
                          <div className="pt-2 space-y-1.5">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block border-b border-slate-800/40 pb-0.5">Reaktionen</span>
                            <div className="space-y-1.5">
                              {el.reactions.map((act: any, idx) => (
                                <div key={idx} className="bg-slate-900/30 border border-slate-850 p-2 rounded text-xs space-y-1">
                                  <strong className="text-blue-400">{act.name}</strong>
                                  {act.description && <p className="text-slate-350 text-xs leading-relaxed">{act.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Legendäre Aktionen */}
                        {el.legendary_actions && el.legendary_actions.length > 0 && (
                          <div className="pt-2 space-y-1.5">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block border-b border-slate-800/40 pb-0.5">Legendäre Aktionen</span>
                            <div className="space-y-1.5">
                              {el.legendary_actions.map((act: any, idx) => (
                                <div key={idx} className="bg-slate-900/30 border border-slate-850 p-2 rounded text-xs space-y-1">
                                  <strong className="text-teal-400">{act.name}</strong>
                                  {act.description && <p className="text-slate-350 text-xs leading-relaxed">{act.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hortaktionen */}
                        {el.lair_actions && el.lair_actions.length > 0 && (
                          <div className="pt-2 space-y-1.5">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block border-b border-slate-800/40 pb-0.5">Hortaktionen</span>
                            <div className="space-y-1.5">
                              {el.lair_actions.map((act: any, idx) => (
                                <div key={idx} className="bg-slate-900/30 border border-slate-850 p-2 rounded text-xs space-y-1">
                                  <strong className="text-yellow-500">{act.name}</strong>
                                  {act.description && <p className="text-slate-350 text-xs leading-relaxed">{act.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Regionale Effekte */}
                        {el.regional_effects && (
                          <div className="pt-2 space-y-1.5">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block border-b border-slate-800/40 pb-0.5">Regionale Effekte</span>
                            <div className="bg-slate-900/30 border border-slate-850 p-2.5 rounded text-xs text-slate-350 leading-relaxed">
                              {el.regional_effects}
                            </div>
                          </div>
                        )}

                        {/* Legacy Special Abilities (Fallbacks for standard templates) */}
                        {(!el.traits && el.abilities && el.abilities.length > 0) && (
                          <div className="pt-1.5">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block mb-1">Besonderheiten</span>
                            <div className="flex flex-wrap gap-1">
                              {el.abilities.map((ab: any, idx) => (
                                <span key={idx} className="bg-amber-950/20 text-amber-400/90 border border-amber-950 text-[0.6875rem] px-2 py-0.5 rounded font-medium">
                                  {typeof ab === 'string' ? ab : ab.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Legacy Attacks (Fallbacks for standard templates) */}
                        {(!el.actions && el.attacks && el.attacks.length > 0) && (
                          <div className="pt-1.5 space-y-1">
                            <span className="text-[0.6875rem] text-slate-500 font-extrabold uppercase block">Angriffe</span>
                            <div className="space-y-1">
                              {el.attacks.map((atk: any, idx) => (
                                <div key={idx} className="bg-slate-900/30 border border-slate-850 p-2 rounded text-xs flex justify-between items-center">
                                  <span className="font-semibold text-slate-200">{atk.name}</span>
                                  <span className="text-slate-400 text-[0.6875rem]">
                                    {atk.tp && `TP: ${atk.tp}`} {atk.at !== undefined && ` | AT: ${atk.at}`} {atk.pa !== undefined && ` | PA: ${atk.pa}`} {atk.range && ` | RW: ${atk.range}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {el.type === 'social' && (
                      <div className="space-y-2.5 border-t border-slate-800/60 pt-4 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-[0.6875rem]">
                          <div>
                            <span className="text-slate-500 font-bold uppercase block">Rolle</span>
                            <span className="font-semibold text-slate-200">{el.role}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase block">Fraktion</span>
                            <span className="font-semibold text-slate-200 truncate block">{el.faction}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[0.6875rem] text-slate-500 font-bold uppercase block">Motivation</span>
                          <span className="text-slate-300 italic text-xs block mt-0.5">"{el.motivation}"</span>
                        </div>

                        {/* SECRET ACCORDION FOR DM */}
                        <div className="pt-2 bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
                          <button
                            onClick={() => toggleSecret(el.id)}
                            className="w-full flex items-center justify-between text-[0.6875rem] font-extrabold text-amber-500/90 uppercase tracking-wider hover:text-amber-400 transition-colors"
                          >
                            <span>🔒 DM GEHEIMNIS</span>
                            <span>{revealedSecrets[el.id] ? 'Verbergen' : 'Enthüllen'}</span>
                          </button>

                          {revealedSecrets[el.id] && (
                            <p className="mt-2 text-xs text-amber-200/90 leading-relaxed border-t border-slate-800/50 pt-2 animate-fade-in">
                              {el.secrets}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {el.type === 'trap' && (
                      <div className="space-y-3 border-t border-slate-800/60 pt-4 text-xs">
                        <div>
                          <span className="text-[0.6875rem] text-slate-500 font-bold uppercase block">Auslöser</span>
                          <span className="font-semibold text-slate-250">{el.trigger}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-bold uppercase text-[0.625rem]">Entdecken</span>
                            <span className="font-bold text-amber-400 px-2 py-0.5 bg-amber-950/20 border border-amber-900/30 rounded">DC {el.detection_dc}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-bold uppercase text-[0.625rem]">Entschärfen</span>
                            <span className="font-bold text-orange-400 px-2 py-0.5 bg-orange-950/20 border border-orange-900/30 rounded">DC {el.disarm_dc}</span>
                          </div>
                        </div>

                        <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                          <span className="text-[0.625rem] text-orange-400 font-bold uppercase block mb-1">Schaden / Effekt</span>
                          <p className="font-bold text-slate-200 text-xs">{el.damage}</p>
                        </div>
                      </div>
                    )}

                    {el.type === 'hazard' && (
                      <div className="space-y-3 border-t border-slate-800/60 pt-4 text-xs">
                        <div className="flex justify-between items-center text-[0.6875rem]">
                          <div>
                            <span className="text-slate-500 font-bold uppercase block">Art</span>
                            <span className="font-semibold text-slate-200">{el.hazard_type}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase block">Bedrohung</span>
                            <span className={`font-extrabold px-2 py-0.5 rounded border ${el.severity === 'Tödlich'
                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              }`}>
                              {el.severity}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[0.6875rem] text-slate-500 font-bold uppercase block">Auswirkungen</span>
                          <p className="text-slate-300 mt-1 bg-slate-900/30 border border-slate-850 p-2.5 rounded-lg leading-relaxed text-xs">
                            {el.effects}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[0.6875rem] text-slate-400">
                          <div>
                            <span className="text-slate-500 font-bold block uppercase text-[0.625rem]">Gegenprobe</span>
                            <span className="font-semibold text-slate-350">{el.avoidance}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold block uppercase text-[0.625rem]">Dauer</span>
                            <span className="font-semibold text-slate-350">{el.duration}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer: timestamp / meta */}
                  <div className="border-t border-slate-800/50 mt-6 pt-4 flex items-center justify-between text-[0.6875rem] text-slate-500 font-medium">
                    <span>ID: {el.id}</span>
                    <span>Erstellt: {new Date(el.created_at).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-650 font-semibold tracking-wider uppercase mt-12">
        <span>© 2026 Myranor Encra RPG Toolkit — Pair Programmed with Antigravity</span>
      </footer>

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-[#131b2e]/95 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 animate-scale-in">
            {/* Top gold highlight bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-700 rounded-t-2xl" />

            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400 font-display uppercase tracking-wider flex items-center gap-2 flex-wrap">
                <svg className="w-4 h-4 text-amber-400 animate-spin-slow shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Visuelle Einstellungen</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors cursor-pointer shrink-0 pt-0.5"
                title="Schließen"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-350">
                  <span>Schriftgröße</span>
                  <span className="text-amber-400 font-bold">{fontSize}%</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="150"
                  step="5"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/85">
                <p className="text-[0.625rem] text-slate-500 font-bold uppercase tracking-wider mb-1">Vorschau</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wie groß soll die Schrift im Bestiarium sein? Regler verschieben zum Ausprobieren.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleFontSizeChange(100)}
                  className="flex-1 px-4 py-2.5 text-[0.6875rem] font-extrabold uppercase tracking-wider text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all cursor-pointer text-center"
                >
                  Standard (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-5 py-2.5 text-[0.6875rem] font-extrabold uppercase tracking-wider text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-900/10 text-center"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div
            className="relative bg-[#131b2e]/95 border border-slate-800 rounded-2xl p-2.5 shadow-2xl animate-scale-in max-w-full max-h-full flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold highlight bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-700 rounded-t-2xl" />
            
            <button
              type="button"
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-950/90 rounded-full w-8 h-8 flex items-center justify-center font-bold transition-all cursor-pointer z-10 text-xs border border-slate-800"
              title="Schließen"
            >
              ✕
            </button>
            <img
              src={getImageUrl(activeLightboxImage) || ''}
              alt="Encounter Background Expanded"
              className="rounded-xl lightbox-image"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
