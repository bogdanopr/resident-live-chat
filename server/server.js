const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

// ── Express setup ──────────────────────────────────────────────
const app = express();
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ── HTTP + WebSocket server ────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/** @type {Map<import('ws').WebSocket, string>} */
const clients = new Map();

function broadcastUsers() {
  const users = [...clients.values()];
  const payload = JSON.stringify({ type: 'users', users });
  for (const ws of clients.keys()) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

function broadcastChat(msg) {
  const payload = JSON.stringify(msg);
  for (const ws of clients.keys()) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      // invalid JSON — ignore silently
      return;
    }

    if (data.type === 'join') {
      const username = (data.username || '').toString().trim();
      if (!username) return;
      clients.set(ws, username);
      broadcastUsers();
    }

    if (data.type === 'chat') {
      const username = (data.username || '').toString().trim();
      const message = (data.message || '').toString().trim();
      if (!username || !message) return;

      broadcastChat({
        type: 'chat',
        id: crypto.randomUUID(),
        username,
        message,
        timestamp: Date.now(),
      });
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastUsers();
  });

  ws.on('error', () => {
    clients.delete(ws);
    broadcastUsers();
  });
});

// ── Start ──────────────────────────────────────────────────────
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
  console.log(`WebSocket ready → ws://localhost:${PORT}`);
});
