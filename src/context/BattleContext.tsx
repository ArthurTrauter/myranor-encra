import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { BattleParticipant, BattleContextType } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const BattleContext = createContext<BattleContextType | undefined>(undefined);

export const useBattle = () => {
  const ctx = useContext(BattleContext);
  if (!ctx) throw new Error('useBattle must be used within a BattleProvider');
  return ctx;
};

interface BattleProviderProps {
  children: ReactNode;
}

export const BattleProvider: React.FC<BattleProviderProps> = ({ children }) => {
  const { session } = useAuth();
  const [battleParticipants, setBattleParticipants] = useState<BattleParticipant[]>([]);
  const [loadingBattle, setLoadingBattle] = useState(true);

  // Load battle participants
  useEffect(() => {
    const loadBattle = async () => {
      setLoadingBattle(true);

      if (session) {
        try {
          const { data, error } = await supabase
            .from('battle_participants')
            .select('*')
            .order('created_at', { ascending: true });

          if (!error && data) {
            setBattleParticipants(data as BattleParticipant[]);
            setLoadingBattle(false);
            return;
          } else if (error) {
            console.log('Failed to fetch battle participants from Supabase:', error.message);
          }
        } catch (err) {
          console.warn('Could not load battle from Supabase. Falling back to local storage.', err);
        }
      }

      // Local storage fallback
      const localData = localStorage.getItem('myranor_battle_participants');
      if (localData) {
        try {
          setBattleParticipants(JSON.parse(localData));
        } catch (e) {
          console.error('Error parsing local storage battle participants:', e);
          setBattleParticipants([]);
        }
      } else {
        setBattleParticipants([]);
      }
      setLoadingBattle(false);
    };

    loadBattle();
  }, [session]);

  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const addBattleParticipant = async (
    elementOrTemplate: any,
    customName: string,
    hpMax: number
  ) => {
    const id = generateUUID();
    const now = new Date().toISOString();

    const newParticipant: BattleParticipant = {
      id,
      created_at: now,
      updated_at: now,
      user_id: session?.user?.id || undefined,
      template_id: elementOrTemplate.template_id || elementOrTemplate.id || undefined,
      name: customName,
      original_name: elementOrTemplate.name,
      hp_max: hpMax,
      hp_current: hpMax,
      rk: elementOrTemplate.rk !== undefined ? elementOrTemplate.rk : (elementOrTemplate.vp !== undefined ? elementOrTemplate.vp : 10),
      ini: elementOrTemplate.ini !== undefined ? elementOrTemplate.ini : 10,
      saves: elementOrTemplate.saves || undefined,
      bw: elementOrTemplate.bw || undefined,
      ub: elementOrTemplate.ub !== undefined ? elementOrTemplate.ub : undefined,
      attributes: elementOrTemplate.attributes || [],
      actions: elementOrTemplate.actions || elementOrTemplate.attacks || [],
      bonus_actions: elementOrTemplate.bonus_actions || [],
      states: [],
      active_variant: elementOrTemplate.active_variant || undefined,
      image_url: elementOrTemplate.image_url || undefined,
    };

    const updated = [...battleParticipants, newParticipant];
    setBattleParticipants(updated);
    localStorage.setItem('myranor_battle_participants', JSON.stringify(updated));

    if (session) {
      try {
        const { error } = await supabase
          .from('battle_participants')
          .insert([newParticipant]);

        if (error) {
          console.warn('Supabase battle participant insert failed:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync battle participant insert with Supabase:', err);
      }
    }

    return newParticipant;
  };

  const updateBattleParticipant = async (id: string, updates: Partial<BattleParticipant>) => {
    const now = new Date().toISOString();
    const updated = battleParticipants.map(part => {
      if (part.id === id) {
        return {
          ...part,
          ...updates,
          updated_at: now,
        } as BattleParticipant;
      }
      return part;
    });

    setBattleParticipants(updated);
    localStorage.setItem('myranor_battle_participants', JSON.stringify(updated));

    if (session) {
      try {
        const { error } = await supabase
          .from('battle_participants')
          .update({ ...updates, updated_at: now })
          .eq('id', id);

        if (error) {
          console.warn('Supabase battle participant update failed:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync battle participant update with Supabase:', err);
      }
    }
  };

  const deleteBattleParticipant = async (id: string) => {
    const updated = battleParticipants.filter(part => part.id !== id);
    setBattleParticipants(updated);
    localStorage.setItem('myranor_battle_participants', JSON.stringify(updated));

    if (session) {
      try {
        const { error } = await supabase
          .from('battle_participants')
          .delete()
          .eq('id', id);

        if (error) {
          console.warn('Supabase battle participant delete failed:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync battle participant delete with Supabase:', err);
      }
    }
  };

  const clearBattle = async () => {
    setBattleParticipants([]);
    localStorage.removeItem('myranor_battle_participants');

    if (session) {
      try {
        const { error } = await supabase
          .from('battle_participants')
          .delete()
          .eq('user_id', session.user.id);

        if (error) {
          console.warn('Supabase battle clear failed:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync battle clear with Supabase:', err);
      }
    }
  };

  return (
    <BattleContext.Provider
      value={{
        battleParticipants,
        loadingBattle,
        addBattleParticipant,
        updateBattleParticipant,
        deleteBattleParticipant,
        clearBattle,
      }}
    >
      {children}
    </BattleContext.Provider>
  );
};
