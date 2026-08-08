'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { fixLeafletIcons } from '../../lib/leafletIcons';

const DEFAULT_CENTER = [-9.19, -75.02];

// Mini mapa con un marcador arrastrable, para elegir el punto exacto de entrega.
// Usado por el módulo "Nuevo paquete" y por "Ajustar ubicación".
export default function PinPickerMap({ lat, lon, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    fixLeafletIcons();
    if (!containerRef.current || mapRef.current) return;
    const center = (lat && lon) ? [lat, lon] : DEFAULT_CENTER;
    const zoom = (lat && lon) ? 16 : 6;
    const map = L.map(containerRef.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    mapRef.current = map;

    if (lat && lon) {
      markerRef.current = L.marker([lat, lon], { draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        onChange(p.lat, p.lng);
      });
    }
    map.on('click', (e) => {
      onChange(e.latlng.lat, e.latlng.lng);
      if (markerRef.current) markerRef.current.setLatLng(e.latlng);
      else {
        markerRef.current = L.marker(e.latlng, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const p = markerRef.current.getLatLng();
          onChange(p.lat, p.lng);
        });
      }
    });
    setTimeout(() => map.invalidateSize(), 80);

    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el padre "vuela" a una nueva ubicación (ej. tras geocodificar una dirección escrita).
  useEffect(() => {
    if (!mapRef.current || !lat || !lon) return;
    mapRef.current.setView([lat, lon], Math.max(mapRef.current.getZoom(), 15));
    if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
    else {
      markerRef.current = L.marker([lat, lon], { draggable: true }).addTo(mapRef.current);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        onChange(p.lat, p.lng);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  return <div ref={containerRef} className="mini-map" />;
}
