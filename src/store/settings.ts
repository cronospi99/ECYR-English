import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';

interface SettingsState {
  theme: ThemePref;
  spanishHints: boolean;
  accent: 'en-US' | 'en-GB';
  speechRate: number;
  name: string;
  /** Teacher free-practice mode: nothing is recorded (XP, activity, games). */
  practiceSandbox: boolean;
  setTheme: (t: ThemePref) => void;
  set: (p: Partial<Omit<SettingsState, 'set' | 'setTheme'>>) => void;
}

export function applyTheme(t: ThemePref) {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem('ecyr:theme', t);
  } catch {
    /* storage unavailable */
  }
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      spanishHints: true,
      accent: 'en-US',
      speechRate: 0.95,
      name: '',
      practiceSandbox: false,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      set: (p) => set(p),
    }),
    { name: 'ecyr:settings' },
  ),
);
