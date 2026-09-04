import { describe, it, expect } from 'vitest';
import { EscPosBuilder } from '../../src/utils/escposBuilder';
import { printerService } from '../../src/services/printer.service';

describe('80mm Thermal Receipt Engine & EscPosBuilder Unit Tests', () => {
  it('should initialize with standard 48-column grid for 80mm and 32-column grid for 58mm', () => {
    const builder80 = new EscPosBuilder({ paperWidth: '80mm' });
    const builder58 = new EscPosBuilder({ paperWidth: '58mm' });

    expect((builder80 as any).maxChars).toBe(48);
    expect((builder58 as any).maxChars).toBe(32);
  });

  it('should wrap long item names cleanly without overflowing price or qty columns', () => {
    const builder = new EscPosBuilder({ paperWidth: '80mm' });
    const longName = 'Woodfired Artisanal Truffle Mushroom Quattro Formaggi Pizza with Extra Virgin Olive Oil';
    const addOns = ['Extra Truffle Glaze (Rs. 60.00)', 'Smoked Burrata (Rs. 120.00)'];
    const notes = 'Well done thin crust, slice into 8 pieces';

    builder.multilineItemRow(2, longName, 'Rs. 950.00', addOns, notes);
    const buffer = builder.toBuffer();

    expect(buffer.length).toBeGreaterThan(0);
    const textOutput = buffer.toString('utf-8');
    expect(textOutput).toContain('2');
    expect(textOutput).toContain('Woodfired');
    expect(textOutput).toContain('Rs. 950.00');
    expect(textOutput).toContain('Extra Truffle Glaze');
    expect(textOutput).toContain('Well done thin crust');
  });

  it('should format numbers correctly using formatAmount', () => {
    expect(printerService.formatAmount(44900)).toBe('Rs. 449.00');
    expect(printerService.formatAmount(709.5)).toBe('Rs. 709.50');
    expect(printerService.formatAmount(0)).toBe('Rs. 0.00');
  });

  it('should generate representative thermal test slip with EscPosBuilder', async () => {
    const builder = new EscPosBuilder({ paperWidth: '80mm' });
    builder
      .alignCenter()
      .doubleSize(true)
      .line('DEMO CAFE')
      .doubleSize(false)
      .line('THERMAL TEST')
      .divider('-')
      .twoColumnRow('Printer:', 'Counter Printer')
      .twoColumnRow('Paper:', '80mm')
      .line('[OK] Connection successful')
      .line('[OK] ESC/POS test successful')
      .divider('-')
      .line('TEST COMPLETE')
      .cut();

    const buf = builder.toBuffer();
    expect(buf.length).toBeGreaterThan(50);
    const text = buf.toString('utf-8');
    expect(text).toContain('DEMO CAFE');
    expect(text).toContain('THERMAL TEST');
    expect(text).toContain('TEST COMPLETE');
  });
});
