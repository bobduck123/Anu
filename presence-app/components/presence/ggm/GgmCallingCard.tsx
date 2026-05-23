"use client";

// Contact block — composed as a single calling-card object centered in
// its own scene, not a generic footer-style contact section. The card
// carries an embossed border, a wax-style seal, the artist identity,
// the canonical contact lines, and (when enabled) the Presence enquiry
// CTA integrated as a paper pill button at the foot of the card.

import type { ReactNode } from "react";
import type { GgmArtist } from "@/lib/presence/ggm/source";
import styles from "./ggm.module.css";

interface GgmCallingCardProps {
  artist: GgmArtist;
  // Optional Presence-native enquiry trigger. Rendered inside the
  // card actions, paper-styled, not as a separate "Get in touch" block.
  enquiryAction?: ReactNode;
  // Optional external portfolio link (e.g. ckgoddard.com.au).
  externalLink?: { label: string; href: string } | null;
  contactTitle?: string;
  contactCopy?: string;
  availability?: string | null;
  showDirectEmail?: boolean;
  practiceLine?: string;
}

export function GgmCallingCard({
  artist,
  enquiryAction,
  externalLink,
  contactTitle,
  contactCopy,
  availability,
  showDirectEmail = true,
  practiceLine = "Memory · colour · lived landscape",
}: GgmCallingCardProps) {
  return (
    <div className={styles.callingShell}>
      <p className={`${styles.blockEyebrow} ${styles.blockRevealChild}`} style={{ ["--i" as never]: 0 }}>
        <span className={styles.blockEyebrowNumber}>04</span>
        Calling Card
      </p>

      <article
        className={`${styles.callingCard} ${styles.blockRevealChild}`}
        style={{ ["--i" as never]: 1 }}
      >
        <span className={styles.callingCardCornerTL} aria-hidden />
        <span className={styles.callingCardCornerTR} aria-hidden />
        <span className={styles.callingCardCornerBL} aria-hidden />
        <span className={styles.callingCardCornerBR} aria-hidden />

        <div className={styles.callingCardSeal} aria-hidden>
          GGM
          <br />
          ✱ 2026
        </div>

        <p className={styles.callingCardEyebrow}>{contactTitle || "An invitation"}</p>
        <h2 className={styles.callingCardName}>{artist.name}</h2>
        <p className={styles.callingCardRole}>{artist.subtitle}</p>

        <div className={styles.callingCardLines}>
          <div className={styles.callingCardLine}>
            <small>Studio</small>
            <span>{artist.location}</span>
          </div>
          <div className={styles.callingCardLine}>
            <small>Practice</small>
            <span>Memory · colour · lived landscape</span>
          </div>
          {showDirectEmail && artist.contactEmail && (
            <div className={styles.callingCardLine}>
              <small>Direct</small>
              <a href={`mailto:${artist.contactEmail}`}>{artist.contactEmail}</a>
            </div>
          )}
          {externalLink && (
            <div className={styles.callingCardLine}>
              <small>External</small>
              <a href={externalLink.href} target="_blank" rel="noopener noreferrer">
                {externalLink.label}
              </a>
            </div>
          )}
        </div>

        {enquiryAction && (
          <div className={styles.callingCardActions}>
            {enquiryAction}
            {showDirectEmail && artist.contactEmail && <a href={`mailto:${artist.contactEmail}`}>Write directly</a>}
          </div>
        )}
      </article>

      <p
        className={`${styles.callingFootnote} ${styles.blockRevealChild}`}
        style={{ ["--i" as never]: 2 }}
      >
        {availability || contactCopy || "Interested in exhibitions, projects, or commissions"}
      </p>
    </div>
  );
}
