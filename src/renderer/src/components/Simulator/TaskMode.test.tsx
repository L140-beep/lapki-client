import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CatalogTask } from '../../../../common/tasks';

const taskState = vi.hoisted(() => ({
  testStates: {} as Record<string, unknown>,
  detailedResult: undefined as unknown,
  submissionResult: undefined as unknown,
}));

vi.mock('../../store/useTasks', () => ({
  useTasks: (selector: (state: typeof taskState) => unknown) => selector(taskState),
}));

import { TaskMode } from './TaskMode';

const task: CatalogTask = {
  schemaVersion: 1,
  id: 'gardener-task',
  version: 1,
  title: 'Gardener task',
  summary: 'Summary',
  description: 'Description',
  platformId: 'junior-gardener',
  assetBaseUrl: 'file:///tasks/',
  tests: [
    {
      id: 'first',
      title: 'First',
      input: {
        width: 1,
        height: 1,
        field: [[0]],
        position: { x: 0, y: 0 },
        orientation: 'EAST',
      },
      checks: [{ type: 'gardener.field.equals', expected: [[0]] }],
    },
  ],
};

const renderTaskMode = () =>
  renderToStaticMarkup(
    <TaskMode
      task={task}
      ready
      active={false}
      hasSolution
      onRunTest={vi.fn()}
      onCancel={vi.fn()}
      onSubmit={vi.fn()}
    />
  );

describe('TaskMode Gardener result', () => {
  beforeEach(() => {
    taskState.testStates = { first: { phase: 'idle' } };
    taskState.detailedResult = undefined;
    taskState.submissionResult = undefined;
  });

  it('shows that the test has not run before a result exists', () => {
    expect(renderTaskMode()).toContain('Нет запуска');
  });

  it('shows the final state for a submission result without a step trace', () => {
    taskState.testStates = {
      first: {
        phase: 'passed',
        source: 'submission',
        verdict: {
          testId: 'first',
          status: 'passed',
          outcome: {
            status: 'success',
            result: {
              signals: [],
              calledSignals: [],
              environment: {
                field: [[0]],
                position: { x: 0, y: 0 },
                orientation: 'east',
              },
            },
          },
        },
      },
    };

    const html = renderTaskMode();

    expect(html).toContain('Итог');
    expect(html).not.toContain('Нет запуска');
    expect(html).toContain('Пройден');
  });
});
