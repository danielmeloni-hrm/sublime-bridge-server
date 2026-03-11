const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server Bridge Attivo");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.post("/update-code", (req, res) => {
  const { filePath, code, userId } = req.body; // Riceve anche l'ID

  const payload = {
    fileName: require("path").basename(filePath),
    fullPath: filePath,
    code,
  };

  if (userId) {
    // Invia il file solo alla "stanza" dell'utente specifico
    io.to(userId).emit("code-update", payload);
  } else {
    io.emit("code-update", payload);
  }

  res.json({ ok: true });
});

io.on("connection", (socket) => {
  socket.on("join-room", (userId) => {
    socket.join(userId); // Il browser entra nella sua stanza privata
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Bridge server attivo sulla porta ${PORT}`);
});