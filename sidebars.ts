import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Learn Magpie',
      link: {type: 'doc', id: 'learn/index'},
      items: [
        'learn/how-magpie-works',
        'learn/first-proxy',
        'learn/automate-a-pool',
        'learn/observe-and-troubleshoot',
        'learn/glossary',
      ],
    },
    {
      type: 'category',
      label: 'Getting started',
      items: [
        'getting-started/quick-start',
        'getting-started/installation',
        'getting-started/first-login',
        'getting-started/local-development',
        'getting-started/updating',
      ],
    },
    {
      type: 'category',
      label: 'User guide',
      items: [
        'user-guide/navigation',
        'user-guide/dashboard',
        'user-guide/workspaces',
        'user-guide/alerts',
        'user-guide/proxies',
        'user-guide/rotating-proxies',
        'user-guide/scraping-sources',
        'user-guide/checker-and-judges',
        'user-guide/account',
        'user-guide/admin',
      ],
    },
    {
      type: 'category',
      label: 'Backend internals',
      link: {type: 'doc', id: 'backend/index'},
      items: [
        'backend/startup-and-lifecycle',
        'backend/api-and-workspaces',
        'backend/import-and-scraping',
        'backend/queue-and-leases',
        'backend/checker',
        'backend/results-and-storage',
        'backend/rotation',
        'backend/background-jobs',
        'backend/code-map',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/architecture',
        'reference/configuration',
        'reference/environment-variables',
        'reference/runtime-jobs',
        'reference/data-storage',
      ],
    },
    {
      type: 'category',
      label: 'API',
      items: [
        'api/authentication',
        'api/rest-overview',
        'api/rest-auth-and-user',
        'api/rest-workspaces',
        'api/rest-alerts',
        'api/rest-notifications',
        'api/rest-proxies',
        'api/rest-rotating-proxies',
        'api/rest-scraping-sources',
        'api/rest-admin-and-system',
        'api/graphql',
        'api/errors',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        'operations/deployment',
        'operations/performance-validation',
        'operations/security',
        'operations/troubleshooting',
        'operations/backup-and-recovery',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/contributing',
        'contributing/testing',
        'contributing/docs',
      ],
    },
    'faq',
  ],
};

export default sidebars;
