// Ruta obsoleta: el mapa ahora es una vista dentro de /despachador (botón "Ver mapa").
import { redirect } from 'next/navigation';

export default function MapaRedirect() {
  redirect('/despachador');
}
