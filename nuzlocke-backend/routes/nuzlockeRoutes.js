const express = require('express');
const router = express.Router();
const Nuzlocke = require('../models/Nuzlocke');
const { protect } = require('../middleware/authMiddleware');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');

// POST /api/nuzlockes - Erstellen eines neuen Runs
router.post('/', protect, async (req, res) => {
  try {
    const { runName, game, type } = req.body;
    
    const filePath = path.join(__dirname, '..', 'data', 'platinum.json');
    const gameDataFile = fs.readFileSync(filePath, 'utf-8');
    const gameData = JSON.parse(gameDataFile);

    const validEncounterLocations = gameData.locations.filter(loc => 
      loc.hasStandardEncounter === true ||
      (loc.staticEncounters && loc.staticEncounters.length > 0) ||
      (loc.giftPokemon && loc.giftPokemon.length > 0)
    );

    const encounterItems = validEncounterLocations.map(loc => ({
      isEncounter: true,
      locationName: loc.name.de || loc.name.en,
      sequence: loc.sequence,
    }));

    const eventItems = (gameData.events || []).map(evt => ({
      isEvent: true,
      locationName: evt.name.de || evt.name.en,
      levelCap: evt.levelCap,
      badgeImage: evt.badgeImage,
      sequence: evt.sequence || 999
    }));

    const timeline = [...encounterItems, ...eventItems];
    timeline.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));

    const initialEncounters = timeline.map(item => ({
      ...item,
      pokemon1: null, pokemonId1: null, types1: [], nickname1: null, status1: 'pending',
      pokemon2: null, pokemonId2: null, types2: [], nickname2: null, status2: 'pending',
    }));

    const newNuzlockeData = {
      runName, game, type,
      participants: [req.user._id],
      encounters: initialEncounters
    };
    
    if (type === 'soullink') {
      newNuzlockeData.inviteCode = nanoid(6);
    }

    const nuzlocke = new Nuzlocke(newNuzlockeData);
    const createdNuzlocke = await nuzlocke.save();
    res.status(201).json(createdNuzlocke);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Serverfehler beim Erstellen des Nuzlocke-Runs', error: error.message });
  }
});

// POST /api/nuzlockes/join - Einem Soullink beitreten
router.post('/join', protect, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user._id;

    const nuzlocke = await Nuzlocke.findOne({ inviteCode: inviteCode });

    if (!nuzlocke) {
      return res.status(404).json({ message: "Kein Soullink mit diesem Code gefunden." });
    }
    if (nuzlocke.participants.length >= 2) {
      return res.status(400).json({ message: "Dieser Soullink ist bereits voll." });
    }
    if (nuzlocke.participants.includes(userId)) {
      return res.status(400).json({ message: "Du bist bereits Teilnehmer dieses Soullinks." });
    }

    nuzlocke.participants.push(userId);
    nuzlocke.inviteCode = undefined; 
    
    const updatedNuzlocke = await nuzlocke.save();
    res.json(updatedNuzlocke);

  } catch (error) {
     res.status(500).json({ message: 'Serverfehler beim Beitreten des Soullinks', error: error.message });
  }
});

// GET /api/nuzlockes - Alle Runs eines Nutzers abrufen
router.get('/', protect, async (req, res) => {
  try {
    const nuzlockes = await Nuzlocke.find({ participants: req.user._id });
    res.json(nuzlockes);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Nuzlockes', error: error.message });
  }
});

// GET /api/nuzlockes/:id - Einen einzelnen Run abrufen
router.get('/:id', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id).populate('participants', 'username');
    if (!nuzlocke) {
      return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    }
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }
    res.json(nuzlocke);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Nuzlocke-Runs', error: error.message });
  }
});

// PUT /api/nuzlockes/:id - Einen Run aktualisieren
router.put('/:id', protect, async (req, res) => {
  try {
    const { encounters } = req.body;
    const nuzlocke = await Nuzlocke.findById(req.params.id);

    if (!nuzlocke) {
      return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    }
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }

    nuzlocke.encounters = encounters;
    const updatedNuzlocke = await nuzlocke.save();

    const io = req.app.get('socketio');
    const roomId = req.params.id;
    io.to(roomId).emit('nuzlocke:updated', updatedNuzlocke);
    
    res.json(updatedNuzlocke);

  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Nuzlocke-Runs', error: error.message });
  }
});

// WIEDERHERGESTELLT: PUT /api/nuzlockes/:id/rules - Regeln für einen Run aktualisieren
router.put('/:id/rules', protect, async (req, res) => {
  try {
    const { rules } = req.body;
    const nuzlocke = await Nuzlocke.findById(req.params.id);

    if (!nuzlocke) {
      return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    }

    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }

    nuzlocke.rules = rules;
    const updatedNuzlocke = await nuzlocke.save();
    
    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:updated', updatedNuzlocke);

    res.json(updatedNuzlocke);

  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren der Regeln', error: error.message });
  }
});

// DELETE /api/nuzlockes/:id - Einen Run löschen
router.delete('/:id', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id);

    if (!nuzlocke) {
      return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    }

    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }

    await Nuzlocke.findByIdAndDelete(req.params.id);

    res.json({ message: 'Nuzlocke-Run erfolgreich gelöscht.' });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Löschen des Nuzlocke-Runs', error: error.message });
  }
});

// PUT /api/nuzlockes/:id/archive - Einen Run archivieren/de-archivieren
router.put('/:id/archive', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id);

    if (!nuzlocke) {
      return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    }

    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }

    nuzlocke.isArchived = !nuzlocke.isArchived;
    const updatedNuzlocke = await nuzlocke.save();
    res.json(updatedNuzlocke);

  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Archivieren des Runs', error: error.message });
  }
});


module.exports = router;
