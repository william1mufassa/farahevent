/** Helpers purs de manipulation de listes ordonnées (onglets CRUD CMS). */

export const swap = <T>(arr: T[], i: number, j: number): T[] => {
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

export const removeAt = <T>(arr: T[], i: number): T[] => arr.filter((_, k) => k !== i);

export const replaceAt = <T>(arr: T[], i: number, v: T): T[] =>
  arr.map((x, k) => (k === i ? v : x));

/** Réaffecte sort_order = position (à appeler après chaque mutation d'ordre). */
export const renumber = <T extends { sort_order: number }>(arr: T[]): T[] =>
  arr.map((x, i) => ({ ...x, sort_order: i }));

/** Identifiant local pour un nouvel élément (remplacé par l'id backend au save). */
export const newId = (prefix: string): string =>
  `${prefix}_${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`;
