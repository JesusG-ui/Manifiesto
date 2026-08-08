'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

const DEFAULT_CENTER = [-9.19, -75.02];

// Mapa de ruta: un punto numerado por parada, en el orden elegido, con una
// línea punteada uniéndolos para visualizar el recorrido.
export default function RouteMap({ stops }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const located = stops.filter(s => s.pkg.lat && s.pkg.lon);
    const pts = [];
    located.forEach(s => {
      const icon = L.divIcon({
        className: 'route-marker',
        html: `<div class="route-marker-dot">${s.order}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const marker = L.marker([s.pkg.lat, s.pkg.lon], { icon });
      marker.bindPopup(`<b>${s.order}. ${s.pkg.recipient}</b><br>${s.pkg.address}`);
      marker.addTo(layer);
      pts.push([s.pkg.lat, s.pkg.lon]);
    });
    if (pts.length > 1) L.polyline(pts, { color: '#5B5FC7', weight: 3, dashArray: '6 8', opacity: .7 }).addTo(layer);
    if (pts.length > 0) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
  }, [stops]);

  return <div ref={containerRef} id="map" />;
}
