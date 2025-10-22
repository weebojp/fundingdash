import { describe, it, expect } from 'vitest';
import { fundingLatestResponseSchema } from '@evplus/contracts/schemas';

describe('latest funding route schema', () => {
  it('accepts stub payload', () => {
    const payload = {
      updatedAt: new Date().toISOString(),
      snapshots: []
    };

    expect(() => fundingLatestResponseSchema.parse(payload)).not.toThrow();
  });
});
