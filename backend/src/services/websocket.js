/**
 * WebSocket Server
 * Handles real-time connections, tenant-scoped broadcasting,
 * and client message handling.
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config');

class WebSocketServer {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> { ws, organizationId, role }
    this.orgClients = new Map(); // organizationId -> Set<userId>
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      console.log('[WS] New connection attempt');

      // Extract token from query string
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }

      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const userId = decoded.userId;
        const organizationId = decoded.organizationId;
        const role = decoded.role;

        // Store client
        this.clients.set(userId, {
          ws,
          organizationId,
          role,
          connectedAt: new Date(),
        });

        // Track org clients
        if (!this.orgClients.has(organizationId)) {
          this.orgClients.set(organizationId, new Set());
        }
        this.orgClients.get(organizationId).add(userId);

        console.log(`[WS] Client connected: ${userId} (org: ${organizationId}, role: ${role})`);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          data: {
            message: 'Connected to Energy PaaS real-time server',
            userId,
            organizationId,
            timestamp: new Date().toISOString(),
          },
        }));

        // Handle messages from client
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            this.handleClientMessage(userId, organizationId, data);
          } catch (err) {
            console.error('[WS] Invalid message:', err.message);
          }
        });

        ws.on('close', () => {
          this.clients.delete(userId);
          const orgSet = this.orgClients.get(organizationId);
          if (orgSet) {
            orgSet.delete(userId);
            if (orgSet.size === 0) this.orgClients.delete(organizationId);
          }
          console.log(`[WS] Client disconnected: ${userId}`);
        });

        ws.on('error', (err) => {
          console.error(`[WS] Client error (${userId}):`, err.message);
        });

      } catch (err) {
        console.error('[WS] Auth failed:', err.message);
        ws.close(4001, 'Invalid token');
      }
    });

    console.log('[WS] WebSocket server initialized');
  }

  handleClientMessage(userId, organizationId, data) {
    switch (data.type) {
      case 'ping':
        this.sendToUser(userId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      case 'subscribe':
        // Client can subscribe to specific meter updates
        const client = this.clients.get(userId);
        if (client) {
          client.subscriptions = data.channels || [];
        }
        break;
      default:
        console.log(`[WS] Unknown message type: ${data.type}`);
    }
  }

  /**
   * Broadcast to all clients in an organization
   */
  broadcastToOrg(organizationId, message) {
    const orgUsers = this.orgClients.get(organizationId);
    if (!orgUsers) return;

    const payload = JSON.stringify(message);
    for (const userId of orgUsers) {
      const client = this.clients.get(userId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }

    // Also broadcast to super admins
    for (const [uid, client] of this.clients) {
      if (client.role === 'super_admin' && client.ws.readyState === WebSocket.OPEN) {
        if (!orgUsers.has(uid)) {
          client.ws.send(payload);
        }
      }
    }
  }

  /**
   * Send to specific user
   */
  sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(message) {
    const payload = JSON.stringify(message);
    for (const [, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  getConnectedCount() {
    return this.clients.size;
  }

  getOrgConnectedCount(organizationId) {
    const orgUsers = this.orgClients.get(organizationId);
    return orgUsers ? orgUsers.size : 0;
  }
}

module.exports = WebSocketServer;
