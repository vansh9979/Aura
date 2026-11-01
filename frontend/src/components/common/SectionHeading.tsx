import React from 'react';

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionHeading({ title, description, action }: SectionHeadingProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">{title}</h2>
        {description && (
          <p className="text-xs text-slate-400 mt-1.5 max-w-xl leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
