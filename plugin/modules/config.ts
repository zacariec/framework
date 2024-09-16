import path from "node:path";
import glob from "fast-glob";

import type { PluginOption, UserConfig } from "vite";
import type { FrameworkOptions } from "../types";

export function config(options: FrameworkOptions): PluginOption {
  return {
    name: "framework",
    config(config: UserConfig): UserConfig {
      return {
        publicDir: false,
        build: {
          outDir: config.build?.outDir ?? path.join(process.cwd(), "assets"),
          assetsDir: config.build?.assetsDir ?? "",
          rollupOptions: {
            input: glob.sync([
              path.join(
                process.cwd(),
                options.modulesDirectory ?? "src",
                "**/*",
              ),
            ]),
          },
        },
      };
    },
  };
}
