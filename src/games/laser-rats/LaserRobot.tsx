import type { RobotKind } from './rules';

/** Different outlines and cannon positions identify each piece even without color. */
export function LaserRobot({ kind }: { kind: RobotKind }) {
  return <svg className={`laser-robot-art kind-${kind}`} viewBox="0 0 100 100" aria-hidden="true">
    <g stroke="#263c50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'row' ? <>
        <rect x="18" y="72" width="64" height="15" rx="7.5" fill="#3f5163" />
        <path d="M29 80H71" stroke="#aebfc6" strokeDasharray="3 8" />
        <path d="M29 43H9V61H29M71 43H91V61H71" fill="#e8a844" />
        <path d="M8 46V58M92 46V58" stroke="#fff0b5" strokeWidth="5" />
        <rect x="20" y="32" width="60" height="43" rx="17" fill="#eebc59" />
        <path d="M36 32V24M64 32V24" /><circle cx="36" cy="21" r="4" fill="#f8e6a5" /><circle cx="64" cy="21" r="4" fill="#f8e6a5" />
        <rect x="30" y="41" width="40" height="20" rx="9" fill="#fff5d8" stroke="none" />
        <path d="M35 68H65M35 68L39 65M35 68L39 71M65 68L61 65M65 68L61 71" fill="none" strokeWidth="2" />
      </> : kind === 'column' ? <>
        <path d="M43 25V7H57V25M43 75V93H57V75" fill="#76c7df" />
        <path d="M46 7H54M46 93H54" stroke="#d7f8ff" strokeWidth="5" />
        <path d="M35 64L27 79H37M65 64L73 79H63" fill="#599dbb" />
        <rect x="34" y="24" width="32" height="53" rx="14" fill="#8cd5e8" />
        <path d="M39 29Q50 17 61 29" fill="#b5e9f3" />
        <rect x="39" y="36" width="22" height="23" rx="9" fill="#e7fbff" stroke="none" />
        <path d="M50 62V72M50 62L47 65M50 62L53 65M50 72L47 69M50 72L53 69" fill="none" strokeWidth="2" />
      </> : <>
        <path d="M37 34L24 15L15 24L34 37M63 34L76 15L85 24L66 37M34 63L15 76L24 85L37 66M66 63L85 76L76 85L63 66" fill="#aa87d8" />
        <path d="M17 22L22 17M78 17L83 22M17 78L22 83M78 83L83 78" stroke="#f4e3ff" strokeWidth="5" />
        <path d="M50 19L79 50L50 81L21 50Z" fill="#c4a5e5" />
        <path d="M50 26L69 47" fill="none" stroke="#e8d6fa" strokeWidth="4" />
        <rect x="35" y="39" width="30" height="21" rx="10" fill="#f5eaff" stroke="none" />
        <path d="M45 65L55 73M55 65L45 73" strokeWidth="2" />
      </>}
      <g stroke="none" fill="#263c50">
        <ellipse cx={kind === 'column' ? 45 : 42} cy="47" rx="2.6" ry="4" />
        <ellipse cx={kind === 'column' ? 55 : 58} cy="47" rx="2.6" ry="4" />
      </g>
      <path d="M46 54Q50 58 54 54" fill="none" strokeWidth="2" />
    </g>
  </svg>;
}
