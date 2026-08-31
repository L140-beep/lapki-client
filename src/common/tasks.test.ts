import { describe, expect, it } from 'vitest';

import { readFileSync } from 'fs';

import {
  DEFAULT_TEST_TIMEOUT_SECONDS,
  MAX_TASK_TOTAL_TIMEOUT_SECONDS,
  parseProgrammingTask,
} from './tasks';

const validTask = () => ({
  schemaVersion: 1,
  id: 'reader-echo',
  version: 1,
  title: 'Reader',
  summary: 'Summary',
  description: 'Description',
  platformId: 'junior-reader',
  tests: [
    {
      id: 'first',
      title: 'First',
      input: { message: 'abc' },
      checks: [{ type: 'reader.impulses.equals', expected: ['impulseA'] }],
    },
  ],
});

describe('parseProgrammingTask', () => {
  it('accepts a strict Reader task and preserves an omitted timeout', () => {
    const task = parseProgrammingTask(validTask());

    expect(task.tests[0].timeoutSeconds).toBeUndefined();
    expect(DEFAULT_TEST_TIMEOUT_SECONDS).toBe(10);
  });

  it('rejects unknown schema fields', () => {
    expect(() => parseProgrammingTask({ ...validTask(), typo: true })).toThrow(
      'не поддерживается schemaVersion 1'
    );
  });

  it('rejects checks for another platform', () => {
    const task = validTask();
    task.tests[0].checks = [{ type: 'gardener.field.equals', expected: [] }];

    expect(() => parseProgrammingTask(task)).toThrow('не поддерживается платформой junior-reader');
  });

  it('rejects a task whose effective timeout total is too large', () => {
    const task = validTask();
    task.tests = Array.from({ length: 31 }, (_, index) => ({
      ...task.tests[0],
      id: `test-${index}`,
      timeoutSeconds: 10,
    }));

    expect(() => parseProgrammingTask(task)).toThrow(
      `превышает ${MAX_TASK_TOTAL_TIMEOUT_SECONDS} секунд`
    );
  });

  it('validates the bundled Gardener letter A task', () => {
    const task = parseProgrammingTask(
      JSON.parse(readFileSync('resources/tasks/gardener-letter-a.task.json', 'utf8'))
    );

    expect(task.id).toBe('gardener-letter-a');
    expect(task.tests.map((test) => (test.input as { width: number }).width)).toEqual([5, 7, 9]);
  });

  it('validates the bundled Gardener letter B task', () => {
    const task = parseProgrammingTask(
      JSON.parse(readFileSync('resources/tasks/gardener-letter-b.task.json', 'utf8'))
    );

    expect(task.id).toBe('gardener-letter-b');
    expect(task.tests.map((test) => (test.input as { width: number }).width)).toEqual([5, 7, 9]);
  });
});
