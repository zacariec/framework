import type EventEmitter from 'node:events';
import type { WebSocket } from 'ws';

import { FrameworkEvent, WebsocketClientEvents } from '@constants/events.js';

export type WebsocketEventMessage = {
  type: WebsocketClientEvents;
  verbose: Record<string, any>;
};

export class WebsocketClient {
  private ws: WebSocket;
  private emitter: EventEmitter;

  constructor(ws: WebSocket, emitter: EventEmitter) {
    this.ws = ws;
    this.emitter = emitter;

    this.initialize();
  }

  private handleFileChange(event: FrameworkEvent) {
    console.log(event);
    this.ws.send(
      JSON.stringify({
        type: WebsocketClientEvents.Change,
        verbose: {},
      }),
    );
  }

  private handleStateChange(event: FrameworkEvent) {
    this.ws.send(
      JSON.stringify({
        type: WebsocketClientEvents.State,
        verbose: {},
      }),
    );
  }

  private handleError(event: FrameworkEvent) {
    this.ws.send(
      JSON.stringify({
        type: WebsocketClientEvents.Error,
        verbose: {},
      }),
    );
  }

  private subscribeEvents() {
    const events: Record<string, Function> = {
      [WebsocketClientEvents.Change]: this.handleFileChange,
      [WebsocketClientEvents.Error]: this.handleError,
      [WebsocketClientEvents.State]: this.handleStateChange,
    };

    Object.entries(events).forEach(([name, callback]) => {
      this.emitter.on(name, callback.bind(this));
    });
  }

  private initialize() {
    this.subscribeEvents();
  }
}
