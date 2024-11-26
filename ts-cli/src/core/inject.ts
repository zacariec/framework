/**
 * Injects the necessary scripts into the layout file
 */
export async function injectScripts(content: string): Promise<string> {
  const { isDevelopment, viteServerUrl } = globalThis.config;

  try {
    // Convert the library function to a string
    (await import('ts-node')).register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
      },
    });

    const libraryCode = await import('./library.js');

    // Create the injection content
    const injectContent = `
<script data-framework id="FrameworkLibrary" crossorigin>
  // fix for ts-node esbuild underlying issue: https://github.com/evanw/esbuild/issues/1031
  var __name = (func) => func;
  window.FrameworkServer = ${JSON.stringify(globalThis.config.websocketServer.address())}
  ${libraryCode.FrameworkIsland}
  window.customElements.get('framework-island') ||
    window.customElements.define('framework-island', FrameworkIsland);

  ${
    isDevelopment
      ? `
    // fix for ts-node esbuild underlying issue: https://github.com/evanw/esbuild/issues/1031
    ${libraryCode.SessionLog}
    ${libraryCode.FrameworkOverlay}
    window.customElements.get('framework-overlay') ||
      window.customElements.define('framework-overlay', FrameworkOverlay);`
      : ``
  }
</script>
  ${
    isDevelopment
      ? `<script type="module" src="${viteServerUrl}/@vite/client"></script>
      <framework-overlay></framework-overlay>`
      : ''
  }
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
