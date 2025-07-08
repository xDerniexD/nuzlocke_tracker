const express = require('express');
const router = express.Router();
const Pokemon = require('../models/Pokemon');
const Move = require('../models/Move');

// Die Suche bleibt unverändert
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        if (query.length < 2) return res.json([]);
        const searchRegex = new RegExp(query, 'i');
        const results = await Pokemon.find({ $or: [{ name_de: searchRegex }, { name_en: searchRegex }] }).limit(15);
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: "Fehler bei der Pokémon-Suche." });
    }
});

// KORREKTUR: Wir verwenden eine robustere, manuelle Methode zum Verknüpfen der Daten
router.get('/:id', async (req, res) => {
    try {
        const pokemonId = parseInt(req.params.id, 10);
        if (isNaN(pokemonId)) {
            return res.status(400).json({ message: "Ungültige Pokémon-ID." });
        }

        // 1. Pokémon als reines JavaScript-Objekt aus der DB holen
        const pokemon = await Pokemon.findOne({ id: pokemonId }).lean();

        if (!pokemon) {
            return res.status(404).json({ message: "Pokémon nicht gefunden." });
        }

        // 2. Prüfen, ob Attacken für "platinum" vorhanden sind
        if (pokemon.moves && pokemon.moves.platinum) {
            // 3. Alle einzigartigen Attacken-IDs aus dem Pokémon-Dokument sammeln
            const moveIds = new Set();
            Object.values(pokemon.moves.platinum).forEach(methodMoves => {
                methodMoves.forEach(move => {
                    if(move.move) moveIds.add(move.move);
                });
            });

            // 4. Alle benötigten Attacken-Details in einer einzigen Datenbank-Anfrage abrufen
            const moveDetails = await Move.find({ _id: { $in: Array.from(moveIds) } }).lean();
            const moveMap = new Map(moveDetails.map(m => [m._id.toString(), m]));

            // 5. Die vollständigen Attacken-Details in das Pokémon-Objekt einfügen
            Object.keys(pokemon.moves.platinum).forEach(method => {
                pokemon.moves.platinum[method] = pokemon.moves.platinum[method].map(move => {
                    const details = moveMap.get(move.move.toString());
                    return { ...move, ...details }; // Alte Infos (level) mit neuen Details kombinieren
                }).filter(move => move.id); // Nur Attacken behalten, die gefunden wurden
            });
        }

        res.json(pokemon);

    } catch (error) {
        console.error("Fehler beim Abrufen der Pokémon-Details:", error);
        res.status(500).json({ message: "Serverfehler." });
    }
});

module.exports = router;