'use client';

/**
 * Injects bento animation keyframes and responsive overrides.
 * Render once in any layout that uses bento components.
 */
export function BentoStyles() {
  return (
    <style>{`
      @keyframes bentoFloatIn {
        from {
          opacity: 0;
          transform: translateY(16px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .bento-cell {
          animation: none !important;
        }
      }

      /* Responsive bento grid overrides */
      @media (max-width: 1050px) {
        .bento-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
        }
        .bento-cell {
          grid-column: span 3 !important;
        }
      }

      @media (max-width: 720px) {
        .bento-grid {
          grid-template-columns: 1fr !important;
          grid-auto-rows: auto !important;
        }
        .bento-cell {
          grid-column: span 1 !important;
          grid-row: span 1 !important;
        }
      }
    `}</style>
  );
}
