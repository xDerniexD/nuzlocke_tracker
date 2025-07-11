const express = require('express');
const router = express.Router();
const Nuzlocke = require('../models/Nuzlocke');
const Pokemon = require('../models/Pokemon'); // Importiert für den Zugriff auf Pokémon-Daten
const { protect } = require('../middleware/authMiddleware');
const { checkEditAccess } = require('../middleware/accessMiddleware'); // Die neue Berechtigungs-Middleware
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
      editors: [], // Initial leeres Editor-Array
      encounters: initialEncounters,
      spectatorId: nanoid(10),
      editorInviteCode: nanoid(8) // Initial einen Editor-Code erstellen
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

// POST /api/nuzlockes/join - Für Soullink-Partner
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

// GET /api/nuzlockes - Holt alle Runs eines Benutzers (als Teilnehmer oder Editor)
router.get('/', protect, async (req, res) => {
  try {
    const nuzlockes = await Nuzlocke.find({
      $or: [
        { participants: req.user._id },
        { editors: req.user._id }
      ]
    })

      .populate('participants', 'username')
      .populate('editors', 'username');

    res.json(nuzlockes);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen der Nuzlockes', error: error.message });
  }
});

// NEU: DELETE /api/nuzlockes/:id/editor/:editorId - Entfernt einen Editor aus einem Run
router.delete('/:id/editor/:editorId', protect, async (req, res) => {
  try {
    const { id, editorId } = req.params;
    const nuzlocke = await Nuzlocke.findById(id);

    if (!nuzlocke) {
      return res.status(404).json({ message: 'Run nicht gefunden.' });
    }

    // Sicherheitsprüfung: Nur Teilnehmer (Besitzer) dürfen Editoren entfernen
    if (!nuzlocke.participants.some(p => p.equals(req.user._id))) {
      return res.status(403).json({ message: 'Nur Teilnehmer können Editoren entfernen.' });
    }

    // Entferne den Editor aus dem Array
    nuzlocke.editors.pull(editorId);
    await nuzlocke.save();

    // Lade die aktualisierten Editoren-Daten, um sie zurückzusenden
    const updatedNuzlocke = await Nuzlocke.findById(id).populate('editors', 'username');

    // Optional: Informiere andere Clients über das Update (nicht zwingend notwendig für diese Aktion)

    res.json(updatedNuzlocke.editors);

  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Entfernen des Editors.', error: error.message });
  }
});

// GET /api/nuzlockes/:id - Holt einen spezifischen Run
router.get('/:id', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id).populate('participants', 'username').populate('editors', 'username');
    if (!nuzlocke) return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });

    const isParticipant = nuzlocke.participants.some(p => p._id.equals(req.user._id));
    const isEditor = nuzlocke.editors.some(e => e._id.equals(req.user._id));

    if (!isParticipant && !isEditor) {
      return res.status(403).json({ message: 'Nicht autorisiert.' });
    }
    res.json(nuzlocke);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Nuzlocke-Runs', error: error.message });
  }
});

// POST /api/nuzlockes/:id/invite-editor - Generiert/holt einen Einladungscode für Editoren
router.post('/:id/invite-editor', protect, async (req, res) => {
  try {
    const nuzlocke = await Nuzlocke.findById(req.params.id);
    if (!nuzlocke) return res.status(404).json({ message: 'Run nicht gefunden.' });

    if (!nuzlocke.participants.some(p => p.equals(req.user._id))) {
      return res.status(403).json({ message: 'Nur Teilnehmer können Editoren einladen.' });
    }

    if (!nuzlocke.editorInviteCode) {
      nuzlocke.editorInviteCode = nanoid(8);
      await nuzlocke.save();
    }

    res.json({ editorInviteCode: nuzlocke.editorInviteCode });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Erstellen des Einladungscodes.' });
  }
});

// POST /api/nuzlockes/join-editor - Ein Editor tritt einem Run bei
router.post('/join-editor', protect, async (req, res) => {
  try {
    const { editorInviteCode } = req.body;
    if (!editorInviteCode) return res.status(400).json({ message: 'Einladungscode fehlt.' });

    const nuzlocke = await Nuzlocke.findOne({ editorInviteCode });
    if (!nuzlocke) return res.status(404).json({ message: 'Kein Run mit diesem Code gefunden.' });
    if (nuzlocke.participants.some(p => p.equals(req.user._id)) || nuzlocke.editors.some(e => e.equals(req.user._id))) {
      return res.status(400).json({ message: 'Du bist bereits Teil dieses Runs.' });
    }

    nuzlocke.editors.push(req.user._id);
    await nuzlocke.save();

    res.json({ message: 'Erfolgreich als Editor beigetreten!', runId: nuzlocke._id });
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Beitreten als Editor.' });
  }
});

// --- GESCHÜTZTE ROUTEN FÜR TEILNEHMER & EDITOREN ---
router.use('/:id', protect, checkEditAccess); // Alle folgenden Routen nutzen die Middleware

// PUT /api/nuzlockes/:id - Aktualisiert einen Encounter
router.put('/:id', async (req, res) => {
  try {
    const nuzlocke = req.nuzlocke; // von Middleware
    const { updatedEncounter } = req.body;

    if (!updatedEncounter) {
      return res.status(400).json({ message: 'Keine Encounter-Daten zum Aktualisieren gesendet.' });
    }

    const encounterIndex = nuzlocke.encounters.findIndex(e => e._id.toString() === updatedEncounter._id);
    if (encounterIndex === -1) return res.status(404).json({ message: 'Encounter nicht gefunden.' });

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

    await nuzlocke.save();

    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:updated', { updatedEncounter: nuzlocke.encounters[encounterIndex], senderId: req.user._id.toString() });
    res.json(nuzlocke.encounters[encounterIndex]);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Encounters.', error: error.message });
  }
});

// PUT /api/nuzlockes/:id/rules - Aktualisiert die Regeln
router.put('/:id/rules', async (req, res) => {
  try {
    const { rules } = req.body;
    const nuzlocke = req.nuzlocke;
    nuzlocke.rules = rules;
    await nuzlocke.save();
    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:rules_updated', { rules: nuzlocke.rules, senderId: req.user._id.toString() });
    res.json(nuzlocke);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren der Regeln', error: error.message });
  }
});

// DELETE /api/nuzlockes/:id - Löscht einen Run
router.delete('/:id', async (req, res) => {
  try {
    await Nuzlocke.findByIdAndDelete(req.params.id);
    res.json({ message: 'Nuzlocke-Run erfolgreich gelöscht.' });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Löschen des Nuzlocke-Runs', error: error.message });
  }
});

// PUT /api/nuzlockes/:id/archive - Archiviert/de-archiviert einen Run
router.put('/:id/archive', async (req, res) => {
  try {
    const nuzlocke = req.nuzlocke;
    nuzlocke.isArchived = !nuzlocke.isArchived;
    const updatedNuzlocke = await nuzlocke.save();
    res.json(updatedNuzlocke);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Archivieren des Runs', error: error.message });
  }
});

// PUT /api/nuzlockes/:id/reorder - Sortiert die Encounter neu
router.put('/:id/reorder', async (req, res) => {
  try {
    const { reorderedEncounters } = req.body;
    if (!reorderedEncounters || !Array.isArray(reorderedEncounters)) {
      return res.status(400).json({ message: 'Ungültige Daten für die Neusortierung.' });
    }
    const nuzlocke = req.nuzlocke;
    const newOrderMap = new Map(reorderedEncounters.map(enc => [enc._id, enc.sequence]));
    nuzlocke.encounters.forEach(dbEncounter => {
      if (newOrderMap.has(dbEncounter._id.toString())) {
        dbEncounter.sequence = newOrderMap.get(dbEncounter._id.toString());
      }
    });
    const savedNuzlocke = await nuzlocke.save();
    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:reordered', {
      encounters: savedNuzlocke.encounters.sort((a, b) => (a.sequence || 999) - (b.sequence || 999)),
      senderId: req.user._id.toString()
    });
    res.json({ message: 'Reihenfolge erfolgreich aktualisiert.' });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler bei der Neusortierung.', error: error.message });
  }
});

// PUT /api/nuzlockes/:id/team - Speichert das Team
router.put('/:id/team', async (req, res) => {
  try {
    const { teamEncounterIds } = req.body;
    if (!Array.isArray(teamEncounterIds)) return res.status(400).json({ message: 'Ungültige Team-Daten.' });
    const nuzlocke = req.nuzlocke;
    nuzlocke.team = teamEncounterIds;
    await nuzlocke.save();
    res.json({ message: 'Team erfolgreich gespeichert.', team: nuzlocke.team });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Speichern des Teams.' });
  }
});

// POST /api/nuzlockes/:id/legendary - Fügt legendäre Begegnung hinzu
router.post('/:id/legendary', async (req, res) => {
  try {
    const { pokemonId, encounterType, playerId } = req.body;
    const nuzlocke = req.nuzlocke;
    const targetPlayerId = playerId || req.user._id;

    let pokemonName = 'Generic';
    if (pokemonId && pokemonId !== 0) {
      const legendaryPokemon = await Pokemon.findOne({ id: pokemonId });
      if (!legendaryPokemon) return res.status(404).json({ message: 'Pokémon nicht gefunden.' });
      pokemonName = legendaryPokemon.name_en;
    }

    nuzlocke.legendaryEncounters.push({
      pokemonId: pokemonId || 0,
      pokemonName,
      playerId: targetPlayerId,
      encounterType
    });
    await nuzlocke.save();

    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:legendary_updated', nuzlocke.legendaryEncounters);
    res.status(201).json(nuzlocke.legendaryEncounters);
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Hinzufügen der legendären Begegnung.', error: error.message });
  }
});

// DELETE /api/nuzlockes/:id/legendary/:legendaryId - Entfernt spezifische legendäre Begegnung
router.delete('/:id/legendary/:legendaryEncounterId', async (req, res) => {
  try {
    const nuzlocke = req.nuzlocke;
    const encounterIndex = nuzlocke.legendaryEncounters.findIndex(enc => enc._id.toString() === req.params.legendaryEncounterId);
    if (encounterIndex === -1) return res.status(404).json({ message: 'Begegnung nicht gefunden.' });

    nuzlocke.legendaryEncounters.splice(encounterIndex, 1);
    await nuzlocke.save();

    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:legendary_updated', nuzlocke.legendaryEncounters);
    res.json(nuzlocke.legendaryEncounters);
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Löschen der legendären Begegnung.', error: error.message });
  }
});

// DELETE /api/nuzlockes/:id/legendary/generic/:playerId - Entfernt generische legendäre Begegnung
router.delete('/:id/legendary/generic/:playerId', async (req, res) => {
  try {
    const nuzlocke = req.nuzlocke;
    const { playerId } = req.params;
    const encounterIndex = nuzlocke.legendaryEncounters.map(e => e.toObject()).findLastIndex(enc => enc.playerId.toString() === playerId && enc.pokemonId === 0);
    if (encounterIndex === -1) return res.status(404).json({ message: 'Keine generische Begegnung gefunden.' });

    nuzlocke.legendaryEncounters.splice(encounterIndex, 1);
    await nuzlocke.save();

    const io = req.app.get('socketio');
    io.to(req.params.id).emit('nuzlocke:legendary_updated', nuzlocke.legendaryEncounters);
    res.json(nuzlocke.legendaryEncounters);
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Löschen der generischen Begegnung.', error: error.message });
  }
});

module.exports = router;