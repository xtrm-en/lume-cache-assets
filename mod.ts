import { merge } from "lume/core/utils/object.ts";
import Site from "lume/core/site.ts";
import { Page } from "lume/core/file.ts";
import { concurrent } from "lume/core/utils/concurrent.ts";
import { sha1 } from "https://deno.land/x/sha1@v1.0.3/mod.ts";
import process from "https://deno.land/std@0.162.0/node/process.ts";

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
   * The folder where the images will be cached.
   * @default "cache"
   */
  folder?: string;

  /**
   * Whether to log the output or not.
   * @default true
   */
  logOutput: boolean;
}

export const defaults: Options = {
  extensions: [".html"],
  shouldCache: (url: string) =>
    url.startsWith("https://") &&
    [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"].some((ext) =>
      url.endsWith(ext)
    ),
  folder: "cache",
  logOutput: true,
};

/** 
 * Plugin that allows you to cache remote content locally.
 * 
 * Most of this function is repurposed from https://github.com/lumeland/lume/blob/2e739f07806bfdf3a3c4c49ea28e8129ee3f61a9/plugins/modify_urls.ts
 */
export default function cacheContent(userOptions?: Options) {
  const options = merge(defaults, userOptions);
  const generated = new Set<string>();

  async function replace(
    site: Site,
    url: string | null,
  ): Promise<string> {
    if (!url) {
      return "";
    }
    if (!options.shouldCache!(url)) {
      return url;
    }
    const extension = url.split(".").pop()!;
    const hash = sha1(url, "utf8", "hex");
    const folder = options.folder!.replace(/\/$/, "");
    const path = `/${folder}/${hash}.${extension}`;
    if (!generated.has(path)) {
      generated.add(path);
      process.stdout.write(`Caching ${url} in ${path}\r`);
      const res = await fetch(url);
      const page = Page.create({
        url: path,
        content: new Uint8Array(await res.arrayBuffer()),
      });
      site.pages.push(page);
    }
    return path;
  }

  async function replaceSrcset(
    site: Site,
    attr: string | null,
  ): Promise<string> {
    const srcset = attr ? attr.trim().split(",") : [];
    const replaced: string[] = [];
    for (const src of srcset) {
      const [, url, rest] = src.trim().match(/^(\S+)(.*)/)!;
      replaced.push(await replace(site, url) + rest);
    }

    return replaced.join(", ");
  }

  return (site: Site) => {
    site.process(
      options.extensions,
      async (pages) => {
        await concurrent(pages, async (page: Page) => {
          const { document } = page;

          if (!document) {
            return;
          }

          for (const element of document.querySelectorAll("[href]")) {
            element.setAttribute(
              "href",
              await replace(site, element.getAttribute("href")),
            );
          }

          for (const element of document.querySelectorAll("[src]")) {
            element.setAttribute(
              "src",
              await replace(site, element.getAttribute("src")),
            );
          }

          for (const element of document.querySelectorAll("video[poster]")) {
            element.setAttribute(
              "poster",
              await replace(site, element.getAttribute("poster")),
            );
          }

          for (const element of document.querySelectorAll("[srcset]")) {
            element.setAttribute(
              "srcset",
              await replaceSrcset(
                site,
                element.getAttribute("srcset"),
              ),
            );
          }

          for (const element of document.querySelectorAll("[imagesrcset]")) {
            element.setAttribute(
              "imagesrcset",
              await replaceSrcset(
                site,
                element.getAttribute("imagesrcset"),
              ),
            );
          }
        });
        const { columns } = Deno.consoleSize();
        process.stdout.write(" ".repeat(columns) + "\r");
      },
    );
  };
}
