import { WebsocketClientEvents } from '@constants/events.js';
import jsdom from 'jsdom';
import type { WebsocketEventMessage } from './websocket.js';

type ClientState = 'load' | 'idle' | 'visible' | 'media';

/* shim so ts-node doesn't complain */
const { window } = new jsdom.JSDOM();
const { HTMLElement } = window;

export class FrameworkIsland extends HTMLElement {
  client: ClientState;
  media?: string;
  assetUrl: string;
  elementName: string;

  constructor() {
    super();
    this.client = this.getClientState();
    this.assetUrl = this.getAssetUrl();
    this.elementName = this.getElementName();
  }

  public getElementName(): string {
    if (this.hasAttribute('element-name') !== true) {
      throw new Error('Island tried to initialize without a valid element-name attribute');
    }

    const elementName = this.getAttribute('element-name');

    if (typeof elementName !== 'string') {
      throw new Error('No element name passed to Island element-name');
    }

    return elementName;
  }

  public getAssetUrl(): string {
    if (this.hasAttribute('asset-url') !== true) {
      throw new Error('Island tried to initialize without a valid asset url to load');
    }

    const assetUrl = this.getAttribute('asset-url');

    if (typeof assetUrl !== 'string') {
      throw new Error('No url passed to Island asset-url');
    }

    return assetUrl?.startsWith('//') ? `https://${assetUrl}` : assetUrl;
  }

  public getClientState(): ClientState {
    if (this.hasAttribute('client') !== true) {
      throw new Error('Island tried to load without state');
    }

    const clientState = this.getAttribute('client');
    const possibleStates = ['load', 'idle', 'visible', 'media'];

    if (typeof clientState !== 'string') {
      throw new Error('Loaded island state is not a string');
    }

    if (!possibleStates.includes(clientState)) {
      throw new Error('Invalid state for an island');
    }

    // casting because we satisfied the compiler above.
    return clientState as ClientState;
  }

  public importIslandAsset(): void {
    requestAnimationFrame(() => {
      this.outerHTML = this.innerHTML;
      const doesExist = window.customElements.get(this.elementName);

      if (doesExist !== undefined) {
        throw new Error(`${this.elementName} already registered to customElements`);
      }

      import(this.assetUrl);
    });
  }

  private intersectionObserverCallback(
    entries: IntersectionObserverEntry[],
    observer: IntersectionObserver,
  ): void {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      this.importIslandAsset();
      observer.disconnect();
    });
  }

  public mediaObserver(event: Event) {
    event.preventDefault();

    if (this.media && window.matchMedia(this.media).matches) {
      this.importIslandAsset();
      window.removeEventListener('resize', this.mediaObserver);
    }
  }

  connectedCallback() {
    switch (this.client) {
      case 'load':
        this.importIslandAsset();

        break;
      case 'idle':
        window.requestIdleCallback(() => this.importIslandAsset());

        break;
      case 'visible':
        const intersectionObserver = new IntersectionObserver(this.intersectionObserverCallback, {
          root: document,
          threshold: 1.0,
          rootMargin: '0px',
        });

        intersectionObserver.observe(this);

        break;
      case 'media':
        if (this.media === undefined) {
          this.importIslandAsset();

          break;
        }

        if (window.matchMedia(this.media).matches) {
          this.importIslandAsset();

          break;
        }

        window.addEventListener('resize', this.mediaObserver);

        break;
      default:
        this.importIslandAsset();
        break;
    }
  }
}

window.customElements.get('framework-island') ||
  window.customElements.define('framework-island', FrameworkIsland);

export class SessionLog<T> {
  public name: string;
  public logs: T[];

  constructor(name: string) {
    this.name = name;
    this.logs = this.fetch();
  }

  private offload() {
    window.sessionStorage.setItem(this.name, JSON.stringify(this.logs));
    this.logs = this.fetch();
  }

  private fetch(): T[] {
    const hasSessionStorage = window.sessionStorage.getItem(this.name);

    if (
      hasSessionStorage === null ||
      hasSessionStorage === 'null' ||
      hasSessionStorage === 'undefined' ||
      hasSessionStorage === undefined
    ) {
      window.sessionStorage.setItem('framework-session-log', JSON.stringify([]));
      return [];
    }

    return JSON.parse(hasSessionStorage);
  }

  public push(log: T) {
    this.logs.push(log);
    this.offload();
  }
}

type LogType = {
  id: string;
  type: 'ERROR' | 'INFO' | 'WARN' | 'RELOAD' | 'CHANGE';
  message: string;
  stack?: unknown;
  timestamp: string;
};

export class FrameworkOverlay extends HTMLElement {
  private ws: WebSocket;
  private sessionLog: SessionLog<LogType>;
  private open: boolean;

  constructor() {
    super();
    this.ws = new WebSocket('http://localhost:' + window.FrameworkServer.port);
    this.sessionLog = new SessionLog<LogType>('framework-session-log');
    this.open = false;
  }

  private handleFileChange(event: WebsocketEventMessage) {
    console.info(event);
    // this.ws.send(WebsocketClientEvents.Change);
  }

  private handleStateChange(event: WebsocketEventMessage) {
    console.info(event);
    // this.ws.send(WebsocketClientEvents.State);
  }

  private handleError(event: WebsocketEventMessage) {
    console.error(event);
    // this.ws.send(WebsocketClientEvents.Error);
  }

  private parseData(str: string): WebsocketEventMessage | SyntaxError | undefined {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.error(error);

      if (error instanceof SyntaxError) {
        return error;
      }

      return undefined;
    }
  }

  public addChangeLog(message?: string, change?: unknown) {
    this.sessionLog.push({
      id: window.crypto.randomUUID(),
      type: 'CHANGE',
      message: message ?? '',
      timestamp: new Date().toISOString(),
    });
  }

  public addWarnLog(message?: string, warn?: string) {
    this.sessionLog.push({
      id: window.crypto.randomUUID(),
      type: 'WARN',
      message: message ?? '',
      timestamp: new Date().toISOString(),
    });
  }

  public addReloadLog(message?: string) {
    this.sessionLog.push({
      id: window.crypto.randomUUID(),
      type: 'RELOAD',
      message: message ?? '',
      timestamp: new Date().toISOString(),
    });
  }

  public addInfoLog(message?: string) {
    this.sessionLog.push({
      id: window.crypto.randomUUID(),
      type: 'INFO',
      message: message ?? '',
      timestamp: new Date().toISOString(),
    });
  }

  public addErrorLog(message?: string, err?: unknown | SyntaxError) {
    this.sessionLog.push({
      id: window.crypto.randomUUID(),
      type: 'ERROR',
      message: message ?? '',
      stack: err instanceof SyntaxError ? [err] : [],
      timestamp: new Date().toISOString(),
    });
  }

  private subscribeEvents() {
    this.ws.onmessage = (event: MessageEvent<string>) => {
      const data = this.parseData(event.data);

      // graciously handle return error.
      if (data instanceof SyntaxError || !data) {
        this.addErrorLog();
        return;
      }

      switch (data.type) {
        case 'status':
          this.handleStateChange(data);
          break;
        case 'change':
          this.handleFileChange(data);
          break;
        case 'error':
          this.handleError(data);
          break;
        default:
          console.log(event);
          break;
      }
    };
  }

  private handleLogsClick(event: MouseEvent) {
    this.open = !this.open;
    this.render();
  }

  private bindEvents() {
    this.querySelector<HTMLButtonElement>('#FrameworkLogs')?.addEventListener(
      'click',
      this.handleLogsClick.bind(this),
    );
  }

  private render() {
    this.innerHTML = `
    <style>
      :host {
        max-width: 250px;
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 2rem;
      }

      nav ul {
        display: flex;
        flex-direction: row;
      }

      #FrameworkLogList {
        display: none;
      }

      #FrameworkLogList[open] {
        display: flex;
        width: 50vw;
        height: 50vh;
      }
    </style>
    <nav>
      <ul>
        <li>
        <button type="button" id="FrameworkLogs">
            Logs
        </button>
        </li>
        <li>
          <button type="button" id="FrameworkInspector">
            Inspect
          </button>
        </li>
      </ul>
    </nav>

    <div ${this.open === true ? 'open' : ''} id="FrameworkLogList">
      <ul>
      ${this.sessionLog.logs.map(
        (log) =>
          `<li>
          ${JSON.stringify(log)}
        </li>`,
      )}
      </ul>
    </div>
`;
    return;
  }

  connectedCallback() {
    this.subscribeEvents();
    this.bindEvents();
    this.render();
  }
}
