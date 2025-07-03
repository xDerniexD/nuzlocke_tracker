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

    const timeline = [];

    gameData.locations.forEach(loc => {
      // 1. Standard-Encounter
      if (loc.hasStandardEncounter) {
        timeline.push({
          encounterType: 'standard',
          locationName_de: loc.name.de,
          locationName_en: loc.name.en,
          sequence: loc.sequence,
        });
      }
      
      // 2. KORREKTUR: Statische Encounter (nur eine Zeile, wenn vorhanden)
      if (loc.staticEncounters && loc.staticEncounters.length > 0) {
        timeline.push({
          encounterType: 'static',
          locationName_de: `${loc.name.de} (Static)`,
          locationName_en: `${loc.name.en} (Static)`,
          sequence: (loc.sequence || 999) + 0.1,
        });
      }
      
      // 3. KORREKTUR: Geschenk-Pokémon (nur eine Zeile, wenn vorhanden)
      if (loc.giftPokemon && loc.giftPokemon.length > 0) {
        const giftEncounter = {
          encounterType: 'gift',
          locationName_de: `${loc.name.de} (Geschenk)`,
          locationName_en: `${loc.name.en} (Gift)`,
          sequence: (loc.sequence || 999) + 0.2,
          status1: 'gift',
        };
        if (type === 'soullink') {
          giftEncounter.status2 = 'gift';
        }
        timeline.push(giftEncounter);
      }
    });

    (gameData.events || []).forEach(evt => {
      timeline.push({
        encounterType: 'event',
        locationName_de: evt.name.de,
        locationName_en: evt.name.en,
        levelCap: evt.levelCap,
        badgeImage: evt.badgeImage,
        sequence: evt.sequence || 999
      });
    });

    timeline.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));

    const initialEncounters = timeline.map(item => ({
      ...item,
      pokemon1: item.pokemon1 || null, 
      pokemonId1: null, types1: [], nickname1: null, 
      status1: item.status1 || 'pending',
      pokemon2: null, pokemonId2: null, types2: [], nickname2: null, 
      status2: item.status2 || 'pending',
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
    
    await nuzlocke.save();
    await nuzlocke.populate('participants', 'username');
    
    const io = req.app.get('socketio');
    io.to(nuzlocke._id.toString()).emit('nuzlocke:updated', nuzlocke);

    res.json(nuzlocke);

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

// PUT /api/nuzlockes/:id - Einen Run aktualisieren (wird jetzt für gezielte Encounter-Updates genutzt)
router.put('/:id', protect, async (req, res) => {
  try {
    const { updatedEncounter } = req.body;
    if (!updatedEncounter) {
      // Behalte die alte Logik für Regeln als Fallback
      if(req.body.rules) {
        return updateRules(req, res);
      }
      return res.status(400).json({ message: 'Keine Encounter-Daten zum Aktualisieren gesendet.' });
    }

    const nuzlocke = await Nuzlocke.findById(req.params.id);

    if (!nuzlocke) {
      return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    }
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }

    const encounterIndex = nuzlocke.encounters.findIndex(e => e._id.toString() === updatedEncounter._id);
    if (encounterIndex === -1) {
      return res.status(404).json({ message: 'Encounter in diesem Run nicht gefunden.' });
    }

    nuzlocke.encounters[encounterIndex] = updatedEncounter;
    nuzlocke.markModified('encounters');
    
    const savedNuzlocke = await nuzlocke.save();
    await savedNuzlocke.populate('participants', 'username');

    const finalUpdatedEncounter = savedNuzlocke.encounters[encounterIndex];

    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:updated', {
      updatedEncounter: finalUpdatedEncounter,
      senderId: req.user._id.toString()
    });
    
    res.json(finalUpdatedEncounter);

  } catch (error) {
    console.error("Update-Fehler:", error);
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Nuzlocke-Runs', error: error.message });
  }
});

// Helper function für die PUT-Route, um die Lesbarkeit zu verbessern
const updateRules = async (req, res) => {
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
        await updatedNuzlocke.populate('participants', 'username');
        
        const io = req.app.get('socketio');
        io.to(req.params.id).emit('nuzlocke:rules_updated', {
            rules: updatedNuzlocke.rules,
            senderId: req.user._id.toString()
        });

        res.json(updatedNuzlocke);
    } catch(error) {
        res.status(500).json({ message: 'Serverfehler beim Aktualisieren der Regeln', error: error.message });
    }
};

// PUT /api/nuzlockes/:id/rules - Regeln für einen Run aktualisieren
router.put('/:id/rules', protect, updateRules);

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