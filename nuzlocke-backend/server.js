require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Models und Middleware
const User = require('./models/User');
require('./models/Ability'); 
require('./models/Move'); // Stellt sicher, dass das Move-Modell registriert ist
const { protect } = require('./middleware/authMiddleware');
const nuzlockeRoutes = require('./routes/nuzlockeRoutes');
const pokemonRoutes = require('./routes/pokemonRoutes');

const app = express();
const PORT = 3000;

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions
});

io.on('connection', (socket) => {
  console.log('Ein Nutzer hat sich verbunden:', socket.id);
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`Nutzer ${socket.id} ist dem Raum ${roomId} beigetreten.`);
  });
  socket.on('disconnect', () => {
    console.log('Ein Nutzer hat die Verbindung getrennt:', socket.id);
  });
});

const dbURI = process.env.MONGODB_URI;
mongoose.connect(dbURI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server läuft auf http://localhost:${PORT}`);
    });
  })
  .catch((err) => { console.error('Fehler bei der Verbindung mit MongoDB:', err); });


// --- API-Endpunkte ---

app.get('/api/games/platinum', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'platinum.json');
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const gameData = JSON.parse(fileContent);
    res.json(gameData);
  } catch (error) {
    res.status(500).json({ message: "Fehler: Spieldaten konnten nicht geladen werden." });
  }
});

app.post('/api/users/register', async (req, res) => {
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

app.post('/api/users/login', async (req, res) => {
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

app.get('/api/users/profile', protect, (req, res) => {
  res.json(req.user);
});


app.set('socketio', io);
app.use('/api/pokemon', pokemonRoutes);
// Die fehlerhafte Zeile wurde entfernt
app.use('/api/nuzlockes', nuzlockeRoutes);