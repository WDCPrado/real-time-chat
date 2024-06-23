import express from "express";
import logger from "morgan";
import dotenv from "dotenv";

import { Server } from "socket.io";
import { createServer } from "node:http";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Ruta del archivo JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "results.json");

// Función para leer el archivo JSON
function readResults() {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, "utf8");
  return JSON.parse(data);
}

// Función para escribir en el archivo JSON
function writeResults(results) {
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), "utf8");
}

function createResult(msg, username) {
  const result = {
    id: Math.floor(Math.random() * 1000), // Generar un ID aleatorio para simular la inserción
    content: msg,
    user: username,
  };

  // Obtener los resultados actuales almacenados en el archivo JSON
  const currentResults = readResults();

  // Agregar el nuevo resultado a la lista de resultados
  currentResults.push(result);

  // Almacenar la lista actualizada de resultados en el archivo JSON
  writeResults(currentResults);

  return result;
}

dotenv.config();

const port = process.env.PORT ?? 3000;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  connectionStateRecovery: {},
});

io.on("connection", async (socket) => {
  console.log("a user has connected!");

  socket.on("disconnect", () => {
    console.log("an user has disconnected");
  });

  socket.on("chat message", async (msg) => {
    let result;
    const username = socket.handshake.auth.username ?? "anonymous";
    console.log({ username });
    try {
      // Crear y obtener el nuevo resultado
      result = createResult(msg, username);

      // Leer y mostrar todos los resultados almacenados
      const storedResults = readResults();
      console.log("Resultados almacenados en el archivo JSON:", storedResults);
    } catch (e) {
      console.error(e);
      return;
    }

    io.emit("chat message", msg, result.id.toString(), result.user);
  });

  if (!socket.recovered) {
    // Recuperar los mensajes sin conexión
    try {
      // Recuperar todos los resultados almacenados desde el archivo JSON
      const storedResults = readResults();

      // Simular el envío de mensajes a través del socket
      storedResults.forEach((row) => {
        socket.emit("chat message", row.content, row.id.toString(), row.user);
      });
    } catch (e) {
      console.error(e);
    }
  }
});
app.use(logger("dev"));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
