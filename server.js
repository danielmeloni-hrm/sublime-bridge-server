const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*", // Permette la connessione da qualsiasi sito (Vercel)
    methods: ["GET", "POST"]
  }
});
// TRUCCO PER NON FAR DORMIRE IL SERVER
const axios = require('axios'); // Installa con: npm install axios

const URL_DEL_TUO_SERVER = "https://sublime-bridge-server.onrender.com"; 

setInterval(() => {
  axios.get(URL_DEL_TUO_SERVER)
    .then(() => console.log("⏰ Auto-Ping: Mi tengo sveglio..."))
    .catch((err) => console.error("Auto-Ping fallito:", err.message));
}, 600000); // Ogni 10 minuti (600.000 ms)

// Aggiungi anche una rotta base per rispondere al ping
app.get('/', (req, res) => {
  res.send('Server Bridge Attivo 🚀');
});
const PORT = process.env.PORT || 10000; // Render usa porte dinamiche

io.on('connection', (socket) => {
  console.log('Nuova connessione stabilita');

  // L'utente (Sito o Bridge locale) si unisce a una stanza privata
  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`Utente ${userId} è entrato nella sua stanza.`);
  });
socket.on('bridge-status', (data) => {
    if (data.userId) {
      // Avvisa il browser che il bridge è online e sta leggendo un file
      io.to(data.userId).emit('bridge-status', data);
    }
  });

  socket.on('open-external-file', (data) => {
    // Inoltra il comando al bridge nella stessa stanza dell'utente
    io.to(data.userId).emit('open-file-locally', { fullPath: data.fullPath });
});
  // Riceve il codice dal Bridge locale (PC dell'utente)
socket.on('code-from-sublime', (data) => {
    if (data.userId && data.code !== undefined) {
      // USIAMO io.to invece di socket.to
      // Questo invia a TUTTI quelli nella stanza, incluso il browser
      io.to(data.userId).emit('code-update', data.code);
      
      console.log(`⚡ Sincronizzazione riuscita per: ${data.userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnesso');
  });
});

http.listen(PORT, () => {
  console.log(`Server Bridge attivo sulla porta ${PORT}`);
});