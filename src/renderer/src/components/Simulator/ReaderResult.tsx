import React from 'react';

import { SimulationResult } from '@renderer/types/InterpreterTypes';

import { countUnicodeCharacters } from './readerModel';

const statusLabels: Record<SimulationResult['status'], string> = {
  success: 'Завершено',
  timeout: 'Таймаут',
  cancelled: 'Отменено',
  crash: 'Авария',
  error: 'Ошибка',
};

const SignalSequence: React.FC<{
  title: string;
  signals: string[];
}> = ({ title, signals }) => (
  <div className="min-w-0 rounded border border-border-primary bg-bg-primary p-3">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <span className="rounded-full bg-bg-active px-2 py-0.5 text-xs text-text-inactive">
        {signals.length}
      </span>
    </div>
    {signals.length === 0 ? (
      <p className="text-sm text-text-inactive">Нет сигналов</p>
    ) : (
      <ol className="grid max-h-64 gap-2 overflow-auto text-sm">
        {signals.map((signal, index) => (
          <li
            key={`${index}:${signal}`}
            className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-2"
          >
            <span className="rounded bg-bg-active px-1.5 py-0.5 text-center text-xs text-text-inactive">
              {index + 1}
            </span>
            <code className="break-all font-Fira-Mono text-text-primary">{signal}</code>
          </li>
        ))}
      </ol>
    )}
  </div>
);

export const ReaderResult: React.FC<{
  result?: SimulationResult;
  input: string;
  stale: boolean;
}> = ({ result, input, stale }) => {
  if (!result) {
    return (
      <div className="rounded border border-dashed border-border-primary p-4 text-center text-sm text-text-inactive">
        Результат появится после запуска.
      </div>
    );
  }

  const signals = result.result?.signals ?? [];
  const calledSignals = result.result?.calledSignals ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border-primary px-3 py-1 text-sm font-medium">
          {statusLabels[result.status]}
        </span>
      </div>

      {result.message && <p className="text-sm">{result.message}</p>}
      {stale && (
        <p className="border-warning/50 bg-warning/10 rounded border p-3 text-sm text-warning">
          Результат устарел: машина состояний была изменена после запуска. Его по-прежнему можно
          просматривать.
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2 text-sm">
          <h3 className="font-medium">Вход последнего запуска</h3>
          <span className="text-text-inactive">{countUnicodeCharacters(input)} символов</span>
        </div>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded border border-border-primary bg-bg-primary p-3 font-Fira-Mono text-sm">
          {input || 'Пустая строка'}
        </pre>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <SignalSequence title="Системные события" signals={signals} />
        <SignalSequence title="Выходные импульсы" signals={calledSignals} />
      </div>
    </div>
  );
};
