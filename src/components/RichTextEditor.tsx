import React, { useRef, useState } from 'react';
import { Bold, Italic, List, ListOrdered, CornerDownLeft, Eye, Edit3 } from 'lucide-react';
import { FormattedDescription } from './FormattedDescription';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Descreva a demanda, detalhes do briefing, referências, orientações do cliente...',
  rows = 5,
  label,
  minHeight
}) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultPlaceholder;

    const newText =
      value.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      value.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleInsertBullet = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const before = value.substring(0, start);
    const needNewLine = before.length > 0 && !before.endsWith('\n');
    insertFormatting(needNewLine ? '\n• ' : '• ', '', 'Item da lista');
  };

  const handleInsertNumbered = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const before = value.substring(0, start);
    const needNewLine = before.length > 0 && !before.endsWith('\n');
    insertFormatting(needNewLine ? '\n1. ' : '1. ', '', 'Primeiro passo');
  };

  const handleInsertParagraph = () => {
    insertFormatting('\n\n', '', '');
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-medium text-[#5C4D44] mb-1">
          {label}
        </label>
      )}
      <div className="border border-[#EDE4DA] rounded-xl overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-[#6A3102]/20 focus-within:border-[#6A3102] transition-all">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#FAF7F2] border-b border-[#EDE4DA] text-xs">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => insertFormatting('**', '**', 'texto em destaque')}
            title="Negrito (**texto**)"
            className="p-1.5 text-[#5C4D44] hover:text-[#231815] hover:bg-[#EFE7DE] rounded transition-colors"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*', 'texto em itálico')}
            title="Itálico (*texto*)"
            className="p-1.5 text-[#5C4D44] hover:text-[#231815] hover:bg-[#EFE7DE] rounded transition-colors"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-[#EDE4DA] mx-1" />
          <button
            type="button"
            onClick={handleInsertBullet}
            title="Lista com marcadores (•)"
            className="p-1.5 text-[#5C4D44] hover:text-[#231815] hover:bg-[#EFE7DE] rounded transition-colors"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleInsertNumbered}
            title="Lista numerada (1. 2. 3.)"
            className="p-1.5 text-[#5C4D44] hover:text-[#231815] hover:bg-[#EFE7DE] rounded transition-colors"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleInsertParagraph}
            title="Novo Parágrafo"
            className="p-1.5 text-[#5C4D44] hover:text-[#231815] hover:bg-[#EFE7DE] rounded transition-colors flex items-center gap-1 text-[11px]"
          >
            <CornerDownLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Parágrafo</span>
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-[#EFE7DE] p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              mode === 'edit'
                ? 'bg-white text-[#231815] shadow-xs font-semibold'
                : 'text-[#73645B] hover:text-[#231815]'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Editar</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
              mode === 'preview'
                ? 'bg-white text-[#6A3102] shadow-xs font-semibold'
                : 'text-[#73645B] hover:text-[#231815]'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Ver Formatação</span>
          </button>
        </div>
      </div>

      {/* Editor Area */}
      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={minHeight ? { minHeight } : undefined}
          className="w-full p-3.5 text-xs sm:text-sm text-[#231815] placeholder-[#A8988B] bg-white focus:outline-none resize-y leading-relaxed font-sans"
        />
      ) : (
        <div
          style={minHeight ? { minHeight } : undefined}
          className="p-3.5 min-h-[120px] bg-[#FAF7F2]/50 max-h-60 overflow-y-auto"
        >
          <FormattedDescription content={value} emptyText="Digite no modo Editar para visualizar a prévia formatada." />
        </div>
      )}

      {/* Helper footer */}
      <div className="px-3 py-1 bg-[#FAF7F2] border-t border-[#EDE4DA]/60 flex items-center justify-between text-[10px] text-[#8C7A70]">
        <span>Dica: Use quebras de linha para criar parágrafos separados.</span>
        <span>{value.length} caracteres</span>
      </div>
    </div>
    </div>
  );
};
