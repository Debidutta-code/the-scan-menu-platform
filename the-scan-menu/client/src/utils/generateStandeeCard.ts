import QRCode from 'qrcode';

export interface StandeeCardOptions {
  tableNumber: string | number;
  displayName?: string;
  restaurantName: string;
  url: string;
  logoUrl?: string;
  fgColor?: string;
  bgColor?: string;
  showLogo?: boolean;
  cardFrameText?: string;
  templateTheme?: 'standee' | 'branded' | 'minimal';
  errorCorrectionLevel?: 'M' | 'Q' | 'H';
}

/**
 * Loads an image from a URL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Draws a rounded rectangle path on canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates a high-resolution 300-DPI Table Standee Card PNG Data URI
 */
export async function generateStandeeCardPng(options: StandeeCardOptions): Promise<string> {
  const {
    tableNumber,
    displayName = `Table ${tableNumber}`,
    restaurantName = 'The Scan Menu',
    url,
    logoUrl,
    fgColor = '#0F172A',
    bgColor = '#FFFFFF',
    showLogo = true,
    cardFrameText = 'Scan to View Menu & Order',
    templateTheme = 'standee',
    errorCorrectionLevel = 'H',
  } = options;

  // Canvas Resolution: 1000 x 1400 (High-res 2x print ready)
  const width = 1000;
  const height = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // 1. Draw Background
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(0, 0, width, height);

  // 2. Card Plaque Geometry
  const cardMargin = 60;
  const cardWidth = width - cardMargin * 2;
  const cardHeight = height - cardMargin * 2 - 40;
  const cardX = cardMargin;
  const cardY = cardMargin;
  const cardRadius = 48;

  // Draw Card Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = bgColor;
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
  ctx.fill();
  ctx.restore();

  // Draw Card Border
  ctx.strokeStyle = templateTheme === 'branded' ? fgColor : `${fgColor}25`;
  ctx.lineWidth = templateTheme === 'branded' ? 6 : 3;
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
  ctx.stroke();

  // 3. Header Section
  let currentY = cardY + 70;

  if (templateTheme === 'branded') {
    // Top Gold/Brand Line Accent
    ctx.fillStyle = fgColor;
    roundRect(ctx, width / 2 - 60, currentY, 120, 8, 4);
    ctx.fill();
    currentY += 45;
  }

  // Table Pill Badge
  const tableBadgeText = displayName.toUpperCase();
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
  const textWidth = ctx.measureText(tableBadgeText).width;
  const pillPaddingX = 36;
  const pillWidth = textWidth + pillPaddingX * 2;
  const pillHeight = 48;
  const pillX = width / 2 - pillWidth / 2;

  ctx.fillStyle = templateTheme === 'branded' ? `${fgColor}15` : fgColor;
  roundRect(ctx, pillX, currentY, pillWidth, pillHeight, 24);
  ctx.fill();

  ctx.fillStyle = templateTheme === 'branded' ? fgColor : bgColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tableBadgeText, width / 2, currentY + pillHeight / 2 + 1);

  currentY += pillHeight + 40;

  // Restaurant Name
  ctx.fillStyle = fgColor;
  ctx.font = '800 48px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
  ctx.fillText(restaurantName, width / 2, currentY);

  currentY += 45;

  // Card Header Subtitle
  ctx.fillStyle = '#64748B';
  ctx.font = '600 26px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
  ctx.fillText(cardFrameText, width / 2, currentY);

  currentY += 50;

  // 4. Generate & Draw QR Code Matrix
  const qrBoxSize = 540;
  const qrX = width / 2 - qrBoxSize / 2;
  const qrY = currentY;

  // QR Container Box
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, qrX - 20, qrY - 20, qrBoxSize + 40, qrBoxSize + 40, 36);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  roundRect(ctx, qrX - 20, qrY - 20, qrBoxSize + 40, qrBoxSize + 40, 36);
  ctx.stroke();

  // Create real QR code on temporary canvas
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    errorCorrectionLevel: errorCorrectionLevel,
    margin: 1,
    width: qrBoxSize,
    color: {
      dark: fgColor,
      light: '#FFFFFF',
    },
  });

  ctx.drawImage(qrCanvas, qrX, qrY, qrBoxSize, qrBoxSize);

  // 5. Center Logo Shield
  if (showLogo && logoUrl) {
    try {
      const logoImg = await loadImage(logoUrl);
      const shieldSize = 130;
      const shieldX = width / 2 - shieldSize / 2;
      const shieldY = qrY + qrBoxSize / 2 - shieldSize / 2;

      // White shield background with shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, shieldX, shieldY, shieldSize, shieldSize, 28);
      ctx.fill();
      ctx.restore();

      // Border around logo shield
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 3;
      roundRect(ctx, shieldX, shieldY, shieldSize, shieldSize, 28);
      ctx.stroke();

      // Clip and draw logo image
      ctx.save();
      roundRect(ctx, shieldX + 12, shieldY + 12, shieldSize - 24, shieldSize - 24, 20);
      ctx.clip();
      ctx.drawImage(logoImg, shieldX + 12, shieldY + 12, shieldSize - 24, shieldSize - 24);
      ctx.restore();
    } catch {
      // Fallback if logo fails to load (keep raw QR matrix clean)
    }
  }

  // 6. Footer Call-To-Action
  const footerY = cardY + cardHeight - 70;
  ctx.fillStyle = fgColor;
  ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
  ctx.fillText('POINT CAMERA & SCAN TO ORDER', width / 2, footerY);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", sans-serif';
  ctx.fillText('No App Download Required • Direct Contactless Dining', width / 2, footerY + 30);

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Triggers clean browser print dialog with full standee card
 */
export function printStandeeCard(standeePngDataUri: string, tableNumber: string | number) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Table Standee #${tableNumber}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #ffffff;
          }
          img {
            max-width: 100%;
            max-height: 94vh;
            object-fit: contain;
            border-radius: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          }
          @media print {
            body { padding: 0; }
            img { box-shadow: none; max-height: 100vh; }
          }
        </style>
      </head>
      <body>
        <img src="${standeePngDataUri}" alt="Table Standee" />
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
