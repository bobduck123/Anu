'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import styles from './ScrollSnapLanding.module.css';

type TiltState = {
  rx: number;
  ry: number;
};

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

  const panelStyle: CSSProperties = {
    transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
  };

  const cloudParallaxStyle: CSSProperties = {
    transform: `translate3d(${(tilt.ry * 1.4).toFixed(2)}px, ${(tilt.rx * -0.9).toFixed(2)}px, 0)`,
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
                <img
                  src="https://demos.creative-tim.com/paper-kit-2/assets/img/fog-low.png"
                  alt=""
                  loading="lazy"
                />
              </div>
              <div className={`${styles.fogLow} ${styles.right}`} aria-hidden="true">
                <img
                  src="https://demos.creative-tim.com/paper-kit-2/assets/img/fog-low.png"
                  alt=""
                  loading="lazy"
                />
              </div>

              <div className={styles.heroWrapItem}>
                <div className={styles.heroCard}>
                  <p className={styles.kicker}>ANU System · Manara Gateway</p>
                  <h1 className={styles.boardName}>Enter ANU Through Manara</h1>
                  <p className={styles.lead}>
                    Launch ANU from one living control surface. Manara turns mythic lore into clear pathways for
                    governance, team coordination, and measurable delivery outcomes.
                  </p>

                  <div className={styles.signalRow} aria-label="Key outcomes">
                    <span>Shared direction</span>
                    <span>Clear workflows</span>
                    <span>Visible impact</span>
                  </div>

                  <div className={styles.actionRow}>
                    <Link href="/manara">Launch ANU in Manara</Link>
                    <Link href="/transparency">View Delivery Signals</Link>
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
