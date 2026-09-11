import React from 'react';

import { SimulationResult } from '@renderer/types/InterpreterTypes';

export const ReaderResult: React.FC<{
  result?: SimulationResult;
  stale: boolean;
}> = ({ result, stale }) => {
  if (!result) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-border-primary p-4 text-center text-xs leading-4 text-text-inactive">
        Импульсы появятся после запуска.
      </div>
    );
  }

  const impulses = result.result?.calledSignals ?? [];

  return (
    <div className="grid gap-3 rounded-lg border border-border-primary p-3">
      {result.message && <p className="text-xs leading-4">{result.message}</p>}
      {stale && (
        <p className="rounded-lg border border-warning p-3 text-xs leading-4 text-warning">
          Результат устарел: машина состояний была изменена после запуска. Его по-прежнему можно
          просматривать.
        </p>
      )}

      {impulses.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-lg p-4 text-center text-xs leading-4 text-text-inactive">
          Нет выходных импульсов.
        </div>
      ) : (
        <ol className="grid max-h-[236px] gap-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-scrollbar-track scrollbar-thumb-scrollbar-thumb">
          {impulses.map((impulse, index) => (
            <li
              key={`${index}:${impulse}`}
              className="rounded-lg border border-border-primary bg-bg-primary p-2"
            >
              <code className="break-all text-text-primary">{impulse}</code>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
