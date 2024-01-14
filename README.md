# lume-cache-assets

[Lume](https://lume.land) plugin that allows caching remote assets locally.

## Installation

Import this plugin in your `_config.ts` file to use it:

```ts
import lume from "https://deno.land/x/lume/mod.ts";
import cacheAssets from "https://deno.land/x/lume_cache_assets@0.0.7/mod.ts";

const site = lume();

site.use(cacheAssets(/* Options */));

export default site;
```

## Options

```ts
interface Options {
  /**
   * The extensions of the files to process.
   * @default [".html"]
   */
  extensions?: string[];

  /**
   * A function that returns true if the URL should be cached.
   * @default (url: string) => url.startsWith("https://") && [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"].some((ext) => url.endsWith(ext)),
   */
  shouldCache?: (url: string) => boolean;

  /**
   * Transforms the URL into a hashed version for local storage use.
   * @param url The URL to transform.
   * @returns A file-system-compatible string.
   * @default (url: string) => sha1(url)
   */
  transform?: (url: string) => string;

  /**
   * The folder where the images will be cached.
   * @default "cache"
   */
  folder?: string;

  /**
   * Whether to log the output or not.
   * @default true
   */
  logOutput?: boolean;
}
```

## Full example

```ts

import lume from "https://deno.land/x/lume/mod.ts";
import cacheAssets from "https://deno.land/x/lume_cache_assets@0.0.7/mod.ts";

import md5 from 'npm:md5';

const site = lume();

site.use(cacheAssets({
  extensions: [".html"],
  shouldCache: (url: string) => url.startsWith("https://") && url.endsWith(".png"),
  transform: md5,
  folder: "assets/cache",
  logOutput: true,
}));

export default site;
```

## License

This project is licensed under the [MIT License](./LICENSE).
