const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});
const axios = require('axios');

// AUTO-PING (Tienilo, è utile per Render Free)
const URL_DEL_TUO_SERVER = "https://sublime-bridge-server.onrender.com"; 
setInterval(() => {
  axios.get(URL_DEL_TUO_SERVER).catch(() => {});
}, 600000);

app.get('/', (req, res) => res.send('Server Bridge Attivo 🚀'));

io.on('connection', (socket) => {
  console.log('Nuova connessione');

  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`Stanza: ${userId}`);
  });

  // 1. RICEVE DAL SITO -> INVIA AL BRIDGE
  // Il sito emette 'open-external-file'
  socket.on('open-external-file', (data) => {
    console.log(`Richiesta apertura per ${data.userId}: ${data.fullPath}`);
    // Il bridge sta ascoltando 'open-external-file', quindi usiamo lo stesso nome
    io.to(data.userId).emit('open-external-file', { fullPath: data.fullPath });
  });

  // 2. RICEVE DAL BRIDGE -> INVIA AL SITO (CODICE E PATH)
  socket.on('code-from-sublime', (data) => {
    if (data.userId) {
      // Inoltriamo l'intero oggetto (code, fileName, fullPath)
      io.to(data.userId).emit('code-update', data);
      console.log(`⚡ Sincro: ${data.fileName} per ${data.userId}`);
    }
  });

  socket.on('disconnect', () => console.log('Client disconnesso'));
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => console.log(`Server su porta ${PORT}`));