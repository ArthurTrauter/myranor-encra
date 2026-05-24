import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useEncounters } from './context/EncounterContext';
import type { EncounterElement, EncounterElementType } from './types';

export const App: React.FC = () => {
  const { user, signOut } = useAuth();
  const { elements, loadingElements, addElement, deleteElement } = useEncounters();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<EncounterElementType | 'all'>('all');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  
  // Quick-Add Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<EncounterElementType>('enemy');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newNotes, setNewNotes] = useState('');
  
  // Type-specific form fields
  const [newEnemyLevel, setNewEnemyLevel] = useState('Mittel');
  const [newEnemyHP, setNewEnemyHP] = useState(30);
  const [newEnemyVP, setNewEnemyVP] = useState(2);
  const [newEnemyIni, setNewEnemyIni] = useState(10);
  
  const [newSocialRole, setNewSocialRole] = useState('');
  const [newSocialFaction, setNewSocialFaction] = useState('');
  const [newSocialMotivation, setNewSocialMotivation] = useState('');
  const [newSocialSecret, setNewSocialSecret] = useState('');

  const [newTrapTrigger, setNewTrapTrigger] = useState('');
  const [newTrapDetect, setNewTrapDetect] = useState(12);
  const [newTrapDisarm, setNewTrapDisarm] = useState(12);
  const [newTrapDamage, setNewTrapDamage] = useState('');

  const [newHazardType, setNewHazardType] = useState('');
  const [newHazardSeverity, setNewHazardSeverity] = useState('Moderat');
  const [newHazardEffects, setNewHazardEffects] = useState('');

  const toggleSecret = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let specificData = {};

    if (newType === 'enemy') {
      specificData = {
        level: newEnemyLevel,
        hp_max: newEnemyHP,
        hp_current: newEnemyHP,
        vp: newEnemyVP,
        ini: newEnemyIni,
        attributes: [
          { name: "MU", value: 12 }, { name: "KL", value: 11 }, { name: "IN", value: 12 },
          { name: "CH", value: 10 }, { name: "FF", value: 12 }, { name: "GE", value: 12 },
          { name: "KO", value: 12 }, { name: "KK", value: 12 }
        ],
        skills: [],
        attacks: [],
        abilities: []
      };
    } else if (newType === 'social') {
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

    const payload = {
      name: newName,
      type: newType,
      description: newDesc,
      notes: newNotes,
      ...specificData
    };

    await addElement(payload as any);

    // Reset Form
    setNewName('');
    setNewDesc('');
    setNewNotes('');
    setNewSocialRole('');
    setNewSocialFaction('');
    setNewSocialMotivation('');
    setNewSocialSecret('');
    setNewTrapTrigger('');
    setNewTrapDamage('');
    setNewHazardType('');
    setNewHazardEffects('');
    setShowAddForm(false);
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
      <header className="border-b border-slate-800 bg-[#131b2e]/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shadow-md shadow-amber-900/10">
            M
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 font-display uppercase">
              Myranor Encra
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">RPG Encounter Scaffold</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 font-medium">Spielleiter</p>
            <p className="text-sm font-semibold text-slate-200">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-all"
            id="btn-sign-out"
          >
            Ausloggen
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
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                    isActive
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
        {showAddForm && (
          <div className="bg-[#131b2e]/85 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 shadow-xl animate-fade-in">
            <h3 className="text-lg font-bold text-amber-400 border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <span>Neues RPG-Element beschwören</span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold"
              >
                Abbrechen
              </button>
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Typ</label>
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
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="z.B. Myranische Riesenspinne..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Beschreibung</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Hintergrund, Aussehen, Verhalten..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {/* TYPE SPECIFIC FORM CONTROLS */}
              {newType === 'enemy' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Gefahr (Stufe)</label>
                    <select
                      value={newEnemyLevel}
                      onChange={e => setNewEnemyLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    >
                      <option value="Leicht">Leicht</option>
                      <option value="Mittel">Mittel</option>
                      <option value="Schwer">Schwer</option>
                      <option value="Boss">Boss / Tödlich</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Lebenspunkte (HP)</label>
                    <input
                      type="number"
                      value={newEnemyHP}
                      onChange={e => setNewEnemyHP(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rüstung (VP)</label>
                    <input
                      type="number"
                      value={newEnemyVP}
                      onChange={e => setNewEnemyVP(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Initiative</label>
                    <input
                      type="number"
                      value={newEnemyIni}
                      onChange={e => setNewEnemyIni(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                </div>
              )}

              {newType === 'social' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rolle / Beruf</label>
                    <input
                      type="text"
                      value={newSocialRole}
                      onChange={e => setNewSocialRole(e.target.value)}
                      placeholder="z.B. Senator, Gladiator, Schmied"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Fraktion</label>
                    <input
                      type="text"
                      value={newSocialFaction}
                      onChange={e => setNewSocialFaction(e.target.value)}
                      placeholder="z.B. Haus der Optimaten, Gilde..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Motivation</label>
                    <input
                      type="text"
                      value={newSocialMotivation}
                      onChange={e => setNewSocialMotivation(e.target.value)}
                      placeholder="Was treibt die Person an?"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Geheimnis (DM Info)</label>
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

              {newType === 'trap' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Auslöser</label>
                    <input
                      type="text"
                      value={newTrapTrigger}
                      onChange={e => setNewTrapTrigger(e.target.value)}
                      placeholder="Druckplatte, Stolperdraht..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Entdecken (Probe)</label>
                    <input
                      type="number"
                      value={newTrapDetect}
                      onChange={e => setNewTrapDetect(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Entschärfen (Probe)</label>
                    <input
                      type="number"
                      value={newTrapDisarm}
                      onChange={e => setNewTrapDisarm(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Schaden / Effekt</label>
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

              {newType === 'hazard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Gefahrenart</label>
                    <input
                      type="text"
                      value={newHazardType}
                      onChange={e => setNewHazardType(e.target.value)}
                      placeholder="Magisch, Hitze, Einsturz..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bedrohungsstufe</label>
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
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Auswirkungen</label>
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">DM Notizen (Optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Zusätzliche Infos nur für dich..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-880 text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-500/10 transition-all"
                >
                  Beschwörung abschließen
                </button>
              </div>
            </form>
          </div>
        )}

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
                    {/* Header: Name and Type Tag */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${tagColors}`}>
                          {tagLabel}
                        </span>
                        <h3 className="text-lg font-bold text-slate-100 mt-2 font-display tracking-tight group-hover:text-amber-400 transition-colors">
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
                      <div className="space-y-3.5 border-t border-slate-800/60 pt-4 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Stufe</span>
                            <span className="font-semibold text-slate-200 px-2 py-0.5 bg-slate-850 rounded border border-slate-800">{el.level}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">HP</span>
                              <span className="font-extrabold text-red-400 bg-red-950/20 px-2 py-0.5 border border-red-900/30 rounded">{el.hp_current}/{el.hp_max}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">VP</span>
                              <span className="font-bold text-slate-200 bg-slate-850 px-2 py-0.5 border border-slate-800 rounded">{el.vp}</span>
                            </div>
                          </div>
                        </div>

                        {/* Attribute Grid */}
                        <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
                          {el.attributes?.map(attr => (
                            <div key={attr.name} className="bg-slate-900/50 rounded p-1 border border-slate-800/40">
                              <span className="text-slate-500 block">{attr.name}</span>
                              <span className="text-slate-300 font-extrabold">{attr.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Special Abilities */}
                        {el.abilities && el.abilities.length > 0 && (
                          <div className="pt-1.5">
                            <span className="text-[10px] text-slate-500 font-extrabold uppercase block mb-1">Besonderheiten</span>
                            <div className="flex flex-wrap gap-1">
                              {el.abilities.map((ab: any, idx) => (
                                <span key={idx} className="bg-amber-950/20 text-amber-400/90 border border-amber-950 text-[10px] px-2 py-0.5 rounded font-medium">
                                  {typeof ab === 'string' ? ab : ab.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {el.type === 'social' && (
                      <div className="space-y-2.5 border-t border-slate-800/60 pt-4 text-xs">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
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
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Motivation</span>
                          <span className="text-slate-300 italic text-[11px] block mt-0.5">"{el.motivation}"</span>
                        </div>

                        {/* SECRET ACCORDION FOR DM */}
                        <div className="pt-2 bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
                          <button
                            onClick={() => toggleSecret(el.id)}
                            className="w-full flex items-center justify-between text-[10px] font-extrabold text-amber-500/90 uppercase tracking-wider hover:text-amber-400 transition-colors"
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
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Auslöser</span>
                          <span className="font-semibold text-slate-250">{el.trigger}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Entdecken</span>
                            <span className="font-bold text-amber-400 px-2 py-0.5 bg-amber-950/20 border border-amber-900/30 rounded">DC {el.detection_dc}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-bold uppercase text-[9px]">Entschärfen</span>
                            <span className="font-bold text-orange-400 px-2 py-0.5 bg-orange-950/20 border border-orange-900/30 rounded">DC {el.disarm_dc}</span>
                          </div>
                        </div>

                        <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                          <span className="text-[9px] text-orange-400 font-bold uppercase block mb-1">Schaden / Effekt</span>
                          <p className="font-bold text-slate-200 text-xs">{el.damage}</p>
                        </div>
                      </div>
                    )}

                    {el.type === 'hazard' && (
                      <div className="space-y-3 border-t border-slate-800/60 pt-4 text-xs">
                        <div className="flex justify-between items-center text-[10px]">
                          <div>
                            <span className="text-slate-500 font-bold uppercase block">Art</span>
                            <span className="font-semibold text-slate-200">{el.hazard_type}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold uppercase block">Bedrohung</span>
                            <span className={`font-extrabold px-2 py-0.5 rounded border ${
                              el.severity === 'Tödlich' 
                                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                              {el.severity}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Auswirkungen</span>
                          <p className="text-slate-300 mt-1 bg-slate-900/30 border border-slate-850 p-2.5 rounded-lg leading-relaxed text-[11px]">
                            {el.effects}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                          <div>
                            <span className="text-slate-500 font-bold block uppercase text-[9px]">Gegenprobe</span>
                            <span className="font-semibold text-slate-350">{el.avoidance}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold block uppercase text-[9px]">Dauer</span>
                            <span className="font-semibold text-slate-350">{el.duration}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer: timestamp / meta */}
                  <div className="border-t border-slate-800/50 mt-6 pt-4 flex items-center justify-between text-[10px] text-slate-500 font-medium">
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
    </div>
  );
};

export default App;
