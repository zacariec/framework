# Framework
> Developer first framework for building Shopify Liquid Storefronts.

Framework is currently in alpha stage, providing a modern development experience for Shopify Liquid themes.

## 🚧 Alpha Status

Framework is under active development. Currently, the watch command is operational but other features are still being implemented. Use in production at your own risk.

## ✨ Features

- Custom liquid tokenizer, parser & compiler
- ESM-like `{% import %}` statements
- Island architecture out-of-the-box
- Zero JS by default (except for island HTML class)
- Single File Components
- Support for Preact, Vue, Solid, Svelte & Lit components
- TypeScript first
- Built on Vite
- Server-first design
- Seamless integration with existing Shopify Liquid Storefronts

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- A Shopify theme
- TypeScript knowledge
- Liquid knowledge
- TSX

### Installation

```bash
git clone https://github.com/zacariec/framework.git
cd framework/ts-cli
npm install
```

### Configuration

Create a `framework.config.ts` file in your project root:

```typescript
import { defineConfig } from '@zacariec/framework';
import preact from '@preact/preset-vite';
import vue from '@vitejs/plugin-vue';
import solid from 'vite-plugin-solid';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { lit } from '@lit/vite-plugin';

export default defineConfig({
  framework: {
    environments: {
      development: {
        store: 'your-store.myshopify.com',
        themeId: '123456789',
        password: 'shpat_xxxxx'
      }
    }
  },
  // Configure Vite plugins for UI frameworks
  vite: {
    plugins: [
      // Choose one or more of:
      preact(),
      vue(),
      solid(),
      svelte(),
      lit()
    ]
  }
});
```

> Note: Configuration can also be in `.js`, `.cjs`, `.mjs`, `.mts`, or `.cts` format.

### Supported UI Frameworks

Framework allows you to use various UI frameworks through Vite plugins:

```bash
# Preact
npm install @preact/preset-vite preact
# Vue
npm install @vitejs/plugin-vue vue
# Solid
npm install vite-plugin-solid solid-js
# Svelte
npm install @sveltejs/vite-plugin-svelte svelte
# Lit
npm install @lit/vite-plugin lit
```

Choose and install the frameworks you plan to use in your project.

### Framework Syntax

Framework extends Liquid with modern import capabilities and component architecture while maintaining compatibility with Shopify's Liquid syntax.

#### Import Statements
```liquid
{% import Component from '../components/my-component.ts' %}
{% import { ComponentOne, ComponentTwo } from '../components/exports.ts' %}

{% import '../styles/mycss.css' %}
{% import '../modules/myscript.ts' %}
```

#### Component Props
```liquid
{% props MyComponentProps %}
{
  "key": "value"
}
{% endprops %}
```

#### Using Components
Components can be used with different UI libraries and loading strategies:
```liquid
{% use Component | library: 'lit' | props: MyComponentProps | load: 'load' | name: 'my-component' %}
```

Parameters:
- `library`: Specify UI framework ('lit', 'preact', 'svelte', 'solid', 'vue')
- `props`: Pass props object
- `load`: Loading strategy ('idle', 'visible', 'load', 'media')
- `name`: Custom element name for the component

#### Loading Strategies

Framework provides several loading strategies to optimize when components are loaded and hydrated:

- `idle` (Recommended): Component loads when the browser's main thread is idle
  ```liquid
  {% use Component | library: 'preact' | load: 'idle' | name: 'my-component' %}
  ```

- `visible`: Component loads when it enters the viewport
  ```liquid
  {% use ProductCard | library: 'lit' | load: 'visible' | name: 'product-card' %}
  ```

- `load`: Component loads immediately on DOMContentLoaded
  ```liquid
  {% use Header | library: 'vue' | load: 'load' | name: 'site-header' %}
  ```

- `media`: Component loads when a media query matches
  ```liquid
  {% use MobileNav | library: 'solid' | load: 'media' | query: '(max-width: 768px)' | name: 'mobile-nav' %}
  ```

#### Loading Strategy Examples

Common use cases:

```liquid
{# Recommended for below-the-fold content #}
{% use ProductGrid | library: 'preact' | load: 'idle' | name: 'product-grid' %}

{# Good for large product image galleries #}
{% use Gallery | library: 'lit' | load: 'visible' | name: 'product-gallery' %}

{# Use for critical above-the-fold content #}
{% use Hero | library: 'vue' | load: 'load' | name: 'hero-banner' %}

{# Responsive components #}
{% use MobileFilters | library: 'solid' | load: 'media' | query: '(max-width: 640px)' | name: 'mobile-filters' %}
```

#### Dynamic Component Usage
Components can be used within standard Liquid control flow:
```liquid
{% for product in collection %}
  {% if product.type == 'some-type' %}
    {% use ComponentOne | library: 'preact' | load: 'idle' | name: 'component-one' %}
  {% elsif %}
    {% use ComponentTwo | library: 'svelte' | load: 'load' | name: 'component-two' %}
  {% endif %}
{% endfor %}
```

### Component Examples

Framework supports multiple UI libraries. Here are examples of how to create components with each supported framework:

#### Lit Component
```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators/custom-element.js';

@customElement('my-component')
export class MyComponent extends LitElement {
  protected render(): unknown {
    return html`
      <div>
        <h1>Hello from Shopify!</h1>
      </div>
    `;
  }
}
```

#### Preact Component
```typescript
import React from 'react';
import register from 'preact-custom-element';

const PreactComponent = ({ name = 'Preact' }) => <h1>Hello from {name}!</h1>;

register(PreactComponent, 'preact-component', ['name'], { shadow: true });
```

#### Svelte Component
```svelte
<svelte:options customElement={{
  tag: 'svelte-component',
  shadow: 'open',
  props: {
    name: {
      reflect: true,
      type: 'String'
    }
  }
}} />

<script>
  let { name = 'Svelte' } = $props();
</script>

<h1>Hello from {name}!</h1>
```

#### Vue Component
```vue
<!-- Component.vue -->
<script setup>
import { ref } from 'vue';

const greeting = ref('Hello from Vue!');
</script>

<template>
  <h1>{{ greeting }}</h1>
</template>
```

```typescript
// register.ts
import { defineCustomElement } from 'vue';
import Component from './vue.vue';

const VueComponent = defineCustomElement(Component);

customElements.define('vue-component', VueComponent);
```

#### Vanilla Web Component
```typescript
class VanillaComponent extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <h1>Hello from JavaScript!</h1>
    `;
  }
}

window.customElements.get('vanilla-component') ||
  window.customElements.define('vanilla-component', VanillaComponent);
```

### Using Components in Liquid

Once defined, these components can be used in your Liquid templates:

```liquid
{% use MyComponent | library: 'lit' | load: 'idle' | name: 'my-component' %}

{% use PreactComponent | library: 'preact' | load: 'visible' | name: 'preact-component' %}

{% props SvelteProps %}
{
  "name": "Custom Svelte"
}
{% endprops %}
{% use SvelteComponent | library: 'svelte' | load: 'load' | name: 'svelte-component' | props: SvelteProps %}

{% use VueComponent | library: 'vue' | load: 'idle' | name: 'vue-component' %}

{% use VanillaComponent | load: 'load' | name: 'vanilla-component' %}
```

#### Compiled Output
Framework compiles the syntax into standard Liquid and HTML that Shopify can process:

```liquid
<framework-island library="lit" load="load" name="my-component" asset="...">
  <my-component props='{...}'></my-component>
</framework-island>
```

In production:
- Assets are served from Shopify's CDN
- Components are properly isolated
- Loading strategies are respected
- Styles and scripts are optimized

In development:
- Assets are served from local Vite server
- Hot Module Replacement is enabled
- Source maps are available
- Real-time compilation

### Running the Development Server

```bash
tsx ./src/index.ts watch
```

## ⚙️ Current Limitations

- Only the watch command is currently implemented
- Some features are still in development
- Documentation is limited during alpha stage
- Breaking changes may occur during alpha

## 🤝 Contributing

Framework is in early development. Feel free to try it out and provide feedback through GitHub issues.

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/zacariec/framework)
- [Project Board](https://github.com/users/zacariec/projects/1)
