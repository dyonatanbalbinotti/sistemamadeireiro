import { useEffect } from 'react';

export const useDarkMode = () => {
  useEffect(() => {
    // Forçar modo escuro
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);
};
