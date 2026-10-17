import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../api/client.js';

export function ProfileAvatar({ src, name = 'Account', className = 'w-8 h-8', }) {
  const displayName = typeof name === 'string' && name.trim() ? name : 'Account';
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <span className={`${className} rounded-full overflow-hidden bg-orange-500 text-white font-bold inline-flex items-center justify-center shrink-0`}>
    {src && !failed ? <img src={src} alt={`${displayName} profile`} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={() => setFailed(true)} /> : displayName.charAt(0).toUpperCase()}
  </span>;
}

export function usePortalProfile(role) {
  const [profile, setProfile] = useState({});
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem(role === 'admin' ? 'gentize_admin_auth' : 'gentize_user_auth') || '{}');
        if (active && saved && typeof saved === 'object' && !Array.isArray(saved)) setProfile(saved);
        const res = await apiRequest(role === 'admin' ? '/admin/settings' : `/user/profile${saved.id ? `?id=${encodeURIComponent(saved.id)}` : ''}`);
        const loaded = role === 'admin'
          ? res?.settings && { name: res.settings.admin_name, avatar: res.settings.admin_avatar, email: res.settings.admin_email }
          : res?.user;
        if (active && loaded && typeof loaded === 'object' && !Array.isArray(loaded)) setProfile(loaded);
      } catch (_) {}
    };
    load();
    window.addEventListener('profile-updated', load);
    return () => { active = false; window.removeEventListener('profile-updated', load); };
  }, [role]);
  return profile;
}

export function ProfilePhotoEditor({ value, name, onChange }) {
  const [error, setError] = useState('');
  const selectPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPG, PNG or WebP image under 5 MB.'); return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 400 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      onChange(canvas.toDataURL('image/jpeg', 0.85));
    } catch (_) { setError('This image could not be opened. Please choose another photo.'); }
    finally { URL.revokeObjectURL(url); }
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-4">
      <ProfileAvatar src={value} name={name || 'Account'} className="w-16 h-16 text-xl" />
      <div className="space-y-2">
        <label className="inline-flex px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-sm font-semibold cursor-pointer">
          Upload profile photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectPhoto} />
        </label>
        {value && <button type="button" className="ml-3 text-sm text-slate-500 hover:text-red-600" onClick={() => onChange('')}>Remove</button>}
        <p className="text-xs text-slate-500">JPG, PNG or WebP, up to 5 MB. Save settings to apply.</p>
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
