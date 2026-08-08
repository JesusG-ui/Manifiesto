// Ruta obsoleta: importar CSV ahora vive como modal dentro de /despachador.
import { redirect } from 'next/navigation';

export default function ImportarRedirect() {
  redirect('/despachador');
}
