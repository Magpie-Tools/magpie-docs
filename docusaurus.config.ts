import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Magpie Docs',
  tagline: 'Documentation for Magpie, the self-hosted proxy manager',
  favicon: 'img/favicon.ico',
  headTags: [
    {tagName: 'link', attributes: {rel: 'icon', type: 'image/svg+xml', href: '/docs/img/favicon.svg'}},
    {tagName: 'link', attributes: {rel: 'apple-touch-icon', href: '/docs/img/apple-touch-icon.png'}},
  ],

  future: {
    v4: true,
  },

  url: 'https://magpie.tools',
  baseUrl: '/docs/',

  organizationName: 'Magpie-Tools',
  projectName: 'magpie-docs',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Magpie-Tools/magpie-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/magpie-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    mermaid: {
      // Docs diagrams use the palette in src/theme/Mermaid/diagramTheme.ts;
      // these built-in themes only apply to the stock renderer.
      theme: {light: 'neutral', dark: 'dark'},
      options: {
        fontFamily: 'system-ui, sans-serif',
        // Wider labels and tighter spacing keep long top-down flowcharts
        // readable without scrolling past one or two steps at a time.
        flowchart: {
          wrappingWidth: 260,
          nodeSpacing: 30,
          rankSpacing: 30,
        },
        // Narrower lanes and wrapped messages keep sequence diagrams close to
        // the column width, so they are not scaled down until the text is tiny.
        sequence: {
          diagramMarginX: 8,
          diagramMarginY: 8,
          actorMargin: 24,
          width: 120,
          height: 44,
          boxMargin: 8,
          messageMargin: 32,
          mirrorActors: false,
          wrap: true,
          messageFontSize: 14,
          noteFontSize: 14,
          actorFontSize: 14,
        },
      },
    },
    navbar: {
      title: 'Magpie Docs',
      logo: {
        alt: 'Magpie Docs Logo',
        src: 'img/magpie-logo.svg',
        srcDark: 'img/magpie-logo-dark.svg',
      },
      items: [
        {
          to: '/learn/',
          label: 'Learn Magpie',
          position: 'left',
        },
        {
          to: '/backend/',
          label: 'Backend internals',
          position: 'left',
        },
        {
          href: 'https://github.com/Magpie-Tools',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/',
            },
            {
              label: 'Learning path',
              to: '/learn/',
            },
            {
              label: 'Backend internals',
              to: '/backend/',
            },
            {
              label: 'Installation',
              to: '/getting-started/installation',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/7FWAGXzhkC',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Main Website',
              href: 'https://magpie.tools',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/Magpie-Tools',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Magpie Contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
