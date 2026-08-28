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
    super.closeHandler(host, port, event);
  }

  static errorHandler(error: unknown): void {
    this.ready = false;
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
    return this.sendJson(envelope) ? runId : undefined;
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
