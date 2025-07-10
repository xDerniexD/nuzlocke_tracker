const Nuzlocke = require('../models/Nuzlocke');

const checkEditAccess = async (req, res, next) => {
    try {
        const nuzlocke = await Nuzlocke.findById(req.params.id);

        if (!nuzlocke) {
            return res.status(404).json({ message: 'Nuzlocke-Run nicht gefunden.' });
        }

        const userId = req.user._id;

        const isParticipant = nuzlocke.participants.some(p => p.equals(userId));
        const isEditor = nuzlocke.editors.some(e => e.equals(userId));

        if (isParticipant || isEditor) {
            req.nuzlocke = nuzlocke; // Wir hängen das gefundene Dokument an die Anfrage an
            next();
        } else {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler bei der Berechtigungsprüfung.' });
    }
};

module.exports = { checkEditAccess };