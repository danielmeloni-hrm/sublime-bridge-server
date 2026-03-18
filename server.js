const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

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

function findFolderRecursive(startDir, folderName, maxDepth = 6, currentDepth = 0) {
  if (currentDepth > maxDepth) return null;
  if (!startDir || !fs.existsSync(startDir)) return null;

  let entries = [];
  try {
    entries = fs.readdirSync(startDir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(startDir, entry.name);

    if (entry.name.toLowerCase() === folderName.toLowerCase()) {
      return fullPath;
    }

    const nested = findFolderRecursive(fullPath, folderName, maxDepth, currentDepth + 1);
    if (nested) return nested;
  }

  return null;
}

function openTerminalAt(targetPath) {
  const platform = process.platform;

  if (platform === "win32") {
    spawn(
      "cmd.exe",
      [
        "/c",
        "start",
        "cmd.exe",
        "/k",
        `cd /d "${targetPath}" && node .\\watcher.js`,
      ],
      {
        detached: true,
        stdio: "ignore",
      }
    ).unref();
    return;
  }

  if (platform === "darwin") {
    spawn(
      "osascript",
      [
        "-e",
        `tell application "Terminal" to do script "cd '${targetPath.replace(/'/g, "'\\''")}' && node ./watcher.js"`,
      ],
      {
        detached: true,
        stdio: "ignore",
      }
    ).unref();
    return;
  }

  spawn(
    "x-terminal-emulator",
    [
      "-e",
      `bash -lc 'cd "${targetPath}" && node ./watcher.js; exec bash'`,
    ],
    {
      detached: true,
      stdio: "ignore",
    }
  ).unref();
}

app.post("/update-code", (req, res) => {
  const { filePath, code, userId } = req.body;

  const payload = {
    fileName: path.basename(filePath),
    fullPath: filePath,
    code,
  };

  if (userId) {
    io.to(userId).emit("code-update", payload);
  } else {
    io.emit("code-update", payload);
  }

  res.json({ ok: true });
});

io.on("connection", (socket) => {
  socket.on("join-room", (userId) => {
    socket.join(userId);
  });

  socket.on("open-terminal", (payload = {}) => {
  try {
    const folderName = payload.targetFolderName || "live_notes";

    const searchRoots = [
      process.cwd(),
      path.join(process.cwd(), ".."),
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "Desktop") : null,
      process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "Documents") : null,
      process.env.HOME ? path.join(process.env.HOME, "Desktop") : null,
      process.env.HOME ? path.join(process.env.HOME, "Documents") : null,
    ].filter(Boolean);

    let foundPath = null;

    for (const root of searchRoots) {
      foundPath = findFolderRecursive(root, folderName, 6);
      if (foundPath) break;
    }

    if (!foundPath) {
      socket.emit("terminal-error", {
        message: `Cartella "${folderName}" non trovata`,
      });
      return;
    }

    const watcherPath = path.join(foundPath, "watcher.js");

    if (!fs.existsSync(watcherPath)) {
      socket.emit("terminal-error", {
        message: `watcher.js non trovato in ${foundPath}`,
      });
      return;
    }

    openTerminalAt(foundPath);

    socket.emit("terminal-opened", {
      path: foundPath,
      command: "node .\\watcher.js",
    });
  } catch (error) {
    socket.emit("terminal-error", {
      message: error?.message || "Errore apertura terminale",
    });
  }
});
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Bridge server attivo sulla porta ${PORT}`);
});