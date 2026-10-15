// Agent caption: each character resolves from blur, staggered, so the reply feels spoken.
export default function Caption({ text }: { text: string }) {
  const chars = Array.from(text || '');
  const step = chars.length > 80 ? 9 : 16;
  return (
    <p className="caption" aria-label={text}>
      {chars.map((c, i) => (
        <span key={i} aria-hidden="true" style={{ animationDelay: `${i * step}ms` }}>{c}</span>
      ))}
    </p>
  );
}
