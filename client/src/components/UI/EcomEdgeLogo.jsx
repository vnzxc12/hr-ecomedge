import React from 'react';

export default function EcomEdgeLogo({ size = 36, showText = true, layout = 'horizontal', isDark = false }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: layout === 'horizontal' ? '0.75rem' : '0.4rem',
      flexDirection: layout === 'vertical' ? 'column' : 'row',
      textAlign: layout === 'vertical' ? 'center' : 'left'
    }}>
      {/* SVG Icon: Navy shopping bag with vibrant green arrow */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Green Growth Arrow pointing up */}
        <path
          d="M50 10 L68 32 H57 V50 H43 V32 H32 Z"
          fill="#009640"
        />
        {/* Navy Shopping Bag */}
        <path
          d="M26 44 L32 36 H68 L74 44 V88 C74 91.3 71.3 94 68 94 H32 C28.7 94 26 91.3 26 88 V44 Z"
          fill="#0A1931"
        />
        {/* Bag Handle Cutout */}
        <path
          d="M40 44 C40 38 44 34 50 34 C56 34 60 38 60 44"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Green Accent Line */}
        <rect x="36" y="82" width="28" height="3" rx="1.5" fill="#009640" />
      </svg>

      {showText && (
        <div style={{ lineHeight: 1.1 }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: '900',
            fontSize: size > 40 ? '1.5rem' : '1.25rem',
            letterSpacing: '0.04em',
            color: 'var(--brand-navy)'
          }}>
            ECOMEDGE
          </div>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: '800',
            fontSize: size > 40 ? '0.62rem' : '0.52rem',
            letterSpacing: '0.08em',
            color: '#009640',
            textTransform: 'uppercase',
            marginTop: '2px'
          }}>
            Research and Analysis Services
          </div>
        </div>
      )}
    </div>
  );
}
