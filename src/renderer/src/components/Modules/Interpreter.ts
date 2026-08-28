import Websocket from 'isomorphic-ws';
import { nanoid } from 'nanoid';

import {
  INTERPRETER_PROTOCOL_VERSION,
  InterpreterEnvelope,
  RunStartPayload,
} from '@renderer/types/InterpreterTypes';

import { ClientStatus } from './Websocket/ClientStatus';
import { ClientWS } from './Websocket/ClientWS';

export class InterpreterClient extends ClientWS {
  static ready = false;
  static activeRunId: string | undefined;

  static async connect(host: string, port: number, autoReconnect = true) {
    this.ready = false;
    return super.connect(host, port, autoReconnect);
  }

  static makeAddress(host: string, port: number): string {
    return `${super.makeAddress(host, port)}/ws`;
  }

  static onOpenHandler(): void {
    this.onStatusChange(ClientStatus.CONNECTING);
    this.setSecondsUntilReconnect(null);
  }

  static closeHandler(host: string, port: number, event: Websocket.CloseEvent): void {
    this.ready = false;
    this.activeRunId = undefined;
    super.closeHandler(host, port, event);
  }

  static errorHandler(error: unknown): void {
    this.ready = false;
    this.activeRunId = undefined;
    super.errorHandler(error);
  }

  static messageHandler(message: Websocket.MessageEvent): void {
    if (typeof message.data !== 'string') return;
    try {
      const envelope = JSON.parse(message.data) as InterpreterEnvelope;
      if (envelope.protocolVersion !== INTERPRETER_PROTOCOL_VERSION) return;
      if (envelope.type === 'connection.ready') {
        this.ready = true;
        this.onStatusChange(ClientStatus.CONNECTED);
      }
      if (
        envelope.runId === this.activeRunId &&
        (envelope.type === 'run.completed' ||
          envelope.type === 'run.cancelled' ||
          envelope.type === 'run.failed' ||
          envelope.type === 'error')
      ) {
        this.activeRunId = undefined;
      }
      this.emitMessage(envelope);
    } catch (error) {
      console.error('Invalid interpreter message', error);
    }
  }

  static start(payload: RunStartPayload): string | undefined {
    if (!this.ready) return;
    const runId = nanoid();
    const envelope: InterpreterEnvelope<RunStartPayload> = {
      protocolVersion: INTERPRETER_PROTOCOL_VERSION,
      type: 'run.start',
      requestId: nanoid(),
      runId,
      payload,
    };
    if (!this.sendJson(envelope)) return;
    this.activeRunId = runId;
    return runId;
  }

  static cancel(runId: string): boolean {
    return this.sendJson({
      protocolVersion: INTERPRETER_PROTOCOL_VERSION,
      type: 'run.cancel',
      requestId: nanoid(),
      runId,
      payload: {},
    } satisfies InterpreterEnvelope);
  }
}
