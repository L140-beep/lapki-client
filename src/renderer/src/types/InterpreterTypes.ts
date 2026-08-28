import type {
  GardenerCell,
  GardenerOrientation,
  GardenerPosition,
} from '../components/Simulator/model';

export const INTERPRETER_PROTOCOL_VERSION = 1 as const;

export type SimulationMode = 'finite' | 'endless';

export type GardenerParameters = {
  width: number;
  height: number;
  field: GardenerCell[][];
  position: GardenerPosition;
  orientation: Uppercase<GardenerOrientation>;
};

export type ReaderParameters = {
  message: string;
};

export type RunStartPayload = {
  xml: string;
  machineId: string;
  mode: SimulationMode;
  timeoutSeconds?: number;
  parameters: GardenerParameters | ReaderParameters;
};

export type InterpreterRequestType = 'run.start' | 'run.cancel';
export type InterpreterResponseType =
  | 'connection.ready'
  | 'run.started'
  | 'run.cancel.accepted'
  | 'run.completed'
  | 'run.cancelled'
  | 'run.failed'
  | 'error';

export interface InterpreterEnvelope<TPayload = Record<string, unknown>> {
  protocolVersion: typeof INTERPRETER_PROTOCOL_VERSION;
  type: InterpreterRequestType | InterpreterResponseType;
  requestId: string;
  runId?: string;
  payload: TPayload;
}

export type GardenerStep = {
  position: GardenerPosition;
  orientation: GardenerOrientation;
  field: GardenerCell[][];
};

export type SimulationResult = {
  status: 'success' | 'cancelled' | 'crash' | 'error';
  message?: string;
  steps?: GardenerStep[];
  warnings?: string[];
  result?: {
    signals: string[];
    calledSignals: string[];
    timeout?: boolean;
    environment?: GardenerStep;
  };
  code?: string;
};
