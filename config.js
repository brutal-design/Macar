/**
 * Style Dictionary config
 * ------------------------------------------------------------
 * Джерело: tokens.json (W3C DTCG, $value / $type) — структура повторює
 * ієрархію Variables у Figma (slash-шляхи → вкладені групи).
 *
 * Генеруємо:
 *   1) css      → src/styles/tokens.css    :root { --color-brand-primary: ...; }
 *   2) tailwind → tailwind.preset.cjs       theme.extend.colors (місток у Tailwind)
 *
 * Місток (крок 4): токени групи `color` стають вкладеними кольорами Tailwind,
 * тому Figma-змінна color/brand/primary === Tailwind-клас `bg-brand-primary`.
 * ------------------------------------------------------------
 */
export default {
  source: ['tokens.json'],

  platforms: {
    // 1) CSS-змінні ------------------------------------------------------
    css: {
      transforms: ['attribute/cti', 'name/kebab', 'color/css'],
      buildPath: 'src/styles/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          // зберігає посилання: button.bg → var(--color-brand-primary), а не копію хексу
          options: { outputReferences: true },
        },
      ],
    },

    // 2) Tailwind preset -------------------------------------------------
    tailwind: {
      transforms: ['attribute/cti', 'name/kebab', 'color/css'],
      buildPath: './',
      files: [
        {
          destination: 'tailwind.preset.cjs',
          format: 'tailwind/preset',
        },
      ],
    },
  },

  hooks: {
    formats: {
      // Власний формат: бере SEMANTIC-кольори і будує вкладений об'єкт Tailwind.
      // semantic/action/primary/default → colors.action.primary.DEFAULT → клас bg-action-primary.
      // (Кінцевий сегмент `default` → ключ DEFAULT — це конвенція Tailwind для «основного» відтінку.)
      // Component-токени лишаємо лише в CSS; примітивні space/radius — теж CSS-змінні,
      // бо їхні імена (6/8/12) перезаписали б стандартну шкалу Tailwind.
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
