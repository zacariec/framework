window.requestIdleCallback = window.requestIdleCallback || function(cb) {
  let start = Date.now();
  return setTimeout(function() {
    cb({
      didTimeout: false,
      timeRemaining: function() {
        return Math.max(0, 50 - (Date.now() - start));
      },
    });
  }, 1);
};

window.cancelIdleCallback = window.cancelIdleCallback || function(id) {
  clearTimeout(id);
};

class FrameworkIsland extends HTMLElement {
  client;
  assetUrl;
  elementName;
  states;
  
  constructor() {
    super();
    this.client = this.getClientState();
    this.assetUrl = this.getAssetUrl();
    this.elementName = this.getElementName();
    this.states = ["load", "idle", "visible", "media"];
  }

  getElementName() {
    if (this.hasAttribute("element-name") !== true) {
      throw new Error("Island tried to initialize without a valid element-name attribute");
    }
    
    const elementName = this.getAttribute("element-name");

    if (typeof elementName !== "string") {
      throw new Error("No element name passed to Island element-name attribute");
    }

    return elementName;
  }

  getAssetUrl() {
    if (this.hasAttribute("asset-url") !== true) {
      throw new Error("Island tried to intialize without a valid asset url to load");
    }

    const assetUrl = this.getAttribute("asset-url");

    if (typeof assetUrl !== "string") {
      throw new Error("No url passed to Island asset-url");
    }

    return assetUrl?.startsWith("//") ? "https://" + assetUrl : assetUrl;
  }

  getClientState() {
    if (this.hasAttribute("client") !== true) {
      throw new Error("Island tried to load without state");
    }
    
    const clientState = this.getAttribute("client");
    
    if (typeof clientState !== "string") {
      throw new Error("Loaded island state is not a string");
    }

    if (!this.states.includes(clientState)) {
      throw new Error("Invalid state for and island");
    }

    return clientState;
  }

  importIslandAsset() {
    requestAnimationFrame(() => {
      this.outerHTML = this.innerHTML;
      const doesExist = window.customElements.get(this.elementName);

      if (doesExist !== undefined) {
        throw new Error(this.elementName + " already registered to customElements");
      }

      import(this.assetUrl);
    });
  }
  
  intersectionObserverCallback(entries, observer) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      
      this.importIslandAsset();
      observer.disconnect();
    });
  }

  mediaObserver(event) {
    event.preventDefault();
    
    if (this.media && window.matchMedia(this.media).matches) {
      this.importIslandAsset();
      window.removeEventListener("resize", this.mediaobserver);
    }
  }

  connectedCallback() {
    switch (this.client) {
      case "load":
        this.importIslandAsset();
        break;
      case "idle":
        window.requestIdleCallback(() => this.importIslandAsset());
        break;
      case "visible":
        const intersectionObserver = new intersectionObserver(
          this.intersectionObserverCallback,
          { root: document, threshold: 1.0, rootMargin: "0px" },
        );

        intersectionObserver.observe(this);
        break;
      case "media":
        if (this.media === undefined) {
          this.importIslandAsset();
          break;
        }
        
        if (window.matchMedia(this.media).matches) {
          this.importIslandAsset();
          break;
        }
      
        window.addEventListener("resize", this.mediaObserver);
        break;
      default:
        this.importIslandAsset();
        break;
    }
  }
}

window.customElements.get("framework-island") || window.customElements.define("framework-island", FrameworkIsland);
