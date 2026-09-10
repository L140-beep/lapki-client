import { describe, expect, it } from 'vitest';

import { filterTasks } from './filterTasks';

const tasks = [
  { id: 'gardener', title: 'Розовая рамка', summary: 'Высадите розы по периметру.' },
  { id: 'reader', title: 'Строчник и слова', summary: 'Распознавайте слова во входной строке.' },
];

describe('filterTasks', () => {
  it('searches titles and summaries without case sensitivity', () => {
    expect(filterTasks(tasks, 'РОЗОВАЯ')).toEqual([tasks[0]]);
    expect(filterTasks(tasks, 'входной')).toEqual([tasks[1]]);
  });

  it('trims the query and returns every task for an empty query', () => {
    expect(filterTasks(tasks, '  строчник  ')).toEqual([tasks[1]]);
    expect(filterTasks(tasks, '   ')).toBe(tasks);
  });

  it('returns an empty list when there are no matches', () => {
    expect(filterTasks(tasks, 'несуществующая задача')).toEqual([]);
  });
});
