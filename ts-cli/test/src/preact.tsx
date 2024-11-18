import React from 'react';
import register from 'preact-custom-element';

const PreactComponent = ({ name = 'Preact' }) => <h1>Hello from {name}!</h1>;

register(PreactComponent, 'preact-component', ['name'], { shadow: true });
