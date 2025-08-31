import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started - 5min ⏱️
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - ${siteConfig.tagline}`}
      description="Comprehensive documentation for the Real Estate Platform - a modern, scalable solution for property management, leasing, and financial operations.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <div className="container margin-vert--xl">
          <div className="row">
            <div className="col col--8 col--offset--2">
              <div className="text--center">
                <h2>Ready to get started?</h2>
                <p>
                  Choose your path and start exploring the Real Estate Platform documentation.
                </p>
                <div className="margin-top--lg">
                  <Link
                    className="button button--primary button--lg margin-right--md"
                    to="/docs/quick-start">
                    🚀 Quick Start Guide
                  </Link>
                  <Link
                    className="button button--secondary button--lg"
                    to="/docs/architecture/overview">
                    🏗️ Architecture Overview
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
