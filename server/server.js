require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

// Configuration
const SERVER_LISTENING_PORT = process.env.PORT || 3005;
const CLIENT_ORIGIN_URL = process.env.CLIENT_ORIGIN_URL || 'http://localhost:4200';

const expressApplication = express();
expressApplication.use(cors({ origin: CLIENT_ORIGIN_URL }));
expressApplication.use(express.json({ limit: '10kb' }));

expressApplication.get('/health', (req, res) => res.json({ status: 'ok' }));

const httpServer = http.createServer(expressApplication);

const webSocketServerHost = new WebSocketServer({
  server: httpServer,
  maxPayload: 16 * 1024,
  verifyClient: (info, callback) => {
    const origin = info.origin;
    console.log(`[WS] Connection attempt from: ${origin}`);
    // Relaxed for local dev but logged
    callback(true);
  }
});

const connectedClientIdentityMap = new Map();
const socketRateLimiterState = new Map();

function broadcast(payloadObject) {
  const payloadString = JSON.stringify(payloadObject);
  webSocketServerHost.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(payloadString);
    }
  });
}

function checkRateLimit(socket) {
  const now = Date.now();
  let state = socketRateLimiterState.get(socket);
  if (!state || (now - state.lastReset) > 10000) {
    state = { count: 1, lastReset: now };
    socketRateLimiterState.set(socket, state);
    return true;
  }
  if (state.count >= 30) return false;
  state.count++;
  return true;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '').substring(0, 1000);
}

webSocketServerHost.on('connection', (socket) => {
  console.log('[WS] New socket connected');

  socket.on('message', (buffer) => {
    if (!checkRateLimit(socket)) return;

    let msg;
    try {
      msg = JSON.parse(buffer);
    } catch (e) { return; }

    console.log(`[WS] Message received: ${msg.type}`);

    if (msg.type === 'join') {
      const name = sanitizeString(msg.username);
      if (name.length >= 2) {
        connectedClientIdentityMap.set(socket, name);
        const users = Array.from(connectedClientIdentityMap.values());
        broadcast({ type: 'users', users: users });
        broadcast({ type: 'system', message: `${name} joined the conversation.`, timestamp: Date.now() });
      }
    }

    if (msg.type === 'chat') {
      const name = connectedClientIdentityMap.get(socket);
      const content = sanitizeString(msg.message);
      if (name && content) {
        broadcast({
          type: 'chat',
          id: crypto.randomUUID(),
          username: name,
          message: content,
          timestamp: Date.now()
        });
      }
    }
  });

  socket.on('close', () => {
    const name = connectedClientIdentityMap.get(socket);
    connectedClientIdentityMap.delete(socket);
    socketRateLimiterState.delete(socket);
    if (name) {
      const users = Array.from(connectedClientIdentityMap.values());
      broadcast({ type: 'users', users: users });
      broadcast({ type: 'system', message: `${name} left the conversation.`, timestamp: Date.now() });
    }
  });

  socket.on('error', () => {
    connectedClientIdentityMap.delete(socket);
    socketRateLimiterState.delete(socket);
  });
});

httpServer.listen(SERVER_LISTENING_PORT, () => {
  console.log(`✅ Server running on port ${SERVER_LISTENING_PORT}`);
});
