'use client';

import { useRef, useState } from 'react';
import { autocompleteAddress, getPlaceDetails } from '../lib/data';

function newSessionToken() {
  return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
}

// Campo de dirección con sugerencias en vivo de Google Places, restringidas a
// Perú. Al elegir una sugerencia, `onSelect` recibe { address, lat, lon } ya
// resuelto — sin depender de que el geocodificador le achunte al texto libre.
export default function AddressAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef(newSessionToken());
  const debounceRef = useRef(null);

  function handleInput(e) {
    const text = e.target.value;
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.trim().length < 4) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await autocompleteAddress(text, sessionTokenRef.current);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch (e) { /* silencioso: el usuario siempre puede seguir escribiendo a mano */ }
      finally { setLoading(false); }
    }, 300);
  }

  async function handlePick(s) {
    setOpen(false);
    onChange(s.description);
    try {
      const details = await getPlaceDetails(s.placeId, sessionTokenRef.current);
      sessionTokenRef.current = newSessionToken(); // nueva sesión para la próxima búsqueda
      if (details) onSelect({ address: details.address || s.description, lat: details.lat, lon: details.lon });
    } catch (e) { /* si falla, el texto ya quedó puesto; puede buscar el pin a mano */ }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="tf-input"
        value={value}
        placeholder={placeholder}
        onChange={handleInput}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading ? <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 3 }}>Buscando…</div> : null}
      {open && suggestions.length > 0 ? (
        <div style={{
          position: 'absolute', zIndex: 30, background: '#fff', border: '1px solid var(--line-strong)',
          borderRadius: 6, width: '100%', marginTop: 4, maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 6px 16px rgba(0,0,0,.12)',
        }}>
          {suggestions.map(s => (
            <div
              key={s.placeId}
              onMouseDown={() => handlePick(s)}
              style={{ padding: '9px 11px', fontSize: 13.5, cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
            >
              {s.description}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
