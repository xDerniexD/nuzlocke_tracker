const express = require('express');
const router = express.Router();
const axios = require('axios');
const Pokemon = require('../models/Pokemon');
const Move = require('../models/Move');

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

router.get('/evolution-chain/:chainId', async (req, res) => {
    try {
        const { chainId } = req.params;
        const response = await axios.get(`https://pokeapi.co/api/v2/evolution-chain/${chainId}/`);
        
        let chain = response.data.chain;
        const evolutionPath = [];

        do {
            const speciesName = chain.species.name;
            const pokemon = await Pokemon.findOne({ name_slug: speciesName }).lean();
            const details = chain.evolution_details[0] || null;

            if (details && details.trigger.name === 'use-item') {
                try {
                    const itemRes = await axios.get(details.item.url);
                    details.item.name_de = itemRes.data.names.find(n => n.language.name === 'de')?.name || details.item.name;
                } catch { details.item.name_de = details.item.name; }
            }

            evolutionPath.push({
                pokemonId: pokemon?.id,
                name_en: pokemon?.name_en || speciesName,
                name_de: pokemon?.name_de || speciesName,
                evolution_details: details,
            });
            chain = chain.evolves_to[0];
        } while (!!chain && chain.hasOwnProperty('evolves_to'));

        res.json(evolutionPath);
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler beim Abrufen der Evolutionskette.' });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const pokemonId = parseInt(req.params.id, 10);
        if (isNaN(pokemonId)) return res.status(400).json({ message: "Ungültige Pokémon-ID." });
        
        const pokemon = await Pokemon.findOne({ id: pokemonId })
            .populate('abilities.ability')
            .lean();

        if (!pokemon) return res.status(404).json({ message: "Pokémon nicht gefunden." });

        const game = req.query.game || 'platinum';
        const gameMoves = pokemon.moves?.[game];

        if (gameMoves) {
            const moveIds = new Set();
            Object.values(gameMoves).forEach(methodMoves => {
                methodMoves.forEach(moveSlot => { if (moveSlot.move) moveIds.add(moveSlot.move); });
            });

            const moveDetails = await Move.find({ _id: { $in: Array.from(moveIds) } }).lean();
            const moveMap = new Map(moveDetails.map(m => [m._id.toString(), m]));

            Object.keys(gameMoves).forEach(method => {
                gameMoves[method] = gameMoves[method].map(moveSlot => ({
                    ...moveSlot,
                    move: moveMap.get(moveSlot.move.toString())
                })).filter(ms => ms.move);
            });
        }
        
        res.json(pokemon);
    } catch (error) {
        console.error("Fehler beim Abrufen der Pokémon-Details:", error);
        res.status(500).json({ message: "Serverfehler." });
    }
});

module.exports = router;