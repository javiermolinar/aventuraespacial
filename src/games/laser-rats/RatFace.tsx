/** The same little rat stays in the counter after a hit: crossed eyes and a
 * wonky tongue make its cleared state legible without relying on color. */
export function RatFace({ cleared = false }: { cleared?: boolean }) {
  return <svg className={`laser-rat-face ${cleared ? 'is-caught' : ''}`} viewBox="0 0 64 60" aria-hidden="true">
    <g stroke="#334555" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="16" r="11" fill="#aebcc7" />
      <circle cx="51" cy="16" r="11" fill="#aebcc7" />
      <circle cx="13" cy="16" r="6" fill="#edb9b7" stroke="none" />
      <circle cx="51" cy="16" r="6" fill="#edb9b7" stroke="none" />
      <path d="M32 10C18 10 11 22 14 36C16 46 25 54 32 55C39 54 48 46 50 36C53 22 46 10 32 10Z" fill="#c3cdd4" />
      <path d="M25 12L29 6L33 11L37 7" fill="#c3cdd4" />
      <path d="M19 35Q32 28 45 35Q45 48 32 52Q19 48 19 35" fill="#e7e7d9" stroke="none" />
      {cleared ? <g fill="none"><path d="M19 23L27 31M27 23L19 31M37 23L45 31M45 23L37 31" /><path d="M27 44Q33 47 39 42" /><path d="M32 46V50Q36 55 39 49V44" fill="#e9a5af" /></g> : <>
        <ellipse cx="23" cy="27" rx="4" ry="5.5" fill="#263c50" stroke="none" />
        <ellipse cx="41" cy="27" rx="4" ry="5.5" fill="#263c50" stroke="none" />
        <circle cx="24" cy="25" r="1.5" fill="#fffdf0" stroke="none" /><circle cx="42" cy="25" r="1.5" fill="#fffdf0" stroke="none" />
        <path d="M26 43Q32 49 38 43" fill="none" /><path d="M29 45V49H35V45" fill="#fffaf0" strokeWidth="1.5" />
      </>}
      <path d="M27 36Q32 33 37 36L32 41Z" fill="#e9a5af" strokeWidth="1.5" />
      <path d="M18 38L4 34M18 42L3 44M46 38L60 34M46 42L61 44" strokeWidth="1.8" />
    </g>
  </svg>;
}
