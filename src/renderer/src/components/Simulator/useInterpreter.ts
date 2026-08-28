import { useCallback, useEffect, useState } from 'react';

import { useSettings } from '@renderer/hooks/useSettings';
import {
  InterpreterEnvelope,
  RunStartPayload,
  SimulationResult,
} from '@renderer/types/InterpreterTypes';

import { InterpreterClient } from '../Modules/Interpreter';
import { ClientStatus } from '../Modules/Websocket/ClientStatus';

export const useInterpreter = () => {
  const [settings] = useSettings('interpreter');
  const [status, setStatus] = useState(
    InterpreterClient.ready ? ClientStatus.CONNECTED : ClientStatus.NO_CONNECTION
  );
  const [activeRunId, setActiveRunId] = useState<string>();
  const [result, setResult] = useState<SimulationResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    InterpreterClient.bind(
      (nextStatus) => {
        setStatus(nextStatus);
        if (nextStatus === ClientStatus.NO_CONNECTION) {
          setActiveRunId(undefined);
        }
      },
      () => undefined
    );
    setStatus(InterpreterClient.ready ? ClientStatus.CONNECTED : ClientStatus.NO_CONNECTION);

    return InterpreterClient.subscribeMessages<InterpreterEnvelope>((message) => {
      if (message.type === 'run.started') return;
      if (message.type === 'run.cancel.accepted') return;
      if (message.type === 'error') {
        const payload = message.payload as { message?: string };
        setError(payload.message ?? 'Интерпретатор вернул ошибку');
        setActiveRunId(undefined);
        return;
      }
      if (
        message.type === 'run.completed' ||
        message.type === 'run.cancelled' ||
        message.type === 'run.failed'
      ) {
        setResult(message.payload as SimulationResult);
        setActiveRunId(undefined);
      }
    });
  }, []);

  useEffect(() => {
    if (!settings || settings.localPort <= 0) return;
    void InterpreterClient.connect(settings.localHost, settings.localPort);
  }, [settings]);

  const start = useCallback((payload: RunStartPayload) => {
    setError(undefined);
    setResult(undefined);
    const runId = InterpreterClient.start(payload);
    if (runId) setActiveRunId(runId);
    else setError('Интерпретатор ещё не готов к запуску');
  }, []);

  const cancel = useCallback(() => {
    if (activeRunId) InterpreterClient.cancel(activeRunId);
  }, [activeRunId]);

  return {
    status,
    ready: status === ClientStatus.CONNECTED && InterpreterClient.ready,
    active: activeRunId !== undefined,
    result,
    error,
    start,
    cancel,
  };
};
