'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { fixLeafletIcons } from '../../lib/leafletIcons';
import { STATUS, STATUS_MAP_COLOR } from '../StatusBadge';
import { geocodeAddress } from '../../lib/data';
import { useToast } from '../Toast';

const DEFAULT_CENTER = [-9.19, -75.02];

// Mapa de vista general (todos los paquetes, o los de un repartidor), con búsqueda de dirección.
export default function FullMap({ packages }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tempPinRef = useRef(null);
  const [query, setQuery] = useState('');
  const showToast = useToast();

  useEffect(() => {
    fixLeafletIcons();
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pts = [];
    packages.forEach(p => {
      if (p.lat && p.lon) {
        const color = STATUS_MAP_COLOR[p.status] || '#666';
        const marker = L.circleMarker([p.lat, p.lon], { radius: 8, color, fillColor: color, fillOpacity: .85, weight: 2 });
        marker.bindPopup(`<b>${p.recipient}</b><br>${p.address}<br><span style="color:${color};font-weight:600;">${STATUS[p.status].label}</span>`);
        marker.addTo(layer);
        pts.push([p.lat, p.lon]);
      }
    });
    if (pts.length > 0) map.fitBounds(pts, { padding: [30, 30], maxZoom: 14 });
  }, [packages]);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    try {
      const r = await geocodeAddress(q);
      if (r && mapRef.current) {
        mapRef.current.setView([r.lat, r.lon], 15);
        if (tempPinRef.current) mapRef.current.removeLayer(tempPinRef.current);
        tempPinRef.current = L.marker([r.lat, r.lon]).addTo(mapRef.current).bindPopup(r.display).openPopup();
      } else showToast('No se encontró esa dirección.', 'err');
    } catch (e) { showToast('Error al buscar dirección.', 'err'); }
  }

  return (
    <>
      <div className="map-search-row">
        <input
          className="tf-input"
          placeholder="Buscar una dirección para ubicarla en el mapa…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button className="btn" onClick={handleSearch}>Buscar</button>
      </div>
      <div ref={containerRef} id="map" />
      <div className="legend-row">
        <span><span className="legend-dot" style={{ background: STATUS_MAP_COLOR.pendiente }}></span>Pendiente</span>
        <span><span className="legend-dot" style={{ background: STATUS_MAP_COLOR.asignado }}></span>Asignado</span>
        <span><span className="legend-dot" style={{ background: STATUS_MAP_COLOR.en_camino }}></span>En camino</span>
        <span><span className="legend-dot" style={{ background: STATUS_MAP_COLOR.entregado }}></span>Entregado</span>
        <span><span className="legend-dot" style={{ background: STATUS_MAP_COLOR.incidencia }}></span>Incidencia</span>
      </div>
    </>
  );
}
