import { NextRequest, NextResponse } from 'next/server';
import * as net from 'net';
import * as dns from 'dns/promises';

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get('host')?.trim();
  const portParam = req.nextUrl.searchParams.get('port');
  const timeoutMs = Math.min(parseInt(req.nextUrl.searchParams.get('timeout') || '5000', 10), 10000);

  if (!host) return NextResponse.json({ error: 'Missing host' }, { status: 400 });

  const port = parseInt(portParam || '', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return NextResponse.json({ error: 'Invalid port (1–65535)' }, { status: 400 });
  }

  // Resolve hostname to IP for display
  let resolvedIP: string | null = null;
  try {
    const addrs = await dns.lookup(host);
    resolvedIP = addrs.address;
  } catch {
    // not fatal — we still attempt the connection
  }

  const start = Date.now();

  return new Promise<NextResponse>((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: NextResponse) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      finish(NextResponse.json({
        status: 'open',
        latencyMs: Date.now() - start,
        host,
        port,
        resolvedIP,
      }));
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      const refused = err.code === 'ECONNREFUSED';
      finish(NextResponse.json({
        status: refused ? 'closed' : 'error',
        error: err.message,
        host,
        port,
        resolvedIP,
        latencyMs: Date.now() - start,
      }));
    });

    socket.on('timeout', () => {
      finish(NextResponse.json({
        status: 'timeout',
        host,
        port,
        resolvedIP,
        latencyMs: timeoutMs,
      }));
    });
  });
}
