import net from 'net';

export interface TcpPrintOptions {
  timeoutMs?: number;
}

/**
 * Transmits a raw ESC/POS binary buffer to a local network thermal printer via TCP socket
 */
export async function sendRawTcp(
  ip: string,
  port: number = 9100,
  buffer: Buffer,
  options: TcpPrintOptions = {}
): Promise<{ success: boolean; message: string }> {
  const timeoutMs = options.timeoutMs || 4000;

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let isResolved = false;

    client.setTimeout(timeoutMs);

    client.connect(port, ip, () => {
      client.write(buffer, () => {
        client.end();
        if (!isResolved) {
          isResolved = true;
          resolve({
            success: true,
            message: `Sent ${buffer.length} bytes to printer at ${ip}:${port}`,
          });
        }
      });
    });

    client.on('timeout', () => {
      client.destroy();
      if (!isResolved) {
        isResolved = true;
        reject(new Error(`Connection to printer at ${ip}:${port} timed out after ${timeoutMs}ms`));
      }
    });

    client.on('error', (err) => {
      client.destroy();
      if (!isResolved) {
        isResolved = true;
        reject(new Error(`Failed to connect to printer at ${ip}:${port}: ${err.message}`));
      }
    });
  });
}
