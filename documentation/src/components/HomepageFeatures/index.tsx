import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
  link?: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: '🚀 Quick Start',
    Svg: require('@site/static/img/rocket.svg').default,
    description: (
      <>
        Get up and running in minutes with our comprehensive setup guides. 
        From development environment to production deployment.
      </>
    ),
    link: '/docs/quick-start',
  },
  {
    title: '🏗️ Architecture',
    Svg: require('@site/static/img/architecture.svg').default,
    description: (
      <>
        Understand the system design, technology stack, and architectural decisions 
        that make our platform scalable and maintainable.
      </>
    ),
    link: '/docs/architecture/overview',
  },
  {
    title: '🔌 API Reference',
    Svg: require('@site/static/img/api.svg').default,
    description: (
      <>
        Complete API documentation with examples, authentication guides, 
        and integration tutorials for developers.
      </>
    ),
    link: '/docs/api/overview',
  },
  {
    title: '👥 User Guides',
    Svg: require('@site/static/img/users.svg').default,
    description: (
      <>
        Step-by-step guides for end users including admin dashboards, 
        agent portals, and tenant management.
      </>
    ),
    link: '/docs/guides/admin-dashboard',
  },
  {
    title: '🛠️ Development',
    Svg: require('@site/static/img/development.svg').default,
    description: (
      <>
        Developer setup, coding standards, testing strategies, 
        and deployment workflows for contributors.
      </>
    ),
    link: '/docs/development/setup',
  },
  {
    title: '📱 Mobile Development',
    Svg: require('@site/static/img/mobile.svg').default,
    description: (
      <>
        Flutter mobile app development, cross-platform strategies, 
        and mobile-specific features and APIs.
      </>
    ),
    link: '/docs/mobile/overview',
  },
];

function Feature({title, Svg, description, link}: FeatureItem) {
  const content = (
    <div className="text--center padding-horiz--md">
      <Svg className={styles.featureSvg} role="img" />
      <Heading as="h3">{title}</Heading>
      <p>{description}</p>
    </div>
  );

  if (link) {
    return (
      <div className={clsx('col col--4')}>
        <Link to={link} className={styles.featureLink}>
          {content}
        </Link>
      </div>
    );
  }

  return (
    <div className={clsx('col col--4')}>
      {content}
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--10 col--offset--1">
            <div className="text--center margin-bottom--xl">
              <Heading as="h2">
                Everything You Need to Succeed
              </Heading>
              <p>
                Our comprehensive documentation covers every aspect of the Real Estate Platform, 
                from getting started to advanced development and deployment.
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
        <div className="row margin-top--xl">
          <div className="col col--8 col--offset--2">
            <div className="text--center">
              <h3>Ready to dive deeper?</h3>
              <p>
                Explore our detailed guides and tutorials to master every aspect of the platform.
              </p>
              <div className="margin-top--md">
                <Link
                  className="button button--outline button--primary"
                  to="/docs/intro">
                  Browse All Documentation →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
