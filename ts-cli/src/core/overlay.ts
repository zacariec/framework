export class FrameworkOverlay extends HTMLElement {
  events: Record<string, string>;
  open: boolean;
  ws: WebSocket;

  constructor() {
    super();
    this.events = {
      open: 'open',
      close: 'close',
    };
    this.open = false;
    this.ws = new WebSocket(window.FrameworkServer);
  }

  toggleClose() {
    this.open = false;
    this.render();
  }

  toggleOpen() {
    this.open = true;
    this.render();
    this.focus();
  }

  subscribeToEvents() {
    this.addEventListener(this.events.open, this.toggleOpen.bind(this));
    this.addEventListener(this.events.close, this.toggleClose.bind(this));
    this.addEventListener('keyup', (event) => {
      if (event.key === 'Escape') {
        this.toggleClose();
      }
    });

    this.ws.onclose = (event) => {
      console.log(this.ws.CLOSED, event);
    };
    this.ws.onmessage = (event) => {
      console.log(event);
    };
  }

  render(error?: any) {
    if (this.open === false) {
      return ``;
    }

    this.innerHTML = `
      <div>
        ${error}
      </div>
    `;
    return;
  }

  connectedCallback() {
    this.subscribeToEvents();

    this.render();
  }
}

window.customElements.get('framework-overlay') ||
  window.customElements.define('framework-overlay', FrameworkOverlay);
