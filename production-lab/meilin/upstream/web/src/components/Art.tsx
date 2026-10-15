import { useId } from 'react';
import { Asset } from '../api';

// Placeholder for an asset that has no real image yet: palette field + monogram + line drawing.
// It is deliberately abstract so nobody mistakes it for a generated result.
export function AssetArt({ asset }: { asset: Asset }) {
  const id = useId().replace(/:/g, '');
  const pal = asset.palette?.length >= 3 ? asset.palette : ['#c9d2ff', '#9fe3ff', '#ffc9b0', '#7a6bff'];
  const [a, b, c] = pal;
  const words = asset.name.replace(/[·・]/g, ' ').split(/\s+/).filter(Boolean);
  const mono = /[A-Za-z]/.test(asset.name) ? words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() : asset.name.slice(0, 1);
  const name = `${asset.name}${asset.zh || ''}`;
  const line = 'rgba(12,16,36,.28)';
  return (
    <svg viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" className="art" role="img" aria-label={`${asset.name}（示意）`}>
      <defs>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6f8fc" />
          <stop offset="1" stopColor={b} stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`gl${id}`} cx="0.3" cy="0.25" r="0.75">
          <stop offset="0" stopColor={c} stopOpacity="0.5" />
          <stop offset="0.6" stopColor={a} stopOpacity="0.12" />
          <stop offset="1" stopColor={a} stopOpacity="0" />
        </radialGradient>
        <filter id={`gr${id}`}><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="7" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0.1  0 0 0 0.05 0" /></filter>
      </defs>
      <rect width="120" height="150" fill={`url(#bg${id})`} />
      <rect width="120" height="150" fill={`url(#gl${id})`} />
      <g fill="none" stroke={line} strokeWidth="0.7">
        {asset.kind === 'character' && (
          <>
            <ellipse cx="60" cy="52" rx="15" ry="18" />
            <path d="M24 150 C26 110 40 92 60 90 C80 92 94 110 96 150" />
            <path d="M48 88 C50 80 52 72 52 68 M72 88 C70 80 68 72 68 68" />
          </>
        )}
        {asset.kind === 'scene' && (
          <>
            <path d="M0 104 H120" />
            <path d="M0 150 L52 104 M120 150 L68 104" />
            {[16, 40, 64, 88].map((x) => <path key={x} d={`M${x} 104 V58 a8 8 0 0 1 16 0 V104`} />)}
            <circle cx="60" cy="30" r="9" />
          </>
        )}
        {asset.kind === 'prop' && (
          /戒|ring/i.test(name) ? <><circle cx="60" cy="80" r="22" /><path d="M50 56 L60 44 L70 56 L60 62 Z" /></>
            : /手机|phone/i.test(name) ? <><rect x="44" y="46" width="32" height="62" rx="6" /><path d="M50 88 L57 78 L63 84 L70 70" /></>
              : /照|photo/i.test(name) ? <><rect x="36" y="54" width="48" height="40" rx="2" transform="rotate(-6 60 74)" /><circle cx="54" cy="70" r="5" /></>
                : <><rect x="38" y="48" width="44" height="56" rx="3" /><path d="M44 58 H76 M44 66 H70 M44 74 H74" /></>
        )}
      </g>
      <text x="60" y={asset.kind === 'character' ? 60 : asset.kind === 'scene' ? 92 : 128} textAnchor="middle" fontFamily="'Instrument Serif', serif" fontStyle="italic" fontSize={asset.kind === 'character' ? 22 : 18} fill="rgba(12,16,36,.82)">{mono}</text>
      <g transform="translate(10 138)">
        {pal.slice(0, 4).map((p, i) => <circle key={i} cx={i * 7} cy="0" r="2.4" fill={p} />)}
      </g>
      <rect width="120" height="150" filter={`url(#gr${id})`} />
    </svg>
  );
}
