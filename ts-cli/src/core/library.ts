type ClientState = 'load' | 'idle' | 'visible' | 'media';

export function initializeFramework() {
  class FrameworkIsland extends HTMLElement {
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

        import(/* webpackIgnore: true */ this.assetUrl);
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
}

