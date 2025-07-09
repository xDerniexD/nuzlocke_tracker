const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// POST /api/users/register - Registriert einen neuen Benutzer
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
        if (existingUser) {
            return res.status(400).json({ message: 'Benutzername bereits vergeben.' });
        }
        const newUser = new User({ username, password });
        const savedUser = await newUser.save();
        res.status(201).json({
            _id: savedUser._id,
            username: savedUser.username,
        });
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler bei der Registrierung.', error: error.message });
    }
});

// POST /api/users/login - Meldet einen Benutzer an
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') });
        if (!user) {
            return res.status(400).json({ message: 'Ungültige Anmeldedaten.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Ungültige Anmeldedaten.' });
        }
        const payload = { id: user._id, username: user.username };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({
            message: 'Login erfolgreich!',
            token: token,
            user: { _id: user._id, username: user.username }
        });
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler beim Login.', error: error.message });
    }
});

// GET /api/users/profile - Ruft das Benutzerprofil ab (geschützt)
router.get('/profile', protect, (req, res) => {
    res.json(req.user);
});

module.exports = router;