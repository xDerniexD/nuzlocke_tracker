const express = require('express');
const router = express.Router();
const Pokemon = require('../models/Pokemon'); // Wir benötigen das Model hier

// GET /api/pokemon/search - Sucht nach Pokémon
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        if (query.length < 2) {
            return res.json([]);
        }

        const searchRegex = new RegExp(query, 'i');

        const results = await Pokemon.find({
            $or: [
                { name_de: searchRegex },
                { name_en: searchRegex }
            ]
        }).limit(15);

        res.json(results);

    } catch (error) {
        res.status(500).json({ message: "Fehler bei der Pokémon-Suche." });
    }
});

// GET /api/pokemon/:id - Ruft ein einzelnes Pokémon anhand seiner ID ab
router.get('/:id', async (req, res) => {
    try {
        const pokemonId = parseInt(req.params.id, 10);
        if (isNaN(pokemonId)) {
            return res.status(400).json({ message: "Ungültige Pokémon-ID." });
        }

        const pokemon = await Pokemon.findOne({ id: pokemonId });

        if (!pokemon) {
            return res.status(404).json({ message: "Pokémon nicht gefunden." });
        }

        res.json(pokemon);

    } catch (error) {
        console.error("Fehler beim Abrufen der Pokémon-Details:", error);
        res.status(500).json({ message: "Serverfehler." });
    }
});

module.exports = router;