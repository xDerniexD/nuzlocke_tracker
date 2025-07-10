const express = require('express');
const router = express.Router();
const Nuzlocke = require('../models/Nuzlocke');
const { protect } = require('../middleware/authMiddleware');
const { nanoid } = require('nanoid');
const fs = require('fs');
const path = require('path');
const Pokemon = require('../models/Pokemon');

// POST /api/nuzlockes - Erstellen eines neuen Runs
router.post('/', protect, async (req, res) => {
  try {
    const { runName, game, type } = req.body;

    const filePath = path.join(__dirname, '..', 'data', 'platinum.json');
    const gameDataFile = fs.readFileSync(filePath, 'utf-8');
    const gameData = JSON.parse(gameDataFile);

    const timeline = [];

    gameData.locations.forEach(loc => {
      if (loc.hasStandardEncounter) { timeline.push({ encounterType: 'standard', locationName_de: loc.name.de, locationName_en: loc.name.en, sequence: loc.sequence }); }
      if (loc.staticEncounters && loc.staticEncounters.length > 0) { timeline.push({ encounterType: 'static', locationName_de: `${loc.name.de} (Static)`, locationName_en: `${loc.name.en} (Static)`, sequence: (loc.sequence || 999) + 0.1 }); }
      if (loc.giftPokemon && loc.giftPokemon.length > 0) {
        const giftEncounter = { encounterType: 'gift', locationName_de: `${loc.name.de} (Geschenk)`, locationName_en: `${loc.name.en} (Gift)`, sequence: (loc.sequence || 999) + 0.2, status1: 'gift' };
        if (type === 'soullink') { giftEncounter.status2 = 'gift'; }
        timeline.push(giftEncounter);
      }
    });

    (gameData.events || []).forEach(evt => {
      timeline.push({ encounterType: 'event', locationName_de: evt.name.de, locationName_en: evt.name.en, levelCap: evt.levelCap, badgeImage: evt.badgeImage, sequence: evt.sequence || 999 });
    });

    timeline.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));

    const initialEncounters = timeline.map(item => ({
      ...item,
      pokemon1: null, pokemonId1: null, types1: [], nickname1: null, status1: item.status1 || 'pending',
      pokemon2: null, pokemonId2: null, types2: [], nickname2: null, status2: item.status2 || 'pending',
    }));

    const newNuzlockeData = {
      runName, game, type,
      participants: [req.user._id],
      encounters: initialEncounters,
      spectatorId: nanoid(10)
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

// GET /api/nuzlockes/spectate/:spectatorId
router.get('/spectate/:spectatorId', async (req, res) => {
  try {
    const { spectatorId } = req.params;
    const nuzlocke = await Nuzlocke.findOne({ spectatorId }).populate('participants', 'username');
    if (!nuzlocke) return res.status(404).json({ message: 'Kein Run mit dieser Zuschauer-ID gefunden.' });
    res.json(nuzlocke);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Zuschauer-Runs.', error: error.message });
  }
});

// POST /api/nuzlockes/join
router.post('/join', protect, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user._id;
    const nuzlocke = await Nuzlocke.findOne({ inviteCode: inviteCode });
    if (!nuzlocke) return res.status(404).json({ message: "Kein Soullink mit diesem Code gefunden." });
    if (nuzlocke.participants.length >= 2) return res.status(400).json({ message: "Dieser Soullink ist bereits voll." });
    if (nuzlocke.participants.includes(userId)) return res.status(400).json({ message: "Du bist bereits Teilnehmer dieses Soullinks." });
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

// GET /api/nuzlockes
router.get('/', protect, async (req, res) => {
  try {
    const nuzlockes = await Nuzlocke.find({ participants: req.user._id });
    res.json(nuzlockes);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Nuzlockes', error: error.message });
  }
});

// GET /api/nuzlockes/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id).populate('participants', 'username');
    if (!nuzlocke) return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(401).json({ message: 'Nicht autorisiert.' });
    res.json(nuzlocke);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Nuzlocke-Runs', error: error.message });
  }
});

// PUT /api/nuzlockes/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const { updatedEncounter } = req.body;
    if (!updatedEncounter) {
      if (req.body.rules) return updateRules(req, res);
      return res.status(400).json({ message: 'Keine Encounter-Daten zum Aktualisieren gesendet.' });
    }
    const nuzlocke = await Nuzlocke.findById(req.params.id);
    if (!nuzlocke) return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(401).json({ message: 'Nicht autorisiert.' });
    const encounterIndex = nuzlocke.encounters.findIndex(e => e._id.toString() === updatedEncounter._id);
    if (encounterIndex === -1) return res.status(404).json({ message: 'Encounter in diesem Run nicht gefunden.' });

    const oldEncounter = nuzlocke.encounters[encounterIndex];
    const p1_newly_caught = (oldEncounter.status1 === 'pending' || oldEncounter.status1 === 'gift') && (updatedEncounter.status1 === 'caught');
    const p2_newly_caught = (oldEncounter.status2 === 'pending' || oldEncounter.status2 === 'gift') && (updatedEncounter.status2 === 'caught');

    nuzlocke.encounters[encounterIndex] = { ...oldEncounter.toObject(), ...updatedEncounter };

    if ((p1_newly_caught || p2_newly_caught) && nuzlocke.team.length < 6) {
      const encounterId = nuzlocke.encounters[encounterIndex]._id;
      if (!nuzlocke.team.some(teamMemberId => teamMemberId.equals(encounterId))) {
        nuzlocke.team.push(encounterId);
      }
    }

    nuzlocke.markModified('encounters');
    nuzlocke.markModified('team');

    const savedNuzlocke = await nuzlocke.save();
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

// Route: POST /api/nuzlockes/:id/legendary
router.post('/:id/legendary', protect, async (req, res) => {
  try {
    const { pokemonId, encounterType, playerId } = req.body; // playerId kann jetzt übergeben werden
    const nuzlocke = await Nuzlocke.findById(req.params.id);

    if (!nuzlocke) {
      return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    }
    // Der ausführende Nutzer muss Teilnehmer sein
    if (!nuzlocke.participants.some(p => p._id.equals(req.user._id))) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }

    // Bestimme die Spieler-ID: entweder die übergebene oder die des aktuellen Nutzers
    const targetPlayerId = playerId || req.user._id;

    let pokemonName = 'Generic'; // Standardname für generische Einträge

    // Wenn es keine generische Begegnung ist, suche den Pokémon-Namen
    if (pokemonId && pokemonId !== 0) {
      const legendaryPokemon = await Pokemon.findOne({ id: pokemonId });
      if (!legendaryPokemon) {
        return res.status(404).json({ message: 'Legendäres Pokémon nicht gefunden.' });
      }
      pokemonName = legendaryPokemon.name_en;
    }

    const newLegendaryEncounter = {
      pokemonId: pokemonId || 0, // 0 als ID für generische Einträge
      pokemonName,
      playerId: targetPlayerId,
      encounterType
    };

    nuzlocke.legendaryEncounters.push(newLegendaryEncounter);
    await nuzlocke.save();

    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:legendary_updated', nuzlocke.legendaryEncounters);

    res.status(201).json(nuzlocke.legendaryEncounters);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Hinzufügen der legendären Begegnung.', error: error.message });
  }
});

router.delete('/:id/legendary/generic/:playerId', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id);
    const { playerId } = req.params;

    if (!nuzlocke) return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    if (!nuzlocke.participants.some(p => p._id.equals(req.user._id))) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }

    // Finde den Index der letzten generischen Begegnung für den Zielspieler
    const encounterIndex = nuzlocke.legendaryEncounters
      .map(e => e.toObject()) // In Objekte umwandeln, um findLastIndex zu verwenden
      .findLastIndex(enc => enc.playerId.toString() === playerId && enc.pokemonId === 0);

    if (encounterIndex === -1) {
      // Es wurde keine generische Begegnung gefunden, die man entfernen könnte
      return res.status(404).json({ message: 'Keine generische legendäre Begegnung zum Entfernen gefunden.' });
    }

    nuzlocke.legendaryEncounters.splice(encounterIndex, 1);
    await nuzlocke.save();

    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:legendary_updated', nuzlocke.legendaryEncounters);

    res.json(nuzlocke.legendaryEncounters);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Entfernen der generischen Begegnung.', error: error.message });
  }
});

const updateRules = async (req, res) => {
  try {
    const { rules } = req.body;
    const nuzlocke = await Nuzlocke.findById(req.params.id);
    if (!nuzlocke) return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(401).json({ message: 'Nicht autorisiert.' });
    nuzlocke.rules = rules;
    const updatedNuzlocke = await nuzlocke.save();
    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:rules_updated', { rules: updatedNuzlocke.rules, senderId: req.user._id.toString() });
    res.json(updatedNuzlocke);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren der Regeln', error: error.message });
  }
};

router.put('/:id/rules', protect, updateRules);

router.delete('/:id', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id);
    if (!nuzlocke) return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(401).json({ message: 'Nicht autorisiert.' });
    await Nuzlocke.findByIdAndDelete(req.params.id);
    res.json({ message: 'Nuzlocke-Run erfolgreich gelöscht.' });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Löschen des Nuzlocke-Runs', error: error.message });
  }
});

router.put('/:id/archive', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id);
    if (!nuzlocke) return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(401).json({ message: 'Nicht autorisiert.' });
    nuzlocke.isArchived = !nuzlocke.isArchived;
    const updatedNuzlocke = await nuzlocke.save();
    res.json(updatedNuzlocke);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Archivieren des Runs', error: error.message });
  }
});

router.put('/:id/reorder', protect, async (req, res) => {
  try {
    const { reorderedEncounters } = req.body;
    if (!reorderedEncounters || !Array.isArray(reorderedEncounters)) {
      return res.status(400).json({ message: 'Ungültige Daten für die Neusortierung.' });
    }

    const nuzlocke = await Nuzlocke.findById(req.params.id);
    if (!nuzlocke) {
      return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    }

    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(401).json({ message: 'Nicht autorisiert.' });
    }

    const newOrderMap = new Map(reorderedEncounters.map(enc => [enc._id, enc.sequence]));
    nuzlocke.encounters.forEach(dbEncounter => {
      if (newOrderMap.has(dbEncounter._id.toString())) {
        dbEncounter.sequence = newOrderMap.get(dbEncounter._id.toString());
      }
    });

    const savedNuzlocke = await nuzlocke.save();

    // NEU: Sende ein Update an alle anderen im Raum
    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:reordered', {
      // Wir senden die komplette, neu sortierte Liste
      encounters: savedNuzlocke.encounters.sort((a, b) => (a.sequence || 999) - (b.sequence || 999)),
      senderId: req.user._id.toString()
    });

    res.json({ message: 'Reihenfolge erfolgreich aktualisiert.' });

  } catch (error) {
    console.error("Fehler bei der Neusortierung:", error);
    res.status(500).json({ message: 'Serverfehler bei der Neusortierung der Begegnungen.', error: error.message });
  }
});

router.put('/:id/team', protect, async (req, res) => {
  try {
    const { teamEncounterIds } = req.body;
    if (!Array.isArray(teamEncounterIds)) return res.status(400).json({ message: 'Ungültige Team-Daten.' });
    const nuzlocke = await Nuzlocke.findById(req.params.id);
    if (!nuzlocke) return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
    const isParticipant = nuzlocke.participants.some(p => p._id.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(401).json({ message: 'Nicht autorisiert.' });
    nuzlocke.team = teamEncounterIds;
    await nuzlocke.save();
    res.json({ message: 'Team erfolgreich gespeichert.', team: nuzlocke.team });
  } catch (error) {
    console.error("Fehler beim Speichern des Teams:", error);
    res.status(500).json({ message: 'Serverfehler beim Speichern des Teams.' });
  }
});

module.exports = router;