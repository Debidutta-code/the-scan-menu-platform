import net from 'net';

export interface TcpPrintOptions {
  timeoutMs?: number;
}

/**
 * Validates that the target IP is a safe, valid private LAN IP and not a loopback / cloud metadata SSRF target
 */
export function validatePrinterAddress(ip: string, port: number = 9100): void {
  const trimmedIp = ip.trim();
  
  // 1. Disallow loopback / local system attacks
  if (
    trimmedIp === '127.0.0.1' ||
    trimmedIp === 'localhost' ||
    trimmedIp === '0.0.0.0' ||
    trimmedIp === '::1' ||
    trimmedIp.startsWith('127.')
  ) {
    throw new Error(`Invalid printer IP: loopback address ${trimmedIp} is not permitted.`);
  }

  // 2. Disallow cloud metadata addresses (SSRF prevention)
  if (trimmedIp === '169.254.169.254' || trimmedIp.startsWith('169.254.')) {
    throw new Error(`Invalid printer IP: link-local/cloud metadata address is not permitted.`);
  }

  // 3. Disallow dangerous system/web ports (protect SSH, HTTP, HTTPS, DB, etc.)
  const blockedPorts = [21, 22, 23, 25, 53, 80, 135, 139, 443, 445, 1433, 1521, 3306, 5432, 6379, 8080, 18181];
  if (blockedPorts.includes(port)) {
    throw new Error(`Port ${port} is a reserved system service and cannot be targeted as a thermal printer.`);
  }

  if (port < 1 || port > 65535) {
    throw new Error(`Port ${port} is outside the valid TCP range (1-65535).`);
  }
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
  validatePrinterAddress(ip, port);
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
