import { extendTheme } from '@chakra-ui/react';

// Wir definieren unsere eigene Farbpalette
const colors = {
  brand: {
    900: '#d53f8c', // Dunkles Pink/Lila
    800: '#ed64a6',
    700: '#f687b3', // Haupt-Akzentfarbe (ein schönes Pink)
  },
  pokemon: {
    red: '#f44336',
    blue: '#2196f3',
    yellow: '#ffeb3b',
  }
};

// Wir definieren die neuen Schriftarten
const fonts = {
  heading: `'Poppins', sans-serif`,
  body: `'Poppins', sans-serif`,
};

// Wir erstellen das Theme-Objekt und exportieren es
const theme = extendTheme({
  colors,
  fonts,
});

export default theme;
