import React from 'react';
import { gentizeText } from '../../utils/gentizeBrand.js';

/** Keep routine labels as text; use the wordmark only in explicit main headings. */
export function GentizeText({ children, logo = false }) {
  if (typeof children !== 'string') return children;
  const text = gentizeText(children);
  if (!logo || !/\bGentize\b/.test(text)) return text;
  return text.split(/(\bGentize\b)/).map((part, index) => part === 'Gentize' ? (
    <span key={index} className="gentize-brand">
      <img src="/gentize-wordmark.png" alt="Gentize" className="gentize-brand__logo" />
    </span>
  ) : <React.Fragment key={index}>{part}</React.Fragment>);
}
