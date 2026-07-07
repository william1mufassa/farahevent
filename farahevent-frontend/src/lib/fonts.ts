import { Archivo, Inter, Playfair_Display } from 'next/font/google';

/**
 * Trois familles self-hostées via next/font :
 * - sans    : corps de texte partout + admin
 * - serif   : titres des templates A (KEYNOTE) et C (DIRECTOR'S CUT)
 * - display : titres massifs des templates B (SPOTLIGHT) et D (PULSE), marquee
 */
export const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const fontSerif = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const fontDisplay = Archivo({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const fontVariables = `${fontSans.variable} ${fontSerif.variable} ${fontDisplay.variable}`;
