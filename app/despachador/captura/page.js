// Ruta obsoleta: la captura rápida ahora vive como modal dentro de /despachador.
import { redirect } from 'next/navigation';

export default function CapturaRapidaRedirect() {
  redirect('/despachador');
}
