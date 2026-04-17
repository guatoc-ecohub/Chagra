import React from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

/**
 * ScreenShell — layout común para vistas full-screen.
 */
interface ScreenShellProps {
  title: string;
  onBack?: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  title,
  onBack,
  icon: Icon,
  children,
  actions,
}) => (
  <div className="h-[100dvh] bg-slate-950 text-white flex flex-col overflow-hidden">
    <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold text-white flex items-center gap-2 truncate">
          {Icon && <Icon className="text-morpho shrink-0" size={20} />}
          {title}
        </h1>
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </header>
    <main className="flex-1 overflow-y-auto bg-slate-950 bg-biopunk-pattern">{children}</main>
  </div>
);

export default ScreenShell;
