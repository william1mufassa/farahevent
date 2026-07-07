import { notFound } from 'next/navigation';

/**
 * Catch-all : toute URL publique inconnue déclenche notFound(),
 * ce qui rend la 404 localisée de la branche ([locale]/not-found.tsx).
 * Sans ce fichier, Next servirait la 404 par défaut non stylée.
 */
export default function CatchAllPage() {
  notFound();
}
