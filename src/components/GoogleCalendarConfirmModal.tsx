import React from 'react';
import { AlertTriangle, Trash2, Calendar, X } from 'lucide-react';

interface GoogleCalendarConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemCount?: number;
  itemsList?: string[];
  actionLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const GoogleCalendarConfirmModal: React.FC<GoogleCalendarConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemCount,
  itemsList,
  actionLabel = 'Confirmar Ação',
  isDestructive = true,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#EDE4DA] overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDestructive ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {isDestructive ? (
                <Trash2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-lg font-bold text-[#231815] mb-2">{title}</h3>
          <p className="text-sm text-[#8C7A70] leading-relaxed mb-4">{description}</p>

          {itemCount !== undefined && (
            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EDE4DA] mb-4 flex items-center gap-2 text-xs font-semibold text-[#6A3102]">
              <Calendar className="w-4 h-4" />
              <span>{itemCount} evento(s) no Google Calendar serão afetados.</span>
            </div>
          )}

          {itemsList && itemsList.length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-2.5 mb-4 space-y-1">
              {itemsList.map((item, i) => (
                <div key={i} className="text-xs text-stone-700 truncate font-mono">
                  • {item}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-[#8C7A70] hover:text-[#231815] hover:bg-stone-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all flex items-center gap-2 ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-200'
                  : 'bg-[#6A3102] hover:bg-[#522501] shadow-md shadow-[#6A3102]/20'
              } disabled:opacity-50`}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
