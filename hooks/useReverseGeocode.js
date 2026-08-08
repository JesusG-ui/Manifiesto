'use client';

import { useEffect, useRef, useState } from 'react';
import { reverseGeocode } from '../lib/data';

// Dado lat/lon, resuelve una dirección legible (Nominatim) con debounce,
// igual que hacía el prototipo al marcar o arrastrar un pin.
export function useReverseGeocode(lat, lon, delay = 600) {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (lat == null || lon == null) { setAddress(null); setLoading(false); return; }
    setLoading(true);
    setAddress(null);
    const mySeq = ++seqRef.current;
    const timer = setTimeout(async () => {
      let addr = null;
      try { addr = await reverseGeocode(lat, lon); } catch (e) { addr = null; }
      if (seqRef.current !== mySeq) return;
      setAddress(addr);
      setLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [lat, lon, delay]);

  return { address, loading };
}
