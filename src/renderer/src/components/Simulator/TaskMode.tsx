import React, { useEffect, useMemo, useState } from 'react';

import type {
  CatalogTask,
  GardenerTaskInput,
  ReaderTaskInput,
  VerificationTest,
} from '../../../../common/tasks';
import { useTasks } from '../../store/useTasks';
import type { SimulationResult } from '../../types/InterpreterTypes';

const phaseLabels = {
  idle: 'Не запускался',
  waiting: 'Ожидает',
  running: 'Выполняется',
  passed: 'Пройден',
  failed: 'Не пройден',
};

const reasonLabels = {
  CHECK_FAILED: 'Результат не соответствует условию',
  TIMEOUT: 'Превышено время выполнения',
  GARDENER_CRASH: 'Садовник столкнулся с препятствием',
  EXECUTION_ERROR: 'Ошибка выполнения',
};

const checkLabels = {
  'gardener.field.equals': 'Итоговое поле не совпадает',
  'gardener.position.equals': 'Итоговая позиция не совпадает',
  'reader.impulses.equals': 'Последовательность выходных импульсов не совпадает',
};

const orientationArrows = { NORTH: '↑', EAST: '→', SOUTH: '↓', WEST: '←' };
const cellColors = {
  [-1]: 'bg-zinc-700',
  0: 'bg-bg-primary',
  1: 'bg-rose-500/80',
  2: 'bg-emerald-500/80',
  3: 'bg-sky-500/80',
};

const FieldView: React.FC<{
  input: GardenerTaskInput;
  field?: GardenerTaskInput['field'];
  position?: GardenerTaskInput['position'];
  orientation?: string;
}> = ({
  input,
  field = input.field,
  position = input.position,
  orientation = input.orientation,
}) => (
  <div
    className="grid w-fit overflow-hidden rounded border border-border-primary"
    style={{ gridTemplateColumns: `repeat(${input.width}, minmax(20px, 32px))` }}
  >
    {field.flatMap((row, y) =>
      row.map((cell, x) => (
        <div
          key={`${x}-${y}`}
          className={`border-border-primary/50 flex aspect-square items-center justify-center border text-sm ${cellColors[cell]}`}
          title={`(${x}, ${y})`}
        >
          {position.x === x && position.y === y
            ? orientationArrows[orientation.toUpperCase() as keyof typeof orientationArrows] ?? '●'
            : ''}
        </div>
      ))
    )}
  </div>
);

const GardenerDetails: React.FC<{
  test: VerificationTest;
  execution?: SimulationResult;
}> = ({ test, execution }) => {
  const input = test.input as GardenerTaskInput;
  const steps = execution?.steps ?? [];
  const [stepIndex, setStepIndex] = useState(Math.max(steps.length - 1, 0));
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setStepIndex(Math.max(steps.length - 1, 0));
    setPlaying(false);
  }, [execution, steps.length]);

  useEffect(() => {
    if (!playing || steps.length < 2) return;
    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= steps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing, steps.length]);

  const step = steps[stepIndex];
  const environment = execution?.result?.environment;
  const visible = step ?? environment;

  return (
    <div className="grid min-h-0 gap-4 overflow-y-auto p-4 lg:grid-cols-2">
      <section>
        <h3 className="mb-2 font-semibold">Входное поле</h3>
        <FieldView input={input} />
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Фактический результат</h3>
        {visible ? (
          <FieldView
            input={input}
            field={visible.field}
            position={visible.position}
            orientation={visible.orientation}
          />
        ) : (
          <p className="text-sm text-text-inactive">Тест ещё не запускался.</p>
        )}
        {steps.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (stepIndex >= steps.length - 1) setStepIndex(0);
                  setPlaying((current) => !current);
                }}
              >
                {playing ? 'Пауза' : 'Воспроизвести'}
              </button>
              <span className="text-xs">
                Шаг {stepIndex + 1} из {steps.length}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(steps.length - 1, 0)}
              value={stepIndex}
              onChange={(event) => {
                setPlaying(false);
                setStepIndex(Number(event.target.value));
              }}
              className="w-full"
            />
          </div>
        )}
      </section>
    </div>
  );
};

const ReaderDetails: React.FC<{
  test: VerificationTest;
  execution?: SimulationResult;
}> = ({ test, execution }) => {
  const input = test.input as ReaderTaskInput;
  const impulses = execution?.result?.calledSignals ?? [];
  return (
    <div className="grid gap-4 overflow-y-auto p-4 lg:grid-cols-2">
      <section>
        <h3 className="mb-2 font-semibold">Входная строка</h3>
        <pre className="whitespace-pre-wrap rounded border border-border-primary p-3 text-sm">
          {input.message}
        </pre>
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Выходные импульсы</h3>
        {impulses.length ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {impulses.map((signal, index) => (
              <li key={`${signal}-${index}`}>{signal}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-text-inactive">Импульсы ещё не получены.</p>
        )}
      </section>
    </div>
  );
};

interface TaskModeProps {
  task: CatalogTask;
  ready: boolean;
  active: boolean;
  operationKind?: 'run' | 'test' | 'submission';
  error?: string;
  hasSolution: boolean;
  onRunTest: (testId: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const TaskMode: React.FC<TaskModeProps> = ({
  task,
  ready,
  active,
  operationKind,
  error,
  hasSolution,
  onRunTest,
  onCancel,
  onSubmit,
}) => {
  const [testStates, detailedResult, submissionResult] = useTasks((state) => [
    state.testStates,
    state.detailedResult,
    state.submissionResult,
  ]);
  const [selectedTestId, setSelectedTestId] = useState(task.tests[0]?.id);

  useEffect(() => setSelectedTestId(task.tests[0]?.id), [task.id, task.version, task.tests]);
  const selectedTest = task.tests.find((test) => test.id === selectedTestId) ?? task.tests[0];
  const selectedState = selectedTest ? testStates[selectedTest.id] : undefined;
  const detailedExecution =
    detailedResult?.testId === selectedTest?.id
      ? detailedResult.execution
      : selectedState?.source === 'submission'
      ? (selectedState.verdict?.outcome as SimulationResult | undefined)
      : undefined;

  const summary = useMemo(() => {
    if (!submissionResult) return undefined;
    return submissionResult.status === 'accepted'
      ? `Решение принято: ${submissionResult.passed} из ${submissionResult.total}`
      : `Решение не принято: ${submissionResult.passed} из ${submissionResult.total}`;
  }, [submissionResult]);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] border-t border-border-primary">
      <div className="flex min-h-0 flex-col">
        <div className="border-b border-border-primary px-4 py-3">
          <h2 className="font-semibold">{selectedTest?.title}</h2>
          {selectedState?.verdict?.reasonCode && (
            <p className="mt-1 text-sm text-error">
              {selectedState.verdict.failedCheckType
                ? checkLabels[selectedState.verdict.failedCheckType]
                : reasonLabels[selectedState.verdict.reasonCode]}
            </p>
          )}
        </div>
        {selectedTest && task.platformId === 'junior-gardener' && (
          <GardenerDetails test={selectedTest} execution={detailedExecution} />
        )}
        {selectedTest && task.platformId === 'junior-reader' && (
          <ReaderDetails test={selectedTest} execution={detailedExecution} />
        )}
      </div>

      <aside className="flex min-h-0 flex-col border-l border-border-primary bg-bg-secondary p-3">
        <div className="mb-3">
          <h2 className="font-semibold">{task.title}</h2>
          <p className="mt-1 text-xs text-text-inactive">Проверочные тесты</p>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {task.tests.map((test) => {
            const state = testStates[test.id] ?? { phase: 'idle' as const };
            return (
              <div
                key={test.id}
                className={`rounded border p-2 ${
                  selectedTest?.id === test.id ? 'border-primary' : 'border-border-primary'
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedTestId(test.id)}
                >
                  <div className="font-medium">{test.title}</div>
                  <div className="text-xs text-text-inactive">{phaseLabels[state.phase]}</div>
                </button>
                <button
                  type="button"
                  className="btn-secondary mt-2 w-full"
                  disabled={!ready || !hasSolution || active}
                  onClick={() => onRunTest(test.id)}
                >
                  Запустить тест
                </button>
              </div>
            );
          })}
        </div>
        {summary && (
          <p
            className={`mt-3 text-sm font-medium ${
              submissionResult?.status === 'accepted' ? 'text-emerald-600' : 'text-error'
            }`}
          >
            {summary}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
        <div className="mt-3 grid gap-2">
          {active && operationKind === 'test' && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Отменить тест
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={!ready || !hasSolution || active}
            onClick={onSubmit}
          >
            Отправить решение
          </button>
        </div>
      </aside>
    </div>
  );
};
