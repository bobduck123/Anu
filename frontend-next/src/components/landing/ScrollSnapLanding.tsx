'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type CSSProperties } from 'react';
import styles from './ScrollSnapLanding.module.css';

type TiltState = {
  rx: number;
  ry: number;
};

type LandingSlide = {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  chips: string[];
  links: Array<{ href: string; label: string }>;
};

const LANDING_SLIDES: LandingSlide[] = [
  {
    id: 'anu-gateway',
    kicker: 'ANU System · Manara Gateway',
    title: 'Enter ANU Through Manara',
    summary:
      'Launch ANU from one living control surface. Manara turns mythic lore into clear pathways for governance, team coordination, and measurable delivery outcomes.',
    chips: ['Shared direction', 'Clear workflows', 'Visible impact'],
    links: [
      { href: '/manara', label: 'Launch ANU in Manara' },
      { href: '/transparency', label: 'View Delivery Signals' },
    ],
  },
  {
    id: 'signal-intelligence',
    kicker: 'Signal Intelligence',
    title: 'Read What Is Working, In Real Time',
    summary:
      'Surface what is moving across teams, communities, and missions. Each signal stays legible so people can align quickly without losing cultural context.',
    chips: ['Operational clarity', 'Cross-team sync', 'Trusted updates'],
    links: [
      { href: '/community', label: 'Open Community Mesh' },
      { href: '/discover', label: 'Explore Signals' },
    ],
  },
  {
    id: 'governance-flow',
    kicker: 'Civic Coordination',
    title: 'Governance Without Fragmentation',
    summary:
      'Move between governance, education, and delivery flows inside one shared interface. Every route preserves context so decisions can become action faster.',
    chips: ['One control surface', 'Reduced friction', 'Connected decisions'],
    links: [
      { href: '/governance', label: 'Open Governance' },
      { href: '/education/maps', label: 'Open Learning Maps' },
    ],
  },
  {
    id: 'impact-delivery',
    kicker: 'Delivery Outcomes',
    title: 'Turn Story Into Measurable Impact',
    summary:
      'Use impact pools, trust signals, and transparent milestones to make delivery visible from first commitment to final outcome.',
    chips: ['Auditable flows', 'Milestone tracking', 'Outcome reporting'],
    links: [
      { href: '/impact', label: 'Open Impact Layer' },
      { href: '/memberships', label: 'Activate Steward Path' },
    ],
  },
];

function tiltFromPointer(event: React.MouseEvent<HTMLDivElement>): TiltState {
  const rect = event.currentTarget.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;

  return {
    rx: (0.5 - py) * 8,
    ry: (px - 0.5) * 10,
  };
}

export function ScrollSnapLanding() {
  const [tilt, setTilt] = useState<TiltState>({ rx: 0, ry: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  const panelStyle: CSSProperties = {
    transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
  };

  const cloudParallaxStyle: CSSProperties = {
    transform: `translate3d(${(tilt.ry * 1.4).toFixed(2)}px, ${(tilt.rx * -0.9).toFixed(2)}px, 0)`,
  };

  const snapToSlide = (index: number) => {
    const viewport = viewportRef.current;
    const section = sectionRefs.current[index];

    if (!viewport || !section) return;

    viewport.scrollTo({
      top: section.offsetTop,
      behavior: 'smooth',
    });
  };

  const handleViewportScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const focusY = viewport.scrollTop + viewport.clientHeight / 2;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    sectionRefs.current.forEach((section, index) => {
      if (!section) return;
      const sectionCenter = section.offsetTop + section.clientHeight / 2;
      const distance = Math.abs(sectionCenter - focusY);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex !== activeIndex) {
      setActiveIndex(nearestIndex);
    }
  };

  return (
    <div className={styles.landingRoot}>
      <section className={styles.section} aria-label="ANU Manara gateway landing">
        <div className={styles.sectionContent}>
          <div className={styles.impulseWrap}>
            <div className={styles.sectionLabel}>ANU landing field</div>

            <div
              className={styles.mmParallax}
              style={panelStyle}
              onMouseMove={(event) => {
                setTilt(tiltFromPointer(event));
              }}
              onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
            >
              <div
                className={styles.panelBg}
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1499018658500-b21c72d7172b?auto=format&fit=crop&w=1800&q=80')",
                }}
              />

              <div className={styles.movingCloudsWrap} style={cloudParallaxStyle} aria-hidden="true">
                <div
                  className={styles.movingClouds}
                  style={{
                    backgroundImage:
                      "url('https://demos.creative-tim.com/paper-kit-2/assets/img/clouds.png')",
                  }}
                />
              </div>

              <div className={styles.panelOverlay} />

              <div className={styles.fogLow} aria-hidden="true">
                <Image
                  src="https://demos.creative-tim.com/paper-kit-2/assets/img/fog-low.png"
                  alt=""
                  width={640}
                  height={180}
                  unoptimized
                  loading="lazy"
                />
              </div>
              <div className={`${styles.fogLow} ${styles.right}`} aria-hidden="true">
                <Image
                  src="https://demos.creative-tim.com/paper-kit-2/assets/img/fog-low.png"
                  alt=""
                  width={640}
                  height={180}
                  unoptimized
                  loading="lazy"
                />
              </div>

              <div className={styles.heroWrapItem}>
                <div className={styles.snapShell}>
                  <div className={styles.snapHint}>Scroll inside this tile</div>

                  <nav className={styles.snapIndicator} aria-label="Landing narrative sections">
                    {LANDING_SLIDES.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => snapToSlide(index)}
                        aria-label={`Go to ${slide.kicker}`}
                        className={index === activeIndex ? styles.activeDot : ''}
                      />
                    ))}
                  </nav>

                  <div
                    ref={viewportRef}
                    className={styles.snapViewport}
                    onScroll={handleViewportScroll}
                  >
                    {LANDING_SLIDES.map((slide, index) => (
                      <section
                        key={slide.id}
                        id={slide.id}
                        ref={(node) => {
                          sectionRefs.current[index] = node;
                        }}
                        className={styles.snapSection}
                      >
                        <article className={styles.heroCard}>
                          <p className={styles.kicker}>{slide.kicker}</p>
                          <h2 className={styles.boardName}>{slide.title}</h2>
                          <p className={styles.lead}>{slide.summary}</p>

                          <div className={styles.signalRow} aria-label="Key outcomes">
                            {slide.chips.map((chip) => (
                              <span key={`${slide.id}-${chip}`}>{chip}</span>
                            ))}
                          </div>

                          <div className={styles.actionRow}>
                            {slide.links.map((link) => (
                              <Link key={`${slide.id}-${link.href}`} href={link.href}>
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </article>
                      </section>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.heroCorner} />
              <div className={styles.heroCorner2} />
              <div className={styles.heroCorner3} />
              <div className={styles.heroCorner4} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
