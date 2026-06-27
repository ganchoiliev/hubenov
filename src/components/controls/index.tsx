/** Language switch + theme toggle (§9, §7 locale toggle persisted). */
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Languages } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

export function LanguageSwitch({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const toggle = () => void i18n.changeLanguage(current === 'bg' ? 'en' : 'bg');

  return (
    <button
      onClick={toggle}
      aria-label={t('common.switch_language')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold',
        'text-muted-fg hover:bg-muted hover:text-foreground transition-colors',
        className,
      )}
    >
      <Languages className="h-4 w-4" />
      <span className={current === 'bg' ? 'text-foreground' : ''}>БГ</span>
      <span className="text-muted-fg">/</span>
      <span className={current === 'en' ? 'text-foreground' : ''}>EN</span>
    </button>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={t('common.toggle_theme')}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-fg',
        'hover:bg-muted hover:text-foreground transition-colors',
        className,
      )}
    >
      {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}
