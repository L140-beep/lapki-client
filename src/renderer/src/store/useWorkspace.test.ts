import { beforeEach, describe, expect, it } from 'vitest';

import { useWorkspace } from './useWorkspace';

describe('primary workspace', () => {
  beforeEach(() => {
    useWorkspace.getState().setActiveWorkspace('editor');
  });

  it('can switch independently from moving modal state', () => {
    useWorkspace.getState().setActiveWorkspace('simulator');

    expect(useWorkspace.getState().activeWorkspace).toBe('simulator');
  });
});
