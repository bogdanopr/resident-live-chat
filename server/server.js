const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

// ── Configuration & Constants ───────────────────────────────────
const SERVER_LISTENING_PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN_URL = 'http://localhost:4200';

// ── Application Initialization ──────────────────────────────────
const expressApplication = express();
expressApplication.use(cors({ origin: CLIENT_ORIGIN_URL }));
expressApplication.use(express.json());

/**
 * Health check endpoint for monitoring service status.
 */
expressApplication.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});

// ── Server & WebSocket Infrastructure ───────────────────────────
const httpServer = http.createServer(expressApplication);
const webSocketServerHost = new WebSocketServer({ server: httpServer });

/** 
 * Map of active WebSocket connections to their associated usernames.
 * @type {Map<import('ws').WebSocket, string>} 
 */
const connectedClientIdentityMap = new Map();

// ── Broadcast Logic ─────────────────────────────────────────────

/**
 * Iterates through all active WebSocket connections and sends the current list of online users.
 * This ensures all clients have a synchronized view of the conversation participants.
 */
function broadcastActiveUserListToAllClients() {
  const activeUsernameList = Array.from(connectedClientIdentityMap.values());
  const userListPayloadString = JSON.stringify({
    type: 'users',
    users: activeUsernameList
  });

  connectedClientIdentityMap.forEach((username, individualWebSocket) => {
    if (individualWebSocket.readyState === individualWebSocket.OPEN) {
      individualWebSocket.send(userListPayloadString);
    }
  });
}

/**
 * Dispatches a single chat message to every connected client.
 * @param {object} chatMessageObject - The pre-constructed message object to be stringified.
 */
function broadcastChatMessageToAllClients(chatMessageObject) {
  const chatMessagePayloadString = JSON.stringify(chatMessageObject);

  connectedClientIdentityMap.forEach((username, individualWebSocket) => {
    if (individualWebSocket.readyState === individualWebSocket.OPEN) {
      individualWebSocket.send(chatMessagePayloadString);
    }
  });
}

// ── Event Handling ──────────────────────────────────────────────

webSocketServerHost.on('connection', (individualWebSocketConnection) => {

  individualWebSocketConnection.on('message', (rawIncomingDataBuffer) => {
    let parsedIncomingData;

    try {
      parsedIncomingData = JSON.parse(rawIncomingDataBuffer);
    } catch (jsonParsingError) {
      // Ignore malformed payloads that do not conform to JSON standards
      return;
    }

    if (parsedIncomingData.type === 'join') {
      const requestedUsername = (parsedIncomingData.username || '').toString().trim();

      if (isValidUsername(requestedUsername)) {
        connectedClientIdentityMap.set(individualWebSocketConnection, requestedUsername);
        broadcastActiveUserListToAllClients();
      }
    }

    if (parsedIncomingData.type === 'chat') {
      const senderUsername = (parsedIncomingData.username || '').toString().trim();
      const messageContent = (parsedIncomingData.message || '').toString().trim();

      if (isValidMessagePayload(senderUsername, messageContent)) {
        const uniqueMessageIdentifier = crypto.randomUUID();
        const chatMessagePayload = {
          type: 'chat',
          id: uniqueMessageIdentifier,
          username: senderUsername,
          message: messageContent,
          timestamp: Date.now(),
        };

        broadcastChatMessageToAllClients(chatMessagePayload);
      }
    }
  });

  individualWebSocketConnection.on('close', () => {
    removeClientAndSynchronizeState(individualWebSocketConnection);
  });

  individualWebSocketConnection.on('error', () => {
    removeClientAndSynchronizeState(individualWebSocketConnection);
  });
});

// ── Internal Helpers ────────────────────────────────────────────

function isValidUsername(usernameString) {
  return usernameString.length > 0;
}

function isValidMessagePayload(username, message) {
  return username.length > 0 && message.length > 0;
}

function removeClientAndSynchronizeState(webSocketReference) {
  connectedClientIdentityMap.delete(webSocketReference);
  broadcastActiveUserListToAllClients();
}

// ── Start Execution ─────────────────────────────────────────────
httpServer.listen(SERVER_LISTENING_PORT, () => {
  console.log(`Server application initialized and listening on port ${SERVER_LISTENING_PORT}`);
  console.log(`WebSocket communication channel ready at ws://localhost:${SERVER_LISTENING_PORT}`);
});
