/**
 * Style Dictionary config — created by the tokens-sync skill if none exists.
 * Source: tokens.json (W3C DTCG). Outputs:
 *   1) css      → src/styles/tokens.css   (:root custom properties)
 *   2) tailwind → tailwind.preset.cjs      (semantic colors → Tailwind theme)
 *
 * The css transform list intentionally OMITS `size/rem` so dimensions stay in px
 * (1:1 with Figma) and ADDS `typography/css/shorthand` so DTCG typography tokens
 * become a usable CSS `font` shorthand (e.g. `600 13px/20px Inter`).
 */
export default {
  source: ['tokens.json'],

  platforms: {
    css: {
      transforms: ['attribute/cti', 'name/kebab', 'color/css', 'typography/css/shorthand'],
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: { outputReferences: true },
        },
      ],
    },

    tailwind: {
      transforms: ['attribute/cti', 'name/kebab', 'color/css'],
      buildPath: './',
      files: [{ destination: 'tailwind.preset.cjs', format: 'tailwind/preset' }],
    },
  },

  hooks: {
    formats: {
      // semantic/<...>/default → colors.<...>.DEFAULT → clean Tailwind classes (bg-action-primary)
      'tailwind/preset': ({ dictionary }) => {
        const setDeep = (obj, path, val) => {
          let o = obj;
          path.forEach((k, i) => {
            if (i === path.length - 1) o[k] = val;
            else o = o[k] = o[k] || {};
          });
        };
        const colors = {};
        for (const token of dictionary.allTokens) {
          const value = token.value ?? token.$value;
          const type = token.$type ?? token.type;
          if (type === 'color' && token.path[0] === 'semantic') {
            let p = token.path.slice(1);
            if (p[p.length - 1] === 'default') p = [...p.slice(0, -1), 'DEFAULT'];
            setDeep(colors, p, value);
          }
        }
        const j = (o) => JSON.stringify(o, null, 2).split('\n').join('\n      ');
        return `/** Auto-generated from tokens.json by Style Dictionary. Do not edit by hand. */
module.exports = {
  theme: {
    extend: {
      colors: ${j(colors)},
    },
  },
};
`;
      },
    },
  },
};
