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
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00); // GS ! (Double height & width)
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

  threeColumnRow(col1: string, col2: string, col3: string): this {
    // E.g. Item (28 chars) | Qty (6 chars) | Price (12 chars)
    const col2Width = 6;
    const col3Width = 10;
    const col1Width = this.maxChars - col2Width - col3Width;

    const c1 = col1.length > col1Width ? col1.substring(0, col1Width - 1) : col1.padEnd(col1Width);
    const c2 = col2.padStart(col2Width);
    const c3 = col3.padStart(col3Width);

    this.line(c1 + c2 + c3);
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
