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
  try {
    const { filePath, code } = req.body;

    if (!filePath || typeof code !== "string") {
      return res.status(400).json({
        ok: false,
        error: "filePath e code sono obbligatori",
      });
    }

    io.emit("code-update", {
      filePath,
      code,
    });

    return res.json({
      ok: true,
      filePath,
    });
  } catch (error) {
    console.error("Errore /update-code:", error);
    return res.status(500).json({
      ok: false,
      error: "Errore interno server",
    });
  }
});

io.on("connection", (socket) => {
  console.log("Client connesso:", socket.id);

  socket.on("disconnect", (reason) => {
    console.log("Client disconnesso:", socket.id, reason);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Bridge server attivo sulla porta ${PORT}`);
});