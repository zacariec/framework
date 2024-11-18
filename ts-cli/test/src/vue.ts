import { defineCustomElement } from 'vue';
import Component from './vue.vue';

const VueComponent = defineCustomElement(Component);

customElements.define('vue-component', VueComponent);
