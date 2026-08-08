// Arregla los íconos por defecto de Leaflet, que se rompen al empaquetar con Next.js/Webpack.
// Importar una sola vez en cualquier componente que use L.marker(...).
import L from 'leaflet';

let fixed = false;
export function fixLeafletIcons() {
  if (fixed) return;
  fixed = true;
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}
