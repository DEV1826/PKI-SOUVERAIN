import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/80 px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200 dark:hover:bg-neutral-800"
      aria-label="Basculer le theme"
      title={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      <span>{theme === 'dark' ? 'Clair' : 'Sombre'}</span>
    </button>
  );
}
