import React from 'react';
import { Home, CalendarDays, Clock, Bell, Newspaper, Menu } from 'lucide-react';
const icons = { home: Home, calendar: CalendarDays, bookings: Clock, notifications: Bell, news: Newspaper };
export function MobileDock({ items, active, onSelect, onMenu }) {
  return <nav className="mobile-dock lg:hidden" aria-label="Primary navigation">
    {items.map(({ id, label, icon }) => { const Icon = icons[icon] || Home; return <button key={id} type="button" aria-current={active === id ? 'page' : undefined} onClick={() => onSelect(id)} className={active === id ? 'is-active' : ''}><Icon size={21} strokeWidth={active === id ? 2.4 : 1.8} /><span>{label}</span></button>; })}
    <button type="button" onClick={onMenu}><Menu size={21} /><span>More</span></button>
  </nav>;
}
