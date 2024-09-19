import path from "node:path";
import { fileURLToPath } from "node:url";

import glob from "fast-glob";

import type { Plugin, UserConfig } from "vite";
import type { FrameworkOptions } from "../types";

export function config(options: Required<FrameworkOptions>): Plugin {
  return {
    name: "vite-plugin-framework-config",
    config(config: UserConfig): UserConfig {
      return {
        publicDir: false,
        esbuild: {
          banner: `import "./island.js"`,
        },
        build: {
          outDir: config.build?.outDir ?? path.join(process.cwd(), "assets"),
          assetsDir: config.build?.assetsDir ?? "",
          rollupOptions: {
            input: glob.sync([path.join(options.directory, "**/*")], {
              ignore: ["**/node_modules/**"],
            }),
          },
        },
        server: {
          host: config.server?.host ?? "localhost",
          https: config.server?.https,
          port: config.server?.port ?? 1337,
          origin: config.server?.origin ?? "__placeholder__",
          hmr:
            config.server?.hmr === false
              ? false
              : {
                  host:
                    (typeof config.server?.host ?? "localhost") === "string"
                      ? config.server?.host
                      : undefined,
                  port: config.server?.port ?? 1137,
                  protocol: !config.server?.https ? "ws" : "wss",
                  ...(config.server?.hmr === true ? {} : config.server?.hmr),
                },
        },
      };
    },
  };
}
