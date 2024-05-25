import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import adapter from '@zugriff/adapter-astro';

// https://astro.build/config
export default defineConfig({
  redirects: {
    '/': '/introduction/about',
    '/ecosystem': '/ecosystem/integrations',
  },
  integrations: [
    starlight({
      favicon: '/favicon.png',
      title: 'zugriff',
      social: {
        github: 'https://github.com/zugriffcloud/os',
      },
      logo: {
        dark: '/public/docs-logo-light.svg',
        light: '/public/docs-logo-dark.svg',
        alt: 'Logo',
        replacesTitle: true,
      },
      sidebar: [
        {
          label: 'Introduction',
          autogenerate: { directory: 'introduction' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'Concepts',
          autogenerate: { directory: 'concepts' },
        },
        {
          label: 'Ecosystem',
          items: [
            {
              label: 'Integrations',
              link: 'ecosystem/integrations',
            },
            {
              label: 'Addons',
              autogenerate: { directory: 'ecosystem/Addons' },
            },
          ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
          collapsed: true,
        },
      ],

      components: {
        Footer: '/src/components/Footer.astro',
      },
    }),
  ],
  output: 'server',
  adapter: adapter(),
});
