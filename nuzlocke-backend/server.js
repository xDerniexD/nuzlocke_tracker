require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

// Models und Middleware
require('./models/Ability');
require('./models/Move');
const { protect } = require('./middleware/authMiddleware');

// Routen importieren
const nuzlockeRoutes = require('./routes/nuzlockeRoutes');
const pokemonRoutes = require('./routes/pokemonRoutes');
const userRoutes = require('./routes/userRoutes'); // Wichtigster Import

const app = express();
const PORT = 3000;

// Flexible CORS-Konfiguration
const whitelist = [
  'http://localhost:5173',
  'https://nuzlocke.zyndoras.de'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Nicht durch CORS erlaubt'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

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

// API-Routen verwenden
app.set('socketio', io);

// KORREKTUR: Die Benutzer-Routen werden jetzt korrekt eingebunden
app.use('/api/users', userRoutes);
app.use('/api/pokemon', pokemonRoutes);
app.use('/api/nuzlockes', nuzlockeRoutes);