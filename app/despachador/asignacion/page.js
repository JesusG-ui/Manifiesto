// Ruta obsoleta: la asignación ahora se hace desde la lista de paquetes en /despachador.
import { redirect } from 'next/navigation';

export default function AsignacionRedirect() {
  redirect('/despachador');
}
