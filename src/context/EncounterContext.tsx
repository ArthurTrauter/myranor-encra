import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { EncounterElement, EncounterContextType } from '../types';
import templates from '../data/encounterTemplates.json';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const EncounterContext = createContext<EncounterContextType | undefined>(undefined);

export const useEncounters = () => {
  const ctx = useContext(EncounterContext);
  if (!ctx) throw new Error('useEncounters must be used within an EncounterProvider');
  return ctx;
};

interface EncounterProviderProps {
  children: ReactNode;
}

export const EncounterProvider: React.FC<EncounterProviderProps> = ({ children }) => {
  const { session } = useAuth();
  const [elements, setElements] = useState<EncounterElement[]>([]);
  const [loadingElements, setLoadingElements] = useState(true);

  // Load initial elements (from Supabase if table exists, or fallback to localStorage / templates)
  useEffect(() => {
    const loadData = async () => {
      setLoadingElements(true);
      
      // If user is authenticated, we COULD query Supabase. 
      // But since tables are not set up yet, we will catch the error and fall back to localStorage/templates.
      if (session) {
        try {
          const { data, error } = await supabase
            .from('encounters')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            setElements(data as EncounterElement[]);
            setLoadingElements(false);
            return;
          } else if (error) {
            console.log('Supabase table encounters not yet configured or error occurred. Falling back to local storage.');
          }
        } catch (err) {
          console.warn('Could not load from Supabase. Falling back to local storage.', err);
        }
      }

      // Local storage load
      const localData = localStorage.getItem('myranor_encounters');
      if (localData) {
        try {
          setElements(JSON.parse(localData));
        } catch (e) {
          console.error('Error parsing local storage encounters:', e);
          setElements(templates as EncounterElement[]);
        }
      } else {
        // Fallback to templates on first visit
        setElements(templates as EncounterElement[]);
        localStorage.setItem('myranor_encounters', JSON.stringify(templates));
      }
      setLoadingElements(false);
    };

    loadData();
  }, [session]);

  const addElement = async (newEl: Omit<EncounterElement, 'id' | 'created_at' | 'updated_at'>) => {
    const id = `${newEl.type}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const createdElement: EncounterElement = {
      ...newEl,
      id,
      created_at: now,
      updated_at: now,
      user_id: session?.user?.id,
    } as EncounterElement;

    // Local update first so it works immediately
    const updated = [createdElement, ...elements];
    setElements(updated);
    localStorage.setItem('myranor_encounters', JSON.stringify(updated));

    // Optional Supabase integration for later
    if (session) {
      try {
        const { error } = await supabase
          .from('encounters')
          .insert([createdElement]);
        
        if (error) {
          console.warn('Supabase element insert failed (expected if tables are not set up):', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync insert with Supabase:', err);
      }
    }

    return createdElement;
  };

  const updateElement = async (id: string, updates: Partial<EncounterElement>) => {
    const now = new Date().toISOString();
    const updated = elements.map(el => {
      if (el.id === id) {
        return {
          ...el,
          ...updates,
          updated_at: now,
        } as EncounterElement;
      }
      return el;
    });

    setElements(updated);
    localStorage.setItem('myranor_encounters', JSON.stringify(updated));

    if (session) {
      try {
        const { error } = await supabase
          .from('encounters')
          .update({ ...updates, updated_at: now })
          .eq('id', id);
        
        if (error) {
          console.warn('Supabase update failed (expected if tables are not set up):', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync update with Supabase:', err);
      }
    }
  };

  const deleteElement = async (id: string) => {
    const updated = elements.filter(el => el.id !== id);
    setElements(updated);
    localStorage.setItem('myranor_encounters', JSON.stringify(updated));

    if (session) {
      try {
        const { error } = await supabase
          .from('encounters')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.warn('Supabase delete failed (expected if tables are not set up):', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync delete with Supabase:', err);
      }
    }
  };

  return (
    <EncounterContext.Provider value={{ elements, loadingElements, addElement, updateElement, deleteElement }}>
      {children}
    </EncounterContext.Provider>
  );
};
