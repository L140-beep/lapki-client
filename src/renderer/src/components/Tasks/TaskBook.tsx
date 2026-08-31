import React, { useEffect, useMemo, useState } from 'react';

import { toast } from 'sonner';

import { ReactComponent as Close } from '@renderer/assets/icons/close.svg';
import { InterpreterClient } from '@renderer/components/Modules/Interpreter';
import { useSimulatorWindow } from '@renderer/store/useSimulatorWindow';
import { getActiveTask, useTasks } from '@renderer/store/useTasks';

import type { CatalogTask } from '../../../../common/tasks';

const platformNames = {
  'junior-gardener': 'Садовник',
  'junior-reader': 'Reader',
};

const inlineText = (text: string): React.ReactNode[] =>
  text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );

const MarkdownDescription: React.FC<{
  task: CatalogTask;
  assetRootUrl: string;
}> = ({ task, assetRootUrl }) => {
  const imagePattern = /^!\[([^\]]*)\]\(([^)]+)\)$/;
  return (
    <div className="space-y-2 text-sm leading-6">
      {task.description.split('\n').map((rawLine, index) => {
        const line = rawLine.trim();
        const image = line.match(imagePattern);
        if (image) {
          try {
            const source = new URL(image[2], task.assetBaseUrl).toString();
            if (!assetRootUrl || !source.startsWith(assetRootUrl)) {
              return (
                <p key={index} className="text-error">
                  Недоступное изображение: {image[2]}
                </p>
              );
            }
            return <img key={index} src={source} alt={image[1]} className="max-w-full rounded" />;
          } catch {
            return (
              <p key={index} className="text-error">
                Некорректное изображение: {image[2]}
              </p>
            );
          }
        }
        if (line.startsWith('# '))
          return (
            <h2 key={index} className="text-xl font-bold">
              {inlineText(line.slice(2))}
            </h2>
          );
        if (line.startsWith('## '))
          return (
            <h3 key={index} className="text-lg font-semibold">
              {inlineText(line.slice(3))}
            </h3>
          );
        if (line.startsWith('- '))
          return (
            <div key={index} className="ml-4 before:mr-2 before:content-['•']">
              {inlineText(line.slice(2))}
            </div>
          );
        return line ? <p key={index}>{inlineText(line)}</p> : <div key={index} className="h-1" />;
      })}
    </div>
  );
};

export const TaskBook: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [
    catalog,
    catalogLoaded,
    activeTask,
    testStates,
    submissionActive,
    submissionResult,
    startTask,
    endTask,
  ] = useTasks((state) => [
    state.catalog,
    state.catalogLoaded,
    getActiveTask(state),
    state.testStates,
    state.submissionActive,
    state.submissionResult,
    state.startTask,
    state.endTask,
  ]);
  const openSimulator = useSimulatorWindow((state) => state.open);
  const [selectedTaskId, setSelectedTaskId] = useState<string>();

  useEffect(() => {
    if (selectedTaskId && !catalog.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(undefined);
    }
  }, [catalog.tasks, selectedTaskId]);

  const selectedTask = catalog.tasks.find((task) => task.id === selectedTaskId);
  const hasResults = useMemo(
    () =>
      submissionResult !== undefined ||
      Object.values(testStates).some((state) => state.phase !== 'idle'),
    [submissionResult, testStates]
  );

  const solve = () => {
    if (submissionActive) return;
    if (InterpreterClient.activeRunId) {
      toast.warning('Сначала завершите или отмените активный запуск');
      return;
    }
    if (!selectedTask) return;
    if (
      activeTask &&
      activeTask.id !== selectedTask.id &&
      hasResults &&
      !window.confirm('Результаты текущей задачи будут потеряны. Продолжить?')
    ) {
      return;
    }
    startTask(selectedTask.id);
    openSimulator();
  };

  const finishTask = () => {
    if (InterpreterClient.activeRunId) {
      toast.warning('Сначала завершите или отмените активный запуск');
      return;
    }
    endTask();
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-bg-primary px-3 pb-3">
      <div className="mb-3 flex items-center justify-between border-b border-border-primary pb-2">
        <div>
          <h1 className="text-xl font-bold">Задачник</h1>
          <p className="text-xs text-text-inactive">Локальные задачи по машинам состояний</p>
        </div>
        <button type="button" className="rounded-full p-3 hover:bg-bg-hover" onClick={onClose}>
          <Close width="1rem" height="1rem" />
        </button>
      </div>

      {!catalogLoaded && <p className="text-sm text-text-inactive">Загрузка задач...</p>}
      {catalogLoaded && catalog.tasks.length === 0 && (
        <p className="text-sm text-text-inactive">В resources/tasks нет доступных задач.</p>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {catalog.tasks.map((task) => {
          const isSelected = selectedTaskId === task.id;

          return (
            <article
              key={task.id}
              className={`rounded border ${
                isSelected ? 'border-primary bg-bg-hover' : 'border-border-primary'
              }`}
            >
              <button
                type="button"
                className="w-full p-3 text-left"
                aria-expanded={isSelected}
                onClick={() => setSelectedTaskId(isSelected ? undefined : task.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{task.title}</span>
                  {activeTask?.id === task.id && (
                    <span className="text-xs text-primary">решается</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-text-inactive">{task.summary}</p>
              </button>

              {isSelected && (
                <div className="border-t border-border-primary p-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-bg-primary px-2 py-1">
                        {platformNames[task.platformId]}
                      </span>
                      <span>Версия {task.version}</span>
                      <span>{task.tests.length} теста(ов)</span>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-2 hover:bg-bg-primary"
                      aria-label="Закрыть задачу"
                      title="Закрыть задачу"
                      onClick={() => setSelectedTaskId(undefined)}
                    >
                      <Close width="0.875rem" height="0.875rem" />
                    </button>
                  </div>
                  <MarkdownDescription task={task} assetRootUrl={catalog.assetRootUrl} />
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={submissionActive}
                      onClick={solve}
                    >
                      {activeTask?.id === task.id
                        ? 'Продолжить решение'
                        : 'Решать задачу'}
                    </button>
                    {activeTask?.id === task.id && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={submissionActive}
                        onClick={finishTask}
                      >
                        Завершить задачу
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {catalog.diagnostics.length > 0 && (
        <details className="mt-3 rounded border border-error p-2 text-xs">
          <summary>Ошибки файлов задач: {catalog.diagnostics.length}</summary>
          <ul className="mt-2 space-y-1">
            {catalog.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.file}-${index}`}>
                {diagnostic.file}: {diagnostic.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};
