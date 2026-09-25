import React from 'react';

interface FormattedDescriptionProps {
  content: string;
  className?: string;
  emptyText?: string;
}

export const FormattedDescription: React.FC<FormattedDescriptionProps> = ({
  content,
  className = '',
  emptyText = 'Nenhuma descrição ou briefing informado.'
}) => {
  if (!content || !content.trim()) {
    return <p className="text-xs italic text-[#8C7A70]">{emptyText}</p>;
  }

  // Parse lines and group paragraphs & list items
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: { type: 'bullet' | 'ordered'; items: string[] } | null = null;
  let blockKey = 0;

  const flushList = () => {
    if (!currentList) return;
    if (currentList.type === 'bullet') {
      blocks.push(
        <ul key={`ul-${blockKey++}`} className="space-y-1 my-2 pl-4 list-disc list-outside text-[#3D2E24]">
          {currentList.items.map((item, i) => (
            <li key={i} className="pl-1 leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`ol-${blockKey++}`} className="space-y-1 my-2 pl-4 list-decimal list-outside text-[#3D2E24]">
          {currentList.items.map((item, i) => (
            <li key={i} className="pl-1 leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  const renderInlineFormatting = (text: string): React.ReactNode => {
    // Basic regex parser for **bold** and *italic*
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const raw = match[0];
      if ((raw.startsWith('**') && raw.endsWith('**')) || (raw.startsWith('__') && raw.endsWith('__'))) {
        parts.push(
          <strong key={match.index} className="font-bold text-[#231815]">
            {raw.slice(2, -2)}
          </strong>
        );
      } else if ((raw.startsWith('*') && raw.endsWith('*')) || (raw.startsWith('_') && raw.endsWith('_'))) {
        parts.push(
          <em key={match.index} className="italic text-[#3D2E24]">
            {raw.slice(1, -1)}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // Empty line separates paragraphs
    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullet point check: starts with '-' or '*' or '•'
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bullet') {
        flushList();
        currentList = { type: 'bullet', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Ordered list check: starts with '1.' '2.' etc.
    const orderedMatch = trimmed.match(/^\d+[\.)]\s+(.*)$/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== 'ordered') {
        flushList();
        currentList = { type: 'ordered', items: [] };
      }
      currentList.items.push(orderedMatch[1]);
      continue;
    }

    // Regular line
    flushList();
    blocks.push(
      <p key={`p-${blockKey++}`} className="leading-relaxed my-1 text-[#3D2E24]">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  flushList();

  return (
    <div className={`space-y-1.5 text-xs sm:text-sm break-words overflow-hidden ${className}`}>
      {blocks}
    </div>
  );
};
