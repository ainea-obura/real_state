import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * HoyHub Documentation Sidebar Configuration
 * Clean, organized navigation for developers
 */
const sidebars: SidebarsConfig = {
  // Main documentation sidebar
  tutorial: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'intro',
        'quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/setup',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/admin-dashboard',
      ],
    },
  ],
};

export default sidebars;
