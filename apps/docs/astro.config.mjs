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
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/zugriffcloud/os',
        },
      ],
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
          items: [
            {
              label: 'Getting Started',
              link: 'guides/getting-started',
            },
            {
              label: 'Creating a Deployment Token',
              link: 'guides/creating-a-deployment-token',
            },
            {
              label: 'Examples',
              link: 'guides/examples',
            },
            {
              label: 'Frameworks',
              link: 'guides/frameworks',
            },
            {
              label: 'Static Web Apps',
              link: 'guides/static-web-applications',
            },
            {
              label: 'Command Line Interface',
              link: 'guides/command-line-interface',
            },
          ],
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
