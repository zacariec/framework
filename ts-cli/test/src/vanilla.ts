class VanillaComponent extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1>Hello from JavaScript!</h1>
    `;
  }
}

window.customElements.get('vanilla-component') ||
  window.customElements.define('vanilla-component', VanillaComponent);
