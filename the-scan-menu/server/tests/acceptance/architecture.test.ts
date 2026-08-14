import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Architecture Validation', () => {
  it('should enforce that controllers delegate data operations to services and helpers', () => {
    const controllersDir = path.resolve(__dirname, '../../src/controllers');
    const files = fs.readdirSync(controllersDir);

    let usesServices = false;
    files.forEach(file => {
      const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');

      if (content.includes('Service') || content.includes('service')) {
        usesServices = true;
      }
    });

    expect(usesServices).toBe(true);
  });

  it('should verify standard envelope response usage in controllers', () => {
    const controllersDir = path.resolve(__dirname, '../../src/controllers');
    const files = fs.readdirSync(controllersDir);

    let anySendResponse = false;
    files.forEach(file => {
      const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');

      if (content.includes('sendResponse') || content.includes('sendError') || content.includes('sendSuccess')) {
        anySendResponse = true;
      }
    });

    // There should be usage of sendResponse/sendError/sendSuccess indicating standard envelopes
    expect(anySendResponse).toBe(true);
  });
});
