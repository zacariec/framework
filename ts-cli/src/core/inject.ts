import { initializeFramework } from './library.js';

/**
 * Injects the necessary scripts into the layout file
 */
export async function injectScripts(content: string): Promise<string> {
  const { isDevelopment, viteServerUrl } = globalThis.config;

  try {
    // Convert the library function to a string
    const libraryContent = String(initializeFramework);

    // Create the injection content
    const injectContent = `
    ${
      isDevelopment
        ? `
<script type="module" src="${viteServerUrl}/@vite/client"></script>
<script type="module">
  window.FrameworkServer = ${JSON.stringify(globalThis.config.websocketServer.address())}

class FrameworkOverlay extends HTMLElement {
  constructor() {
    super();
    this.events = {
      open: 'open',
      close: 'close',
    };
    this.open = false;
    this.ws = new WebSocket("http://localhost:" + window.FrameworkServer.port);

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
  if (event.data === 'reload') {
    window.location.reload();
  }

      console.log(event);
    };
  }

  render(error) {
    if (this.open === false) {
      return "";
    }

    this.innerHTML = "" + "<div>" + error + "</div>";
    return;
  }

  connectedCallback() {
    this.subscribeToEvents();

    this.render();
  }
}

window.customElements.get('framework-overlay') || window.customElements.define('framework-overlay', FrameworkOverlay)
</script>
          `
        : ''
    }
    <script type="module">
      // Initialize the framework

class FrameworkIsland extends HTMLElement {
  constructor() {
    super()
    this.client = this.getClientState()
    this.assetUrl = this.getAssetUrl()
    this.elementName = this.getElementName()
  }

  getElementName() {
    if (this.hasAttribute("name") !== true) {
      throw new Error(
        "Island tried to initialize without a valid element-name attribute"
      )
    }

    const elementName = this.getAttribute("name")

    if (typeof elementName !== "string") {
      throw new Error("No element name passed to Island element-name")
    }

    return elementName
  }

  getAssetUrl() {
    if (this.hasAttribute("asset") !== true) {
      throw new Error(
        "Island tried to initialize without a valid asset url to load"
      )
    }

    const assetUrl = this.getAttribute("asset")

    if (typeof assetUrl !== "string") {
      throw new Error("No url passed to Island asset")
    }

    return assetUrl?.startsWith("//") ? 'https://' + assetUrl : assetUrl
  }

  getClientState() {
    if (this.hasAttribute("load") !== true) {
      throw new Error("Island tried to load without state")
    }

    const clientState = this.getAttribute("load")
    const possibleStates = ["load", "idle", "visible", "media"]

    if (typeof clientState !== "string") {
      throw new Error("Loaded island state is not a string")
    }

    if (!possibleStates.includes(clientState)) {
      throw new Error("Invalid state for an island")
    }

    // casting because we satisfied the compiler above.
    return clientState
  }

  importIslandAsset() {
    requestAnimationFrame(() => {
      // this.outerHTML = this.innerHTML
      const doesExist = window.customElements.get(this.elementName)

      if (doesExist !== undefined) {
        throw new Error(this.elementName + 'already registered to customElements');
      }

      console.log(this.assetUrl);
      import(/* webpackIgnore: true */ this.assetUrl)
    })
  }

  intersectionObserverCallback(entries, observer) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        return
      }

      this.importIslandAsset()
      observer.disconnect()
    })
  }

  mediaObserver(event) {
    event.preventDefault()

    if (this.media && window.matchMedia(this.media).matches) {
      this.importIslandAsset()
      window.removeEventListener("resize", this.mediaObserver)
    }
  }

  connectedCallback() {
    switch (this.client) {
      case "load":
        this.importIslandAsset()

        break
      case "idle":
        window.requestIdleCallback(() => this.importIslandAsset())

        break
      case "visible":
        const intersectionObserver = new IntersectionObserver(
          this.intersectionObserverCallback,
          {
            root: document,
            threshold: 1.0,
            rootMargin: "0px"
          }
        )

        intersectionObserver.observe(this)

        break
      case "media":
        if (this.media === undefined) {
          this.importIslandAsset()

          break
        }

        if (window.matchMedia(this.media).matches) {
          this.importIslandAsset()

          break
        }

        window.addEventListener("resize", this.mediaObserver)

        break
      default:
        this.importIslandAsset()
        break
    }
  }
}

window.customElements.get("framework-island") ||
  window.customElements.define("framework-island", FrameworkIsland)

    </script>

    <framework-overlay></framework-overlay>
    `;

    // Find the head closing tag and inject our content
    const headEndIndex = content.indexOf('</head>');
    if (headEndIndex === -1) {
      throw new Error('Unable to find </head> tag in the HTML content');
    }

    // Inject the content before the closing head tag
    return content.slice(0, headEndIndex) + injectContent + content.slice(headEndIndex);
  } catch (error) {
    console.error('Error injecting scripts:', error);
    return content;
  }
}
