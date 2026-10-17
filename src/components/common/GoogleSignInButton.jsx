import React, { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../api/client.js';

export function GoogleSignInButton({ onCredential, disabled }) {
  const container = useRef(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false, timer, timeout;
    setError(''); setLoading(true);
    if (container.current) container.current.replaceChildren();
    apiRequest('/public/google-auth-config').then(config => {
      if (cancelled) return;
      if (!config.available) { setError('Google sign-in is currently unavailable. Please use email sign-in or contact support.'); setLoading(false); return; }
      const initialize = () => {
        if (cancelled || !window.google?.accounts?.id || !container.current) return;
        clearInterval(timer); clearTimeout(timeout);
        window.google.accounts.id.initialize({
          client_id: config.clientId, nonce: config.nonce, ux_mode: 'popup',
          callback: async response => { if (!cancelled && response.credential) { const success = await callback.current(response.credential, config.nonce); if (!success && !cancelled) setRetry(value => value + 1); } },
        });
        window.google.accounts.id.renderButton(container.current, {type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: Math.min(320, container.current.clientWidth || 280)});
        setLoading(false);
      };
      timer = setInterval(initialize, 300);
      timeout = setTimeout(() => {clearInterval(timer); if (!cancelled) {setLoading(false); setError('Google could not load. Check your connection and try again.');}},12000);
      initialize();
    }).catch(() => {if (!cancelled) {setLoading(false); setError('Google sign-in could not connect. Please try again.');}});
    return () => {cancelled = true; clearInterval(timer); clearTimeout(timeout);};
  }, [retry]);
  return <div className="space-y-2">
    <div ref={container} className={`flex justify-center w-full min-h-10 ${disabled ? 'pointer-events-none opacity-50' : ''}`} aria-label="Sign in with Google" />
    {loading && <p role="status" className="text-xs text-center text-slate-500">Loading Google sign-in…</p>}
    {error && <div className="text-center text-xs text-slate-600"><p role="status">{error}</p><button type="button" className="mt-2 text-orange-600 font-semibold" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
  </div>;
}
