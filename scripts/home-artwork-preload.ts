import { resolve } from 'node:path';
import type { HtmlTagDescriptor, Plugin } from 'vite';

/** Keep the hint entry independent: merging it into main would wait for React again. */
export function homeArtworkPreload(root: string): Plugin {
  const entryPath = resolve(root, 'src/site/preload-home.ts');
  return {
    name: 'home-artwork-preload',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        if (context.filename !== resolve(root, 'index.html')) return;
        const tags: HtmlTagDescriptor[] = [];
        let src = '/src/site/preload-home.ts';
        if (context.bundle) {
          const entry = Object.values(context.bundle).find(chunk => chunk.type === 'chunk' && chunk.facadeModuleId === entryPath);
          if (!entry || entry.type !== 'chunk') throw new Error('Missing homepage artwork preload entry');
          src = `./${entry.fileName}`;
          // Expose its small, shared data dependencies to the HTML preload scanner.
          const imports = new Set<string>();
          const visit = (file: string) => {
            const chunk = context.bundle![file];
            if (chunk?.type !== 'chunk') return;
            for (const dependency of chunk.imports) {
              if (imports.has(dependency)) continue;
              imports.add(dependency);
              visit(dependency);
            }
          };
          visit(entry.fileName);
          for (const dependency of imports) {
            if (!html.includes(`href="./${dependency}"`)) tags.push({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href: `./${dependency}` }, injectTo: 'head' });
          }
        }
        tags.push({ tag: 'script', attrs: { type: 'module', async: true, crossorigin: '', fetchpriority: 'high', src }, injectTo: 'head' });
        return tags;
      },
    },
  };
}
