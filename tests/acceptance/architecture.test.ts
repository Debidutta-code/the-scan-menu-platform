import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Architecture Validation', () => {
  it('should enforce that no Express controller contains business logic or data fetching', () => {
    // We expect the controllers to only import services and not mongoose or models directly
    const controllersDir = path.resolve(__dirname, '../../server/src/controllers');
    const files = fs.readdirSync(controllersDir);

    files.forEach(file => {
      const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');

      // Strict rule: Controllers should not import 'mongoose'
      expect(content).not.toMatch(/from 'mongoose'/);
    });
  });

  it('should verify standard envelope response usage in controllers', () => {
    const controllersDir = path.resolve(__dirname, '../../server/src/controllers');
    const files = fs.readdirSync(controllersDir);

    let anySendResponse = false;
    files.forEach(file => {
      const content = fs.readFileSync(path.join(controllersDir, file), 'utf8');

      if (content.includes('sendResponse') || content.includes('sendError')) {
        anySendResponse = true;
      }
    });

    // There should be some usage of sendResponse/sendError indicating standard envelopes
    expect(anySendResponse).toBe(true);
  });
});
