import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators/custom-element.js';

@customElement('my-component')
export class MyComponent extends LitElement {
  protected render(): unknown {
    return html`
      <div>
        <h1>Hello from Lit.dev!</h1>
      </div>
    `;
  }
}
