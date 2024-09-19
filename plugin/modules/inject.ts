import path from "node:path";
import fs from "node:fs/promises";

import type { Plugin, ResolvedConfig } from "vite";
import type { FrameworkOptions } from "../types";

/* Create the client snippet for Vite to hook */
async function createClientSnippet(
  config: ResolvedConfig,
  options: Required<FrameworkOptions>,
): Promise<void> {
  const viteClientScript = `{% comment %}This file is auto-generated, please don't change it.{% endcomment %}\n<script type="module" src="http://${config.server.host}:${config.server.port}/@vite/client"></script>`;

  /* Create the client snippet for Vite to hook */
  try {
    await fs.writeFile(options.client, viteClientScript, "utf8");
  } catch (err) {
    console.error(
      `Error writing vite client script, please manually add:\n${viteClientScript}\nto the head of the document:\n${err}`,
    );
  }
}

/* Add the created snippet to the head */
async function appendClientSnippet(
  config: ResolvedConfig,
  options: Required<FrameworkOptions>,
): Promise<void> {
  try {
    const themeLayoutFile = path.join(process.cwd(), "layout", "theme.liquid");
    const layoutContents = await fs.readFile(themeLayoutFile, "utf8");
    const layoutParts = layoutContents.split("<head>");
    const snippet = `{% render "${path.basename(options.client).replace(path.extname(options.client), "")}" %}`;

    if (layoutContents.includes(snippet) === false) {
      try {
        await fs.writeFile(
          themeLayoutFile,
          `${layoutParts[0]}\n<head>\n${config.command === "serve" ? `${snippet}\n` : ""}${layoutParts[1]}`,
          "utf8",
        );
      } catch (err) {
        console.error(
          `Error trying to write snippet to theme <head> please manually add ${snippet}`,
        );
      }
    }
  } catch (err) {
    console.error(`Error reading file layout file: ${err}`);
    process.exit(0);
  }
}

/* Create & Generate snippet for using vite entrypoints */
async function createViteSnippet(
  config: ResolvedConfig,
  options: Required<FrameworkOptions>,
): Promise<void> {
  try {
    const styleExtensions = "css,sass,scss,less";
    const snippet = `{%- liquid \n\tassign asset = ${path.basename(options.snippet.replace(path.extname(options.snippet), ""))}\n\tassign url = ${(config.command === "build") ? 'asset | asset_url' : `"http://${config.server.host}:${config.server.port}" | append: asset`}\n\tassign is_css = false\n\tassign asset_extension = asset | split: "." | last\n\tassign css_extensions = "${styleExtensions}" | split: ","\n\tfor extension in css_extensions\n\t\tif extension == asset_extension\n\t\t\tassign is_css = true\n\t\tendif\n\tendfor\n\tcapture html_tag\n\t\tif is_css == true\n\t\t\techo '<link rel="stylesheet" href="{{ url }}" crossorigin="anonymous">'\n\t\telse\n\t\t\techo '<script type="module" src="{{ url }}" crossorigin="anonymous"></script>'\n\t\tendif\n\tendcapture\n\techo html_tag | replace: "{{ url }}", url\n-%}\n`;

    await fs.writeFile(options.snippet, snippet);
  } catch (err) {
    console.error(`Error writing snippet for framework: ${err}`);
    process.exit(0);
  }
}

export function inject(options: Required<FrameworkOptions>): Plugin {
  let config: ResolvedConfig;

  return {
    name: "vite-plugin-framework-inject",
    enforce: "post",
    configResolved(conf) {
      config = conf;
    },
    async buildStart(_opts) {
      await Promise.allSettled([
        createClientSnippet(config, options),
        appendClientSnippet(config, options),
        createViteSnippet(config, options),
      ]);
    },
  };
}
