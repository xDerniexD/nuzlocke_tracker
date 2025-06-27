// Schritt 1: Wir importieren die Axios-Bibliothek, die wir gerade installiert haben.
const axios = require('axios');

// Schritt 2: Wir definieren eine Funktion, die die Daten abruft.
// Wir benutzen 'async', weil eine Anfrage über das Internet Zeit braucht.
async function fetchPokemonData() {
  try {
    // Schritt 3: Wir senden eine GET-Anfrage an die PokéAPI.
    // 'await' pausiert die Funktion, bis wir eine Antwort erhalten.
    // Wir fragen hier testweise die Daten für das Pokémon "Ditto" an.
    const response = await axios.get('https://pokeapi.co/api/v2/pokemon/ditto');

    // Schritt 4: Wir verarbeiten die Antwort.
    // Die eigentlichen Daten stecken in 'response.data'.
    const pokemon = response.data;

    // Schritt 5: Wir geben ein paar interessante Daten in der Konsole aus.
    console.log('--- Pokémon-Daten erfolgreich abgerufen! ---');
    console.log(`Name: ${pokemon.name}`);
    console.log(`ID: ${pokemon.id}`);
    console.log(`Typ: ${pokemon.types[0].type.name}`);
    console.log('-------------------------------------------');

  } catch (error) {
    // Falls etwas schiefgeht (z.B. keine Internetverbindung), fangen wir den Fehler ab.
    console.error('Ein Fehler ist aufgetreten:', error.message);
  }
}

// Schritt 6: Wir rufen die Funktion auf, um das Skript zu starten.
fetchPokemonData();