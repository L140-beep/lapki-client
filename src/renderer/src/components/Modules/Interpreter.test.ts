import Websocket from 'isomorphic-ws';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InterpreterClient } from './Interpreter';
import { ClientWS } from './Websocket/ClientWS';

class FirstClient extends ClientWS {}
class SecondClient extends ClientWS {}

describe('ClientWS message subscriptions', () => {
  it('isolates listeners between subclasses', () => {
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    const unsubscribeFirst = FirstClient.subscribeMessages(firstListener);
    const unsubscribeSecond = SecondClient.subscribeMessages(secondListener);
    const message = { data: 'first' } as Websocket.MessageEvent;

    FirstClient.messageHandler(message);

    expect(firstListener).toHaveBeenCalledWith(message);
    expect(secondListener).not.toHaveBeenCalled();
    unsubscribeFirst();
    unsubscribeSecond();
  });
});

describe('InterpreterClient', () => {
  afterEach(() => {
    InterpreterClient.connection = undefined;
    InterpreterClient.ready = false;
    InterpreterClient.activeRunId = undefined;
  });

  it('uses the interpreter websocket endpoint', () => {
    expect(InterpreterClient.makeAddress('127.0.0.1', 49152)).toBe('ws://127.0.0.1:49152/ws');
  });

  it('sends a correlated versioned start request only after readiness', () => {
    const send = vi.fn();
    InterpreterClient.connection = {
      readyState: Websocket.OPEN,
      send,
    } as unknown as Websocket;
    const payload = {
      xml: '<graphml/>',
      machineId: 'machine',
      mode: 'finite' as const,
      timeoutSeconds: 10,
      parameters: { message: 'hello' },
    };

    expect(InterpreterClient.start(payload)).toBeUndefined();
    InterpreterClient.ready = true;
    const runId = InterpreterClient.start(payload);

    expect(runId).toBeTruthy();
    const envelope = JSON.parse(send.mock.calls[0][0]);
    expect(envelope).toMatchObject({
      protocolVersion: 1,
      type: 'run.start',
      runId,
      payload,
    });
    expect(envelope.requestId).toBeTruthy();
    expect(InterpreterClient.activeRunId).toBe(runId);
  });

  it('releases the active run after a terminal response', () => {
    InterpreterClient.activeRunId = 'run-1';

    InterpreterClient.messageHandler({
      data: JSON.stringify({
        protocolVersion: 1,
        type: 'run.cancelled',
        requestId: 'request-1',
        runId: 'run-1',
        payload: { status: 'cancelled' },
      }),
    } as Websocket.MessageEvent);

    expect(InterpreterClient.activeRunId).toBeUndefined();
  });
});
