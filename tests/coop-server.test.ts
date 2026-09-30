import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

let serverProcess: ChildProcess | undefined;
let sockets: WebSocket[] = [];
afterEach(() => {
  for (const socket of sockets) socket.terminate();
  sockets = [];
  serverProcess?.kill();
  serverProcess = undefined;
});
async function freePort(): Promise<number> {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate test port');
  server.close(); return address.port;
}
async function startRelay(): Promise<string> {
  const port = await freePort();
  serverProcess = spawn(process.execPath, ['server/server.js'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  const url = `ws://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    const probe = new WebSocket(url);
    try { await once(probe, 'open'); probe.terminate(); return url; }
    catch { probe.terminate(); await new Promise(resolve => setTimeout(resolve, 20)); }
  }
  throw new Error('Relay did not start');
}
async function join(url: string, room: string): Promise<{ socket: WebSocket; joined: { type: string; id: string; seed: string; players: Array<{ id: string; x: number | null; y: number | null; angle: number | null }> }; message: (type: string) => Promise<Record<string, unknown>> }> {
  const socket = new WebSocket(url); sockets.push(socket); await once(socket, 'open');
  const nextMessage = () => {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for relay message')), 1500);
      socket.once('message', data => { clearTimeout(timeout); resolve(JSON.parse(data.toString())); });
    });
  };
  const pending = nextMessage(); socket.send(JSON.stringify({ type: 'join', room }));
  const response = await pending; expect(response.type).toBe('joined');
  if (typeof response.id !== 'string' || typeof response.seed !== 'string' || !Array.isArray(response.players)) throw new Error('Malformed joined response');
  const joined = { type: 'joined', id: response.id, seed: response.seed, players: response.players as Array<{ id: string; x: number | null; y: number | null; angle: number | null }> };
  return { socket, joined, message: async type => { for (;;) { const value = await nextMessage(); if (value.type === type) return value; } } };
}

describe('co-op relay', () => {
  it('shares room seed, relays movement, and removes disconnected members', async () => {
    const url = await startRelay();
    const a = await join(url, 'test-room');
    const b = await join(url, 'test-room');
    expect(b.joined.seed).toBe(a.joined.seed);
    expect(b.joined.players).toHaveLength(1);
    const received = b.message('position');
    a.socket.send(JSON.stringify({ type: 'position', x: 4.25, y: 2.5, angle: 1.2 }));
    await expect(received).resolves.toMatchObject({ type: 'position', id: a.joined.id, x: 4.25, y: 2.5, angle: 1.2 });
    const departed = b.message('leave');
    a.socket.close();
    await expect(departed).resolves.toMatchObject({ type: 'leave', id: a.joined.id });
  });
  it('rejects invalid room membership', async () => {
    const url = await startRelay();
    const socket = new WebSocket(url); sockets.push(socket); await once(socket, 'open');
    const pending = new Promise<Record<string, unknown>>(resolve => socket.once('message', data => resolve(JSON.parse(data.toString()))));
    socket.send(JSON.stringify({ type: 'join', room: '../invalid' }));
    await expect(pending).resolves.toMatchObject({ type: 'error' });
  });
});
