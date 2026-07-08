import { describe, expect, test } from 'vitest';

import { getReparentedChildPosition } from './statePositionUtils';

describe('reparenting position calculation', () => {
  test('keeps a child in the same visual place after reparenting', () => {
    const childAbsolutePosition = { x: 120, y: 90 };
    const newParentAbsolutePosition = { x: 50, y: 40 };

    expect(getReparentedChildPosition(childAbsolutePosition, newParentAbsolutePosition)).toEqual({
      x: 70,
      y: 50,
    });
  });
});
