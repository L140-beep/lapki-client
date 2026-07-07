// Сгенерированные ИИ-шкой тесты

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

  test('deleteState undo restores the state and allows initial state to be recreated after undo', () => {
    // Регрессионный кейс: если удалить родительское состояние, которое было
    // связано с начальным псевдосостоянием, то после Ctrl+Z состояние должно
    // вернуться вместе с возможностью заново создать начальный переход.
    // Раньше undo восстанавливал состояние с canBeInitial=false, поэтому
    // после отката начальное псевдосостояние не появлялось.
    const createState = vi.fn();
    const deleteState = vi.fn();
    const modelController = {
      createState,
      deleteState,
    } as any;

    const action = actionFunctions.deleteState(modelController, {
      smId: 'SM',
      id: 'STATE',
      stateData: {
        name: 'State',
        parentId: undefined,
        dimensions: { width: 100, height: 100 },
        position: { x: 10, y: 20 },
        events: [],
        color: '#fff',
      },
    });

    action.undo();

    expect(createState).toHaveBeenCalledTimes(1);
    expect(createState).toHaveBeenCalledWith(
      {
        smId: 'SM',
        name: 'State',
        id: 'STATE',
        dimensions: { width: 100, height: 100 },
        position: { x: 10, y: 20 },
        parentId: undefined,
        events: [],
        color: '#fff',
        linkByPoint: false,
        canBeInitial: true,
      },
      false
    );
  });
});
