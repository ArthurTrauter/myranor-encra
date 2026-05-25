import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { EncounterElement, EncounterContextType } from '../types';
import localOfficialTemplates from '../data/encounterTemplates.json';
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
  const [templates, setTemplates] = useState<EncounterElement[]>([]);
  const [loadingElements, setLoadingElements] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // 1. Load active encounters
  useEffect(() => {
    const loadElements = async () => {
      setLoadingElements(true);
      
      if (session) {
        try {
          const { data, error } = await supabase
            .from('encounters')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            setElements(data as EncounterElement[]);
            setLoadingElements(false);
            return;
          } else if (error) {
            console.log('Failed to fetch encounters from Supabase:', error.message);
          }
        } catch (err) {
          console.warn('Could not load from Supabase. Falling back to local storage.', err);
        }
      }

      // Local storage fallback
      const localData = localStorage.getItem('myranor_encounters');
      if (localData) {
        try {
          setElements(JSON.parse(localData));
        } catch (e) {
          console.error('Error parsing local storage encounters:', e);
          setElements(localOfficialTemplates as EncounterElement[]);
        }
      } else {
        // Fallback to templates on first visit
        setElements(localOfficialTemplates as EncounterElement[]);
        localStorage.setItem('myranor_encounters', JSON.stringify(localOfficialTemplates));
      }
      setLoadingElements(false);
    };

    loadElements();
  }, [session]);

  // 2. Load templates (Official public + User custom templates)
  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      
      try {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          setTemplates(data as EncounterElement[]);
          setLoadingTemplates(false);
          return;
        } else if (error) {
          console.log('Failed to fetch templates from Supabase:', error.message);
        }
      } catch (err) {
        console.warn('Could not load templates from Supabase. Falling back to local storage.', err);
      }

      // Local storage fallback for templates
      const localCustom = localStorage.getItem('myranor_custom_templates');
      let customTemplates: EncounterElement[] = [];
      if (localCustom) {
        try {
          customTemplates = JSON.parse(localCustom);
        } catch (e) {
          console.error('Error parsing custom templates from local storage:', e);
        }
      }

      // Combine official presets with custom templates
      setTemplates([...(localOfficialTemplates as EncounterElement[]), ...customTemplates]);
      setLoadingTemplates(false);
    };

    loadTemplates();
  }, [session]);

  // CRUD for Active Session Elements
  const addElement = async (newEl: Omit<EncounterElement, 'id' | 'created_at' | 'updated_at'>) => {
    const id = `${newEl.type}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const createdElement: EncounterElement = {
      ...newEl,
      id,
      created_at: now,
      updated_at: now,
      user_id: session?.user?.id || undefined,
    } as EncounterElement;

    // Update state & localStorage first for instant responsiveness
    const updated = [createdElement, ...elements];
    setElements(updated);
    localStorage.setItem('myranor_encounters', JSON.stringify(updated));

    if (session) {
      try {
        const { error } = await supabase
          .from('encounters')
          .insert([createdElement]);
        
        if (error) {
          console.warn('Supabase element insert failed:', error.message);
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
          console.warn('Supabase update failed:', error.message);
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
          console.warn('Supabase delete failed:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync delete with Supabase:', err);
      }
    }
  };

  // CRUD for Custom Templates
  const addTemplate = async (newTpl: Omit<EncounterElement, 'id' | 'created_at' | 'updated_at'>) => {
    const id = `custom-${newTpl.type}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const createdTemplate: EncounterElement = {
      ...newTpl,
      id,
      created_at: now,
      updated_at: now,
      user_id: session?.user?.id || undefined,
    } as EncounterElement;

    // Update state & local storage
    const updated = [...templates, createdTemplate];
    setTemplates(updated);

    // Filter only custom templates to save in localStorage custom templates
    const customTemplates = updated.filter(t => t.id.startsWith('custom-'));
    localStorage.setItem('myranor_custom_templates', JSON.stringify(customTemplates));

    if (session) {
      try {
        const { error } = await supabase
          .from('templates')
          .insert([createdTemplate]);
        
        if (error) {
          console.warn('Supabase template insert failed:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync template insert with Supabase:', err);
      }
    }

    return createdTemplate;
  };

  const deleteTemplate = async (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);

    // Update local storage
    const customTemplates = updated.filter(t => t.id.startsWith('custom-'));
    localStorage.setItem('myranor_custom_templates', JSON.stringify(customTemplates));

    if (session) {
      try {
        const { error } = await supabase
          .from('templates')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.warn('Supabase template delete failed:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync template delete with Supabase:', err);
      }
    }
  };
  const updateTemplate = async (id: string, updates: Partial<EncounterElement>) => {
    const now = new Date().toISOString();
    const updated = templates.map(t => {
      if (t.id === id) {
        return {
          ...t,
          ...updates,
          updated_at: now,
        } as EncounterElement;
      }
      return t;
    });

    setTemplates(updated);

    const customTemplates = updated.filter(t => t.id.startsWith('custom-'));
    localStorage.setItem('myranor_custom_templates', JSON.stringify(customTemplates));

    if (session) {
      try {
        const { error } = await supabase
          .from('templates')
          .update({ ...updates, updated_at: now })
          .eq('id', id);
        
        if (error) {
          console.warn('Supabase template update failed:', error.message);
        }
      } catch (err) {
        console.warn('Failed to sync template update with Supabase:', err);
      }
    }
  };

  return (
    <EncounterContext.Provider
      value={{
        elements,
        templates,
        loadingElements,
        loadingTemplates,
        addElement,
        updateElement,
        deleteElement,
        addTemplate,
        deleteTemplate,
        updateTemplate
      }}
    >
      {children}
    </EncounterContext.Provider>
  );
};
