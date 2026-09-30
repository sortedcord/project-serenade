import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const port = Number(process.env.PORT ?? 8787);
const rooms = new Map();
const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer, maxPayload: 2048 });

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}
function validRoom(room) { return typeof room === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(room); }
function remove(socket) {
  const room = socket.room;
  if (!room) return;
  room.players.delete(socket.playerId);
  for (const peer of room.players.values()) send(peer.socket, { type: 'leave', id: socket.playerId });
  if (room.players.size === 0) rooms.delete(room.name);
  socket.room = undefined;
}

wss.on('connection', socket => {
  socket.on('message', data => {
    let message;
    try { message = JSON.parse(data.toString()); } catch { socket.close(1008, 'Invalid JSON'); return; }
    if (!message || typeof message !== 'object' || Array.isArray(message)) { socket.close(1008, 'Invalid message'); return; }
    if (message.type === 'join' && !socket.room) {
      if (!validRoom(message.room)) { send(socket, { type: 'error', message: 'Room must be 1–32 letters, numbers, _ or -.' }); return; }
      let room = rooms.get(message.room);
      if (!room) {
        room = { name: message.room, seed: randomUUID(), mapId: 'maintenance', players: new Map() };
        rooms.set(room.name, room);
      }
      if (room.players.size >= 16) { send(socket, { type: 'error', message: 'Room is full.' }); return; }
      const id = randomUUID();
      socket.room = room;
      socket.playerId = id;
      const peers = [...room.players.values()].map(player => ({ id: player.id, x: player.x, y: player.y, angle: player.angle }));
      room.players.set(id, { id, socket, x: null, y: null, angle: null });
      send(socket, { type: 'joined', id, seed: room.seed, mapId: room.mapId, players: peers });
      for (const player of room.players.values()) if (player.id !== id) send(player.socket, { type: 'player-joined', id });
      return;
    }
    if (message.type === 'position' && socket.room) {
      const { x, y, angle } = message;
      if (![x, y, angle].every(value => typeof value === 'number' && Number.isFinite(value)) || Math.abs(x) > 100000 || Math.abs(y) > 100000 || Math.abs(angle) > Math.PI * 100) return;
      const player = socket.room.players.get(socket.playerId);
      if (!player) { socket.close(1008, 'Not a room member'); return; }
      player.x = x; player.y = y; player.angle = angle;
      for (const peer of socket.room.players.values()) if (peer.id !== socket.playerId) send(peer.socket, { type: 'position', id: socket.playerId, x, y, angle });
    }
  });
  socket.on('close', () => remove(socket));
  socket.on('error', () => remove(socket));
});

httpServer.listen(port, () => console.log(`Serenade co-op WebSocket server listening on ${port}`));
