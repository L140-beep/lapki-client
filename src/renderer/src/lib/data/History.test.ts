import { describe, expect, test, vi } from 'vitest';

import { actionFunctions } from './History';

describe('History action functions', () => {
  test('unlinkState undo restores state with canBeInitial true', () => {
    const linkState = vi.fn();
    const unlinkState = vi.fn();
    const modelController = { linkState, unlinkState } as any;

    const action = actionFunctions.unlinkState(modelController, {
      smId: 'SM',
      parentId: 'PARENT',
      params: { smId: 'SM', id: 'CHILD', canUndo: false },
      dragEndPos: { x: 10, y: 20 },
    });

    action.undo();

    expect(linkState).toHaveBeenCalledTimes(1);
    expect(linkState).toHaveBeenCalledWith(
      {
        smId: 'SM',
        parentId: 'PARENT',
        childId: 'CHILD',
        canBeInitial: true,
        dragEndPos: { x: 10, y: 20 },
      },
      false,
      true
    );
  });
});
