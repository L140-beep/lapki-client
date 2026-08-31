import React, { useEffect, useState } from 'react';

import { twMerge } from 'tailwind-merge';

import { exportStateMachineCGML } from '@renderer/lib/data/GraphmlBuilder';
import { useModelContext } from '@renderer/store/ModelContext';
import { getActiveTask, useTasks } from '@renderer/store/useTasks';
import { StateMachine } from '@renderer/types/diagram';
import {
  GardenerParameters,
  ReaderParameters,
  SimulationResult,
} from '@renderer/types/InterpreterTypes';

import {
  GardenerCell,
  GardenerOrientation,
  MAX_FIELD_SIZE,
  MIN_FIELD_SIZE,
  clampPosition,
  createField,
  nextPlaybackIndex,
  resizeField,
  setFieldCell,
} from './model';
import { countUnicodeCharacters, limitUnicodeCharacters } from './readerModel';
import { ReaderResult } from './ReaderResult';
import {
  SimulationMachineOption,
  getSimulationMachineOptions,
  isSimulationResultStale,
  selectInitialMachineId,
} from './selection';
import { TaskMode } from './TaskMode';
import { taskForProtocol } from './taskProtocol';
import { useInterpreter } from './useInterpreter';

interface SimulatorProps {
  initialSmId?: string;
}

type SimulationMode = 'finite' | 'endless';
type GardenerTool = GardenerCell | 'position';
type SimulationParameters = GardenerParameters | ReaderParameters;

interface RuntimeProps {
  ready: boolean;
  active: boolean;
  result?: SimulationResult;
  error?: string;
  stale: boolean;
  onStart: (mode: SimulationMode, timeout: number, parameters: SimulationParameters) => void;
  onCancel: () => void;
}

const fieldTools: { value: GardenerTool; label: string; swatch: string }[] = [
  { value: 0, label: 'Пусто', swatch: 'bg-bg-primary' },
  { value: -1, label: 'Стена', swatch: 'bg-zinc-700' },
  { value: 1, label: 'Роза', swatch: 'bg-rose-500' },
  { value: 2, label: 'Мята', swatch: 'bg-emerald-500' },
  { value: 3, label: 'Василёк', swatch: 'bg-sky-500' },
  { value: 'position', label: 'Старт', swatch: 'bg-primary' },
];

const cellStyles: Record<GardenerCell, string> = {
  [-1]: 'bg-zinc-700',
  0: 'bg-bg-primary',
  1: 'bg-rose-500/80',
  2: 'bg-emerald-500/80',
  3: 'bg-sky-500/80',
};

const cellLabels: Record<GardenerCell, string> = {
  [-1]: 'стена',
  0: 'пустая клетка',
  1: 'роза',
  2: 'мята',
  3: 'василёк',
};

const orientationRotation: Record<GardenerOrientation, string> = {
  north: 'rotate-0',
  east: 'rotate-90',
  south: 'rotate-180',
  west: '-rotate-90',
};

const controlClassName =
  'w-full rounded border border-border-primary bg-bg-primary px-2 py-1.5 text-text-primary outline-none focus:border-primary';

const buttonClassName =
  'rounded px-3 py-2 font-medium transition-colors enabled:bg-primary enabled:text-text-secondary enabled:hover:bg-primaryHover disabled:cursor-not-allowed disabled:bg-bg-active disabled:text-text-disabled';

const PLAYBACK_INTERVAL_MS = 500;

const Section: React.FC<React.PropsWithChildren<{ title: string; className?: string }>> = ({
  title,
  className,
  children,
}) => (
  <section
    className={twMerge('rounded-lg border border-border-primary bg-bg-secondary p-4', className)}
  >
    <h2 className="mb-3 text-base font-semibold">{title}</h2>
    {children}
  </section>
);

const FieldInput: React.FC<React.PropsWithChildren<{ label: string; htmlFor: string }>> = ({
  label,
  htmlFor,
  children,
}) => (
  <label className="grid gap-1 text-sm" htmlFor={htmlFor}>
    <span className="text-text-inactive">{label}</span>
    {children}
  </label>
);

const SimulatorHeader: React.FC<{
  options: SimulationMachineOption[];
  selectedSmId?: string;
  machine?: StateMachine;
  status: string;
  active: boolean;
  onSelect: (smId: string) => void;
}> = ({ options, selectedSmId, machine, status, active, onSelect }) => (
  <header className="flex flex-wrap items-center gap-3 border-b border-border-primary px-5 py-3">
    <div className="min-w-0">
      <label className="grid gap-1 text-sm" htmlFor="simulator-state-machine">
        <span className="text-text-inactive">Машина состояний</span>
        <select
          id="simulator-state-machine"
          className={twMerge(controlClassName, 'min-w-64')}
          value={selectedSmId ?? ''}
          disabled={active || options.length === 0}
          onChange={(event) => onSelect(event.target.value)}
        >
          {options.length === 0 && <option value="">Нет поддерживаемых машин</option>}
          {options.map(({ id, machine: optionMachine }) => (
            <option key={id} value={id}>
              {optionMachine.name || id} ({optionMachine.platform})
            </option>
          ))}
        </select>
      </label>
      {machine && (
        <p className="mt-1 text-sm text-text-inactive">
          {Object.keys(machine.states).length} состояний · {Object.keys(machine.transitions).length}{' '}
          переходов
        </p>
      )}
    </div>
    <span className="ml-auto rounded-full border border-border-primary px-3 py-1 text-xs">
      {status}
    </span>
  </header>
);

const GardenerSimulator: React.FC<RuntimeProps> = ({
  ready,
  active,
  result,
  error,
  stale,
  onStart,
  onCancel,
}) => {
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(8);
  const [field, setField] = useState(() => createField(width, height));
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [orientation, setOrientation] = useState<GardenerOrientation>('south');
  const [selectedTool, setSelectedTool] = useState<GardenerTool>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isRightMouseDown, setIsRightMouseDown] = useState(false);
  const [mode, setMode] = useState<SimulationMode>('finite');
  const [timeout, setTimeoutValue] = useState(10);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [reviewingHistory, setReviewingHistory] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const resultSteps = result?.steps;
  const steps = resultSteps ?? [];
  const historyStep = reviewingHistory ? steps[historyIndex] : undefined;
  const displayedField = historyStep?.field ?? field;
  const displayedPosition = historyStep?.position ?? position;
  const displayedOrientation = historyStep?.orientation ?? orientation;

  useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
      setIsRightMouseDown(false);
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (reviewingHistory) return;

      if (event.button === 0) {
        setIsMouseDown(true);
      } else if (event.button === 2) {
        setIsRightMouseDown(true);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [reviewingHistory]);

  useEffect(() => {
    setHistoryIndex(Math.max(0, steps.length - 1));
    setReviewingHistory(steps.length > 0);
    setIsPlaying(false);
  }, [resultSteps, steps.length]);

  useEffect(() => {
    if (!isPlaying) return;
    if (historyIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setHistoryIndex((current) => nextPlaybackIndex(current, steps.length));
    }, PLAYBACK_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [historyIndex, isPlaying, steps.length]);

  const selectHistoryStep = (index: number) => {
    setIsPlaying(false);
    setReviewingHistory(true);
    setHistoryIndex(index);
  };

  const togglePlayback = () => {
    if (steps.length === 0) return;
    setReviewingHistory(true);
    if (!isPlaying && historyIndex === steps.length - 1) setHistoryIndex(0);
    setIsPlaying((current) => !current);
  };

  const updateWidth = (value: number) => {
    const nextWidth = Math.max(MIN_FIELD_SIZE, Math.min(MAX_FIELD_SIZE, value));
    setWidth(nextWidth);
    setField((current) => resizeField(current, nextWidth, height));
    setPosition((current) => clampPosition(current, nextWidth, height));
  };

  const updateHeight = (value: number) => {
    const nextHeight = Math.max(MIN_FIELD_SIZE, Math.min(MAX_FIELD_SIZE, value));
    setHeight(nextHeight);
    setField((current) => resizeField(current, width, nextHeight));
    setPosition((current) => clampPosition(current, width, nextHeight));
  };

  const applySelectedTool = (x: number, y: number) => {
    if (selectedTool === 'position') {
      if (field[y][x] !== -1) setPosition({ x, y });
      return;
    }
    if (position.x === x && position.y === y && selectedTool === -1) return;
    setField((current) => setFieldCell(current, x, y, selectedTool));
  };

  const eraseCell = (x: number, y: number) => {
    setField((current) => setFieldCell(current, x, y, 0));
  };

  const handleCellMouseDown = (event: React.MouseEvent, x: number, y: number) => {
    event.preventDefault();

    if (event.button === 0) {
      applySelectedTool(x, y);
    } else if (event.button === 2) {
      eraseCell(x, y);
    }
  };

  const handleCellMouseEnter = (event: React.MouseEvent, x: number, y: number) => {
    event.preventDefault();

    if (isRightMouseDown) {
      eraseCell(x, y);
    } else if (isMouseDown) {
      applySelectedTool(x, y);
    }
  };

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 xl:grid-cols-[17rem_minmax(28rem,1fr)_18rem]">
      <div className="flex flex-col gap-4">
        <Section title="Среда выполнения">
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Ширина" htmlFor="simulator-field-width">
              <input
                id="simulator-field-width"
                className={controlClassName}
                type="number"
                min={MIN_FIELD_SIZE}
                max={MAX_FIELD_SIZE}
                value={width}
                disabled={reviewingHistory}
                onChange={(event) => updateWidth(Number(event.target.value))}
              />
            </FieldInput>
            <FieldInput label="Высота" htmlFor="simulator-field-height">
              <input
                id="simulator-field-height"
                className={controlClassName}
                type="number"
                min={MIN_FIELD_SIZE}
                max={MAX_FIELD_SIZE}
                value={height}
                disabled={reviewingHistory}
                onChange={(event) => updateHeight(Number(event.target.value))}
              />
            </FieldInput>
            <FieldInput label="Старт X" htmlFor="simulator-position-x">
              <input
                id="simulator-position-x"
                className={controlClassName}
                type="number"
                min={0}
                max={width - 1}
                value={position.x}
                disabled={reviewingHistory}
                onChange={(event) =>
                  setPosition((current) =>
                    clampPosition({ ...current, x: Number(event.target.value) }, width, height)
                  )
                }
              />
            </FieldInput>
            <FieldInput label="Старт Y" htmlFor="simulator-position-y">
              <input
                id="simulator-position-y"
                className={controlClassName}
                type="number"
                min={0}
                max={height - 1}
                value={position.y}
                disabled={reviewingHistory}
                onChange={(event) =>
                  setPosition((current) =>
                    clampPosition({ ...current, y: Number(event.target.value) }, width, height)
                  )
                }
              />
            </FieldInput>
          </div>
          <FieldInput label="Ориентация" htmlFor="simulator-orientation">
            <select
              id="simulator-orientation"
              className={controlClassName}
              value={orientation}
              disabled={reviewingHistory}
              onChange={(event) => setOrientation(event.target.value as GardenerOrientation)}
            >
              <option value="north">Север</option>
              <option value="east">Восток</option>
              <option value="south">Юг</option>
              <option value="west">Запад</option>
            </select>
          </FieldInput>
        </Section>

        <Section title="Инструменты поля">
          <div className="grid grid-cols-2 gap-2">
            {fieldTools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                disabled={reviewingHistory}
                className={twMerge(
                  'flex items-center gap-2 rounded border border-border-primary px-2 py-2 text-left text-sm hover:bg-bg-hover',
                  selectedTool === tool.value && 'border-primary bg-bg-active'
                )}
                onClick={() => setSelectedTool(tool.value)}
              >
                <span className={twMerge('size-3 rounded-sm', tool.swatch)} />
                {tool.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded border border-border-primary px-3 py-2 text-sm hover:bg-bg-hover"
            disabled={reviewingHistory}
            onClick={() => setField(createField(width, height))}
          >
            Очистить поле
          </button>
        </Section>
      </div>

      <Section title="Поле Садовника" className="flex min-h-[32rem] min-w-0 flex-col">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded bg-bg-primary p-4">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${width}, minmax(1.75rem, 2.5rem))` }}
          >
            {displayedField.flatMap((row, y) =>
              row.map((cell, x) => {
                const hasGardener = displayedPosition.x === x && displayedPosition.y === y;
                return (
                  <button
                    key={`${x}:${y}`}
                    type="button"
                    title={`${x}, ${y}: ${cellLabels[cell]}`}
                    aria-label={`Клетка ${x}, ${y}: ${cellLabels[cell]}`}
                    className={twMerge(
                      'relative aspect-square min-h-7 rounded-sm border border-border-primary transition hover:border-primary',
                      cellStyles[cell],
                      reviewingHistory && 'cursor-default'
                    )}
                    disabled={reviewingHistory}
                    draggable={false}
                    onContextMenu={(event) => event.preventDefault()}
                    onMouseDown={(event) => handleCellMouseDown(event, x, y)}
                    onMouseEnter={(event) => handleCellMouseEnter(event, x, y)}
                  >
                    {hasGardener && (
                      <span
                        aria-label="Стартовая позиция Садовника"
                        className={twMerge(
                          'absolute inset-0 flex items-center justify-center text-xl text-text-primary drop-shadow transition-transform',
                          orientationRotation[displayedOrientation]
                        )}
                      >
                        ▲
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
        <p className="mt-3 text-sm text-text-inactive">
          {reviewingHistory
            ? `Просмотр шага ${historyIndex + 1} из ${steps.length}.`
            : 'Выберите инструмент и нажмите на клетку. Значок «Старт» переносит начальную позицию.'}
        </p>
      </Section>

      <div className="flex flex-col gap-4">
        <Section title="Запуск">
          <FieldInput label="Режим" htmlFor="simulator-mode">
            <select
              id="simulator-mode"
              className={controlClassName}
              value={mode}
              onChange={(event) => setMode(event.target.value as SimulationMode)}
            >
              <option value="finite">Обычный</option>
              <option value="endless">Бесконечный</option>
            </select>
          </FieldInput>
          <FieldInput label="Таймаут, секунд" htmlFor="simulator-timeout">
            <input
              id="simulator-timeout"
              className={controlClassName}
              type="number"
              min={1}
              max={30}
              value={timeout}
              disabled={mode === 'endless'}
              onChange={(event) =>
                setTimeoutValue(Math.max(1, Math.min(30, Number(event.target.value))))
              }
            />
          </FieldInput>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={buttonClassName}
              disabled={!ready || active}
              onClick={() =>
                onStart(mode, timeout, {
                  width,
                  height,
                  field,
                  position,
                  orientation: orientation.toUpperCase() as Uppercase<GardenerOrientation>,
                })
              }
            >
              Запустить
            </button>
            <button type="button" className={buttonClassName} disabled={!active} onClick={onCancel}>
              Отменить
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          {result?.message && <p className="mt-3 text-sm">{result.message}</p>}
          {stale && <p className="mt-3 text-sm text-warning">Результат устарел.</p>}
        </Section>

        <Section title="История выполнения" className="flex-1">
          {steps.length === 0 ? (
            <div className="rounded border border-dashed border-border-primary p-4 text-center text-sm text-text-inactive">
              История появится после запуска.
            </div>
          ) : (
            <div className="grid gap-3 text-sm">
              <input
                aria-label="Шаг истории"
                type="range"
                min={0}
                max={steps.length - 1}
                value={historyIndex}
                onChange={(event) => selectHistoryStep(Number(event.target.value))}
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={buttonClassName} onClick={togglePlayback}>
                  {isPlaying ? 'Пауза' : 'Воспроизвести'}
                </button>
                <button
                  type="button"
                  className={buttonClassName}
                  disabled={!reviewingHistory}
                  onClick={() => {
                    setIsPlaying(false);
                    setReviewingHistory(false);
                  }}
                >
                  К настройке
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className={buttonClassName}
                  disabled={historyIndex === 0}
                  onClick={() => selectHistoryStep(historyIndex - 1)}
                >
                  Назад
                </button>
                <span>
                  Шаг {historyIndex + 1} / {steps.length}
                </span>
                <button
                  type="button"
                  className={buttonClassName}
                  disabled={historyIndex === steps.length - 1}
                  onClick={() => selectHistoryStep(historyIndex + 1)}
                >
                  Вперёд
                </button>
              </div>
              <p className="text-text-inactive">
                Позиция: {steps[historyIndex].position.x}, {steps[historyIndex].position.y} ·{' '}
                {steps[historyIndex].orientation}
              </p>
              {result?.warnings?.includes('EXECUTION_HISTORY_TRUNCATED') && (
                <p className="text-warning">Показаны первые 5 000 шагов.</p>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
};

const ReaderSimulator: React.FC<RuntimeProps> = ({
  ready,
  active,
  result,
  error,
  stale,
  onStart,
  onCancel,
}) => {
  const [message, setMessage] = useState('');
  const [lastRunMessage, setLastRunMessage] = useState('');
  const [mode, setMode] = useState<SimulationMode>('finite');
  const [timeout, setTimeoutValue] = useState(10);

  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(24rem,2fr)_minmax(18rem,1fr)]">
      <Section title="Входная строка" className="flex min-h-[24rem] flex-col">
        <textarea
          aria-label="Входная строка"
          className={twMerge(
            controlClassName,
            'min-h-52 max-w-none flex-1 resize-none font-Fira-Mono'
          )}
          value={message}
          placeholder="Введите строку для обработки"
          onChange={(event) => setMessage(limitUnicodeCharacters(event.target.value, 10_000))}
        />
        <div className="mt-2 flex justify-end text-xs text-text-inactive">
          <span>{countUnicodeCharacters(message)} / 10 000</span>
        </div>
      </Section>
      <div className="flex flex-col gap-4">
        <Section title="Запуск">
          <FieldInput label="Режим" htmlFor="reader-simulator-mode">
            <select
              id="reader-simulator-mode"
              className={controlClassName}
              value={mode}
              onChange={(event) => setMode(event.target.value as SimulationMode)}
            >
              <option value="finite">Обычный</option>
              <option value="endless">Бесконечный</option>
            </select>
          </FieldInput>
          <FieldInput label="Таймаут, секунд" htmlFor="reader-simulator-timeout">
            <input
              id="reader-simulator-timeout"
              className={controlClassName}
              type="number"
              min={1}
              max={30}
              value={timeout}
              disabled={mode === 'endless'}
              onChange={(event) =>
                setTimeoutValue(Math.max(1, Math.min(30, Number(event.target.value))))
              }
            />
          </FieldInput>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={buttonClassName}
              disabled={!ready || active}
              onClick={() => {
                setLastRunMessage(message);
                onStart(mode, timeout, { message });
              }}
            >
              Запустить
            </button>
            <button type="button" className={buttonClassName} disabled={!active} onClick={onCancel}>
              Отменить
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
        </Section>
        <Section title="Результат" className="flex-1">
          <ReaderResult result={result} input={lastRunMessage} stale={stale} />
        </Section>
      </div>
    </div>
  );
};

export const Simulator: React.FC<SimulatorProps> = ({ initialSmId }) => {
  const modelController = useModelContext();
  const interpreter = useInterpreter();
  const [activeTask, solutionMachineId, selectSolution] = useTasks((state) => [
    getActiveTask(state),
    state.solutionMachineId,
    state.selectSolution,
  ]);
  const stateMachines = modelController.model.useData('', 'elements.stateMachinesId') as {
    [id: string]: StateMachine;
  };
  const allOptions = getSimulationMachineOptions(stateMachines);
  const options = activeTask
    ? allOptions.filter(
        ({ machine: optionMachine }) => optionMachine.platform === activeTask.platformId
      )
    : allOptions;
  const optionIds = JSON.stringify(options.map(({ id }) => id));
  const [selectedSmId, setSelectedSmId] = useState(() =>
    selectInitialMachineId(options, solutionMachineId ?? initialSmId)
  );
  const [lastRunXml, setLastRunXml] = useState<string>();
  const subscriptionSmId = selectedSmId ?? '';
  modelController.model.useData(subscriptionSmId, 'elements.states');
  modelController.model.useData(subscriptionSmId, 'elements.transitions');
  modelController.model.useData(subscriptionSmId, 'elements.components');
  modelController.model.useData(subscriptionSmId, 'elements.initialStates');
  modelController.model.useData(subscriptionSmId, 'elements.finalStates');
  modelController.model.useData(subscriptionSmId, 'elements.choiceStates');
  modelController.model.useData(subscriptionSmId, 'elements.shallowHistory');
  modelController.model.useData(subscriptionSmId, 'elements.name');
  const machine = selectedSmId ? stateMachines[selectedSmId] : undefined;
  const currentXml =
    machine && selectedSmId
      ? exportStateMachineCGML(modelController.model.data.elements, selectedSmId)
      : undefined;
  const resultStale = isSimulationResultStale(
    interpreter.result !== undefined,
    lastRunXml,
    currentXml
  );

  useEffect(() => {
    if (!activeTask) return;
    selectSolution(selectedSmId, currentXml);
  }, [activeTask, currentXml, selectSolution, selectedSmId]);

  useEffect(() => {
    if (!initialSmId || interpreter.active) return;
    if (options.some(({ id }) => id === initialSmId)) {
      setSelectedSmId(initialSmId);
      setLastRunXml(undefined);
      interpreter.clear();
    }
    // initialSmId changes only when the Simulator workspace is opened for another machine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSmId]);

  useEffect(() => {
    if (interpreter.active || options.some(({ id }) => id === selectedSmId)) return;
    setSelectedSmId(selectInitialMachineId(options));
    setLastRunXml(undefined);
    interpreter.clear();
    // optionIds represents the supported subset; options itself is rebuilt on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interpreter.active, interpreter.clear, optionIds, selectedSmId]);

  const selectMachine = (smId: string) => {
    if (interpreter.active || smId === selectedSmId) return;
    setSelectedSmId(smId);
    setLastRunXml(undefined);
    interpreter.clear();
    if (activeTask) {
      const xml = exportStateMachineCGML(modelController.model.data.elements, smId);
      selectSolution(smId, xml);
    }
  };

  const start = (mode: SimulationMode, timeout: number, parameters: SimulationParameters) => {
    if (!selectedSmId || !currentXml) return;
    setLastRunXml(currentXml);
    interpreter.start({
      xml: currentXml,
      machineId: selectedSmId,
      mode,
      ...(mode === 'finite' ? { timeoutSeconds: timeout } : {}),
      parameters,
    });
  };

  const runTaskTest = (testId: string) => {
    if (!activeTask || !selectedSmId || !currentXml) return;
    interpreter.startTest({
      xml: currentXml,
      machineId: selectedSmId,
      task: taskForProtocol(activeTask),
      testId,
    });
  };

  const submitTask = () => {
    if (!activeTask || !selectedSmId || !currentXml) return;
    if (
      !window.confirm(
        'Будут последовательно запущены все тесты. Проверку нельзя отменить, закрыть Simulator или изменить диаграмму до завершения. Продолжить?'
      )
    ) {
      return;
    }
    interpreter.startSubmission({
      xml: currentXml,
      machineId: selectedSmId,
      task: taskForProtocol(activeTask),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-primary text-text-primary">
      <SimulatorHeader
        options={options}
        selectedSmId={selectedSmId}
        machine={machine}
        status={interpreter.status}
        active={interpreter.active}
        onSelect={selectMachine}
      />
      {!machine && (
        <div className="p-6 text-text-inactive">
          {activeTask
            ? `В текущем документе нет машины для платформы ${activeTask.platformId}. Откройте или создайте совместимый документ.`
            : 'В текущем документе нет машин с поддержкой симуляции.'}
        </div>
      )}
      {activeTask && (
        <TaskMode
          task={activeTask}
          ready={interpreter.ready}
          active={interpreter.active}
          operationKind={interpreter.operationKind}
          error={interpreter.error}
          hasSolution={machine !== undefined}
          onRunTest={runTaskTest}
          onCancel={interpreter.cancel}
          onSubmit={submitTask}
        />
      )}
      {!activeTask && machine?.platform === 'junior-gardener' && (
        <GardenerSimulator
          {...interpreter}
          stale={resultStale}
          onStart={start}
          onCancel={interpreter.cancel}
        />
      )}
      {!activeTask && machine?.platform === 'junior-reader' && (
        <ReaderSimulator
          {...interpreter}
          stale={resultStale}
          onStart={start}
          onCancel={interpreter.cancel}
        />
      )}
    </div>
  );
};
