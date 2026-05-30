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
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const canUserViewOfficialImages = (user: any): boolean => {
    if (!user) return false;
    const allowedEmails = ['arthur.trauter@googlemail.com'];
    return (
      allowedEmails.includes(user?.email || '') ||
      user?.app_metadata?.role === 'admin' ||
      user?.user_metadata?.role === 'admin'
    );
  };

  const fetchSignedUrls = async (items: EncounterElement[]) => {
    const paths = items
      .map(item => item.image_url)
      .filter((url): url is string => {
        if (!url || !url.startsWith('user-uploads/')) return false;
        if (url.startsWith('user-uploads/official/') && !canUserViewOfficialImages(session?.user)) {
          return false;
        }
        return true;
      });
    
    if (paths.length === 0) return;

    try {
      const uniquePaths = Array.from(new Set(paths)).filter(p => !signedUrls[p]);
      if (uniquePaths.length === 0) return;

      const { data, error } = await supabase.storage
        .from('encounter-images')
        .createSignedUrls(uniquePaths, 86400); // 24 hours
      
      if (!error && data) {
        const newMap: Record<string, string> = {};
        data.forEach(item => {
          if (item.path && item.signedUrl) {
            newMap[item.path] = item.signedUrl;
          }
        });
        setSignedUrls(prev => ({ ...prev, ...newMap }));
      }
    } catch (err) {
      console.warn('Failed to fetch signed URLs:', err);
    }
  };

  useEffect(() => {
    if (elements.length > 0 || templates.length > 0) {
      fetchSignedUrls([...elements, ...templates]);
    }
  }, [elements, templates]);

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

  // Helper to generate a valid UUID v4 (needed because the encounters table expects a uuid id)
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

  // CRUD for Active Session Elements
  const addElement = async (newEl: Omit<EncounterElement, 'id' | 'created_at' | 'updated_at'>) => {
    const id = generateUUID();
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
        signedUrls,
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
