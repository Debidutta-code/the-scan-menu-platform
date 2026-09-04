export interface EscPosOptions {
  paperWidth?: '80mm' | '58mm';
  kickDrawer?: boolean;
}

export class EscPosBuilder {
  private buffer: number[] = [];
  private maxChars: number = 48; // 80mm default (48 chars), 58mm is 32 chars

  constructor(options?: EscPosOptions) {
    this.maxChars = options?.paperWidth === '58mm' ? 32 : 48;
    this.init();
    if (options?.kickDrawer) {
      this.kickCashDrawer();
    }
  }

  init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @
    return this;
  }

  alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 0x01 : 0x00); // ESC E
    return this;
  }

  doubleSize(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00); // GS !
    return this;
  }

  doubleHeight(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0a);
    }
    return this;
  }

  divider(char: string = '-'): this {
    this.line(char.repeat(this.maxChars));
    return this;
  }

  doubleDivider(): this {
    this.line('='.repeat(this.maxChars));
    return this;
  }

  twoColumnRow(left: string, right: string): this {
    const rightLen = right.length;
    const availableLeft = Math.max(0, this.maxChars - rightLen - 1);
    const trimmedLeft = left.length > availableLeft ? left.substring(0, availableLeft) : left;
    const spaces = ' '.repeat(Math.max(1, this.maxChars - trimmedLeft.length - rightLen));
    this.line(trimmedLeft + spaces + right);
    return this;
  }

  wordWrap(text: string, maxWidth: number): string[] {
    if (!text) return [];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  multilineItemRow(
    qty: number | string,
    name: string,
    priceStr: string,
    addOns: string[] = [],
    notes: string = ''
  ): this {
    const qtyWidth = this.maxChars === 32 ? 3 : 4;
    const priceWidth = this.maxChars === 32 ? 9 : 11;
    const nameWidth = this.maxChars - qtyWidth - priceWidth - 2;

    const qtyStr = String(qty).padEnd(qtyWidth);
    const pricePadded = priceStr.padStart(priceWidth);
    const nameLines = this.wordWrap(name, nameWidth);

    if (nameLines.length === 0) {
      this.line(`${qtyStr} ${''.padEnd(nameWidth)} ${pricePadded}`);
    } else {
      this.line(`${qtyStr} ${nameLines[0].padEnd(nameWidth)} ${pricePadded}`);
      for (let i = 1; i < nameLines.length; i++) {
        this.line(`${' '.repeat(qtyWidth + 1)}${nameLines[i]}`);
      }
    }

    if (addOns && addOns.length > 0) {
      for (const addon of addOns) {
        const addonLines = this.wordWrap(`+ ${addon}`, nameWidth + priceWidth);
        for (const al of addonLines) {
          this.line(`${' '.repeat(qtyWidth + 1)}${al}`);
        }
      }
    }

    if (notes) {
      const noteLines = this.wordWrap(`* ${notes}`, nameWidth + priceWidth);
      for (const nl of noteLines) {
        this.line(`${' '.repeat(qtyWidth + 1)}${nl}`);
      }
    }

    return this;
  }

  kickCashDrawer(): this {
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa); // ESC p 0 25 250
    return this;
  }

  cut(partial: boolean = false): this {
    this.feed(3);
    this.buffer.push(0x1d, 0x56, partial ? 0x01 : 0x00); // GS V
    return this;
  }

  toBuffer(): Buffer {
    return Buffer.from(this.buffer);
  }
}

export default EscPosBuilder;
