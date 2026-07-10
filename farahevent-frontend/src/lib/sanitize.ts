import sanitizeHtml from 'sanitize-html';

/**
 * Sanitisation du HTML éditorial (audit §07 — défense en profondeur : le
 * backend sanitise à l'entrée, le frontend re-sanitise au rendu). Liste
 * blanche alignée sur le contrat CMS (CONCEPTION_FRONTEND.md §5) : l'éditeur
 * Tiptap ne produit que ces balises. Utilisé par les sections About (RSC) —
 * la lib reste dans le bundle serveur.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li'],
    allowedAttributes: { a: ['href', 'rel', 'target'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // Les liens sortants n'héritent jamais de l'opener.
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true),
    },
  });
}
