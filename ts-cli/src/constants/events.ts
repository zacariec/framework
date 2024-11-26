import EventEmitter from 'node:events';

export enum WatchEventEmitterEvents {
  SelectedEnvironment = 'selectedEnvironment',
  WatchInfo = 'watchInfo',
  WatchSuccess = 'watchSuccess',
  WatchError = 'watchError',
  WatchWarning = 'watchWarning',
  ViteInfo = 'viteInfo',
  ViteSuccess = 'viteSuccess',
  ViteError = 'viteError',
  ViteWarning = 'viteWarning',
}

export const WatchEventEmitter = new EventEmitter().setMaxListeners(1);

export enum WebsocketClientEvents {
  Change = 'change',
  Error = 'error',
  State = 'status',
}

export type FrameworkEvent = {
  type: WebsocketClientEvents,
  data: {
    message: string;
    file: string;
  };
};

export class TypedEventEmitter<Events extends string | symbol, Payload> {
  private eventEmitter: EventEmitter;

  constructor(emitter: EventEmitter) {
    this.eventEmitter = emitter;
  }

  public emit(event: Events, payload: Payload) {
    this.eventEmitter.emit(event, payload);
  }

  public off(event: Events, listener: (...args: any[]) => void) {
    this.eventEmitter.off(event, listener);
  }

  public on(event: Events, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
  }
}

export const WebsocketEventEmitter = new TypedEventEmitter<WebsocketClientEvents, FrameworkEvent>(new EventEmitter().setMaxListeners(1));

