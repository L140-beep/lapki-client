import type { CatalogTask } from '../../../../common/tasks';

export const filterTasks = <Task extends Pick<CatalogTask, 'title' | 'summary'>>(
  tasks: Task[],
  search: string
): Task[] => {
  const query = search.trim().toLowerCase();
  if (!query) return tasks;

  return tasks.filter((task) => `${task.title}\n${task.summary}`.toLowerCase().includes(query));
};
