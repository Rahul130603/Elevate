import { GentizeText } from '../common/GentizeText.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers } from 'lucide-react';
import industries from '../../config/industries.json';

export function IndustryPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = industries.find(industry => industry.id === value);
  useEffect(() => {
    if (!open) return;
    const close = event => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <span className="block text-sm font-bold text-slate-800 mb-2" id="industry-label">Industry</span>
      <button type="button" aria-labelledby="industry-label" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-900">
        <Layers className="w-5 h-5 text-slate-400" />
        <span className="flex-1"><GentizeText>{selected?.label || 'Select your industry'}</GentizeText></span>
        <ChevronDown className={`w-4 h-4 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div role="listbox" aria-labelledby="industry-label" className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2">
        {industries.map(industry => <button key={industry.id} type="button" role="option" aria-selected={industry.id === value} onClick={() => { onChange(industry.id); setOpen(false); }} className={`w-full flex items-center justify-between gap-2 p-3 text-left text-sm rounded-lg hover:bg-slate-50 ${industry.id === value ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}`}>
          <GentizeText>{industry.label}</GentizeText>{industry.id === value && <Check className="w-4 h-4" />}
        </button>)}
      </div>}
      <p className="mt-2 text-xs text-slate-500">Your news feed will show only this industry.</p>
    </div>
  );
}
