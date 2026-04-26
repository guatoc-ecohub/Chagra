import React from 'react';
import { User, Palette } from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import ThemeSelector from './common/ThemeSelector';
import { PRIMARY_WORKER_NAME } from '../config/workerConfig';

export default function ProfileScreen({ onBack }) {
    return (
        <ScreenShell
            title="Perfil de Usuario"
            icon={User}
            onBack={onBack}
        >
            <div className="flex flex-col gap-6 pb-8">
                {/* ID Card / User Info */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border-2 border-emerald-500/30">
                        <User size={40} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white">{PRIMARY_WORKER_NAME}</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Operador de Campo</p>
                </div>

                {/* Theme Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Palette size={18} className="text-emerald-400" />
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Personalización</h3>
                    </div>
                    <ThemeSelector />
                </div>

                {/* App Info Footer */}
                <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
                    <p className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">
                        Chagra Eco-OS • v0.8.4
                    </p>
                    <p className="text-[9px] text-slate-700 mt-1 max-w-[200px] mx-auto leading-tight">
                        Diseñado para la soberanía alimentaria y la regeneración ecosistémica.
                    </p>
                </div>
            </div>
        </ScreenShell>
    );
}
