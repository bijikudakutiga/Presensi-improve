import { useState } from "react";

interface Props {
  text: string;
  author: string;
}

export function MarqueeQuote({ text, author }: Props) {
  const [paused, setPaused] = useState(false);
  const content = `\u201C${text}\u201D — ${author}`;

  return (
    <div
      className="card overflow-hidden bg-primary-soft border-primary-soft py-3"
      onClick={() => setPaused((p) => !p)}
      role="button"
      aria-label="Kutipan motivasi harian, ketuk untuk jeda"
    >
      <div className="flex whitespace-nowrap">
        <div className={`flex shrink-0 animate-marquee ${paused ? "[animation-play-state:paused]" : ""}`}>
          <span className="px-6 text-sm font-medium text-primary-dark">{content}</span>
          <span className="px-6 text-sm font-medium text-primary-dark">{content}</span>
        </div>
      </div>
    </div>
  );
}
