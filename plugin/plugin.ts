import path from "node:path";

import { config } from "./modules/config";
import { inject } from "./modules/inject";

import type { PluginOption } from "vite";
import type { FrameworkOptions } from "./types";

export default function framework(options?: FrameworkOptions): PluginOption {
  const defaults: Required<FrameworkOptions> = {
    directory: path.join(process.cwd(), options?.directory ?? ""),
    client: path.join(
      process.cwd(),
      "snippets",
      (options?.client ?? "vite-client").split(".")[0] +
        "." +
        (path.extname(options?.client ?? "vite-client.liquid") !== "liquid"
          ? "liquid"
          : "liquid"),
    ),
    snippet: path.join(
      process.cwd(),
      "snippets",
      (options?.snippet ?? "framework").split(".")[0] +
        "." +
        (path.extname(options?.snippet ?? "famework.liquid") !== "liquid"
          ? "liquid"
          : "liquid"),
    ),
  };

  return [config(defaults), inject(defaults)];
}
