import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('bhashasetu_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bhashasetu_theme', next);
      }
      return next;
    });
  };

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bhashasetu_theme', t);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
