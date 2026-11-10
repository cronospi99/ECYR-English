/* You Draw logo: a pencil on a red disc. */
export function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#ff4757" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="3" />
      <path d="M18 44l4-12 20-20 8 8-20 20z" fill="#ffd23f" stroke="#1d1840" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 44l4-12 8 8z" fill="#f5c49a" stroke="#1d1840" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M38 16l8 8" stroke="#1d1840" strokeWidth="2.5" />
      <path d="M12 52c8-3 14 3 22 0s12-3 18 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
