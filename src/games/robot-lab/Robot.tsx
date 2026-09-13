import { motion } from 'motion/react';
import type { PartId } from '../../game';
import type { RobotDesign } from './design';
import './robot.css';

export const partPositions: Record<PartId, [number, number]> = {
  head: [200, 132], body: [200, 246], leftArm: [105, 242], rightArm: [295, 242], leftLeg: [165, 345], rightLeg: [235, 345],
};

// Shared geometry keeps silhouettes, targets, and earned parts visually consistent.
function HeadGeometry({ design }: { design: RobotDesign }) {
  switch (design) {
    case 'sprout': return <rect x="137" y="80" width="126" height="103" rx="32" />;
    case 'spark': return <path d="M159 80H241L263 104V160L241 183H159L137 160V104Z" />;
    case 'bolt': return <path d="M137 80H240L263 105V183H160L137 158Z" />;
    case 'space': return <ellipse cx="200" cy="132" rx="66" ry="51" />;
    case 'bubble': return <circle cx="200" cy="131" r="54" />;
    case 'gear': return <path d="M155 80H245V94H263V169H245V183H155V169H137V94H155Z" />;
    case 'pixel': return <rect x="137" y="80" width="126" height="103" rx="5" />;
  }
}

function BodyGeometry({ design }: { design: RobotDesign }) {
  switch (design) {
    case 'sprout': return <path d="M157 198H243L254 278Q254 303 231 303H169Q146 303 146 278Z" />;
    case 'spark': return <path d="M157 198H243L260 216V286L243 303H157L140 286V216Z" />;
    case 'bolt': return <path d="M140 198H260L239 303H161Z" />;
    case 'space': return <path d="M166 198H234Q252 198 252 221L263 303H137L148 221Q148 198 166 198Z" />;
    case 'bubble': return <ellipse cx="200" cy="252" rx="60" ry="53" />;
    case 'gear': return <path d="M150 198H250V216H262V283H250V303H150V283H138V216H150Z" />;
    case 'pixel': return <rect x="140" y="198" width="120" height="105" rx="5" />;
  }
}

function Antenna({ design }: { design: RobotDesign }) {
  switch (design) {
    case 'sprout': return <><path d="M200 80V53" fill="none" /><path d="M200 61Q175 65 176 42Q199 42 200 61ZM200 57Q224 59 224 35Q201 35 200 57Z" /></>;
    case 'spark': return <><path d="M183 80V50M217 80V50" fill="none" /><circle cx="183" cy="43" r="8" /><circle cx="217" cy="43" r="8" /></>;
    case 'bolt': return <path d="M205 28L183 54H198L191 80L218 47H203Z" />;
    case 'space': return <><path d="M200 80V56" fill="none" /><ellipse cx="200" cy="46" rx="23" ry="10" transform="rotate(-20 200 46)" /></>;
    case 'bubble': return <><circle cx="200" cy="71" r="7" /><circle cx="202" cy="52" r="11" /><circle cx="216" cy="31" r="6" /></>;
    case 'gear': return <><path d="M200 80V60" fill="none" /><path d="M193 28H207V36H215V50H207V58H193V50H185V36H193Z" /></>;
    case 'pixel': return <><path d="M183 80V55H217V80" fill="none" /><rect x="177" y="33" width="14" height="14" rx="1" /><rect x="209" y="33" width="14" height="14" rx="1" /></>;
  }
}

function ChestMark({ design }: { design: RobotDesign }) {
  switch (design) {
    case 'sprout': return <path d="M188 253Q178 232 211 231Q218 255 188 253ZM188 253L207 236" />;
    case 'space': return <path d="M200 228L205 239L217 240L208 248L210 260L200 254L190 260L192 248L183 240L195 239Z" />;
    case 'bubble': return <><circle cx="194" cy="245" r="8" /><circle cx="210" cy="234" r="4" /></>;
    case 'gear': return <><path d="M191 233H209V239H215V251H209V257H191V251H185V239H191Z" /><circle cx="200" cy="245" r="4" fill="#f6c868" /></>;
    case 'pixel': return <><rect x="188" y="233" width="9" height="9" /><rect x="203" y="233" width="9" height="9" /><rect x="188" y="248" width="9" height="9" /><rect x="203" y="248" width="9" height="9" /></>;
    default: return <path d="M203 228L190 246H201L197 260L212 240H201Z" />;
  }
}

function PartShape({ id, color, design }: { id: PartId; color: string; design: RobotDesign }) {
  const ink = '#34384b';
  switch (id) {
    case 'head': return <>
      <g fill={design === 'sprout' ? color : '#f6c868'} stroke={ink} strokeWidth="3" strokeLinejoin="round"><Antenna design={design} /></g>
      <rect x="122" y="110" width="18" height="39" rx="8" fill={color} stroke={ink} strokeWidth="3" />
      <rect x="260" y="110" width="18" height="39" rx="8" fill={color} stroke={ink} strokeWidth="3" />
      <g fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round"><HeadGeometry design={design} /></g>
      <path d="M152 101Q156 91 172 91H227" fill="none" stroke="white" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" />
      <rect x="150" y="109" width="100" height="49" rx={design === 'pixel' ? 4 : 20} fill="#f9faf4" />
      <ellipse cx="174" cy="131" rx="7" ry="10" fill={ink} /><ellipse cx="226" cy="131" rx="7" ry="10" fill={ink} />
      <circle cx="176" cy="127" r="2" fill="white" /><circle cx="228" cy="127" r="2" fill="white" />
      <path d="M192 143Q200 151 208 143" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="159" cy="143" r="5" fill="#edb0a0" opacity=".7" /><circle cx="241" cy="143" r="5" fill="#edb0a0" opacity=".7" />
    </>;
    case 'body': return <>
      <rect x="185" y="181" width="30" height="19" rx="5" fill={ink} />
      <g fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round"><BodyGeometry design={design} /></g>
      <rect x="152" y="210" width="96" height="77" rx="16" fill="#fbfaf5" fillOpacity=".75" />
      <circle cx="200" cy="244" r="22" fill="#f6c868" stroke={ink} strokeWidth="2.5" />
      <g fill={ink}><ChestMark design={design} /></g>
      <circle cx="184" cy="278" r="3" fill={ink} /><circle cx="200" cy="278" r="3" fill={ink} /><circle cx="216" cy="278" r="3" fill={ink} />
      <path d="M166 304H234" stroke={ink} strokeWidth="7" strokeLinecap="round" />
    </>;
    case 'leftArm': return <>
      <circle cx="133" cy="220" r="12" fill={ink} />
      <rect x="88" y="209" width="36" height="63" rx="17" fill={color} stroke={ink} strokeWidth="3" transform="rotate(12 106 240)" />
      <path d="M100 278L92 286M92 286L83 279M92 286L101 295" stroke={ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M94 226L112 230M92 237L110 241" stroke="#fff" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
    </>;
    case 'rightArm': return <g transform="translate(400 0) scale(-1 1)"><PartShape id="leftArm" color={color} design={design} /></g>;
    case 'leftLeg': return <>
      <rect x="150" y="307" width="31" height="51" rx="12" fill={color} stroke={ink} strokeWidth="3" />
      <path d="M154 325H177M154 334H177" stroke={ink} strokeWidth="3" opacity=".45" />
      <path d="M147 351H180V373H132V365Q132 351 147 351Z" fill={color} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M135 369H177" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    </>;
    case 'rightLeg': return <g transform="translate(400 0) scale(-1 1)"><PartShape id="leftLeg" color={color} design={design} /></g>;
  }
}

function PartOutline({ id, design }: { id: PartId; design: RobotDesign }) {
  if (id === 'head') return <><Antenna design={design} /><HeadGeometry design={design} /><path d="M175 130h1m48 0h1M188 151h24" /></>;
  if (id === 'body') return <><BodyGeometry design={design} /><circle cx="200" cy="246" r="22" /><path d="M200 233v26m-13-13h26" /></>;
  if (id === 'leftArm') return <><rect x="87" y="210" width="37" height="68" rx="17" transform="rotate(12 105 244)" /><path d="M98 279l-6 10m-8-6 8 6 7 7" /></>;
  if (id === 'rightArm') return <g transform="translate(400 0) scale(-1 1)"><PartOutline id="leftArm" design={design} /></g>;
  if (id === 'leftLeg') return <><rect x="149" y="312" width="32" height="44" rx="10" /><path d="M145 353H181V373H133V365Q133 353 145 353Z" /></>;
  return <g transform="translate(400 0) scale(-1 1)"><PartOutline id="leftLeg" design={design} /></g>;
}

export function Robot({ placed, selected, ready, color, design, complete = false, miniature = false }: {
  placed: PartId[]; selected?: PartId; ready?: boolean; color: string; design: RobotDesign; complete?: boolean; miniature?: boolean;
}) {
  const allParts: PartId[] = ['leftLeg', 'rightLeg', 'leftArm', 'rightArm', 'body', 'head'];
  return <svg viewBox="0 0 400 420" className={`robot-svg ${complete ? 'is-complete' : ''}`} aria-label={complete ? 'Robot terminado' : 'Plano del robot'} role="img">
    <ellipse cx="200" cy="389" rx="91" ry="12" fill="#3c4054" opacity=".08" />
    {!miniature && <g stroke="#acb7af" strokeWidth="1" opacity=".45" fill="none"><path d="M65 74V49H90M310 49H335V74M65 339V364H90M310 364H335V339" /><path d="M200 16V29M200 402V413M35 211H48M352 211H365" /></g>}
    <motion.g animate={complete && !miniature ? { y: [0, -9, 0], rotate: [0, -2, 2, 0] } : { y: 0, rotate: 0 }} transition={{ duration: 2.8, repeat: complete && !miniature ? Infinity : 0 }} style={{ transformOrigin: '200px 380px' }}>
      {allParts.map(id => placed.includes(id) ? <motion.g key={`${id}-placed`} initial={miniature ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 250, damping: 16 }}><PartShape id={id} color={color} design={design} /></motion.g> : <g key={id} className={`robot-outline ${selected === id ? 'selected' : ''} ${selected === id && ready ? 'ready' : ''}`} stroke={selected === id ? '#7961ce' : '#b7c2b7'} strokeWidth={selected === id ? 2.5 : 2} strokeDasharray="6 6" fill={selected === id ? '#ece7f7' : '#e7ece3'} fillOpacity={selected === id ? '.85' : '.65'}>
        <PartOutline id={id} design={design} />
      </g>)}
    </motion.g>
  </svg>;
}

export function PartIcon({ id, color, design }: { id: PartId; color: string; design: RobotDesign }) {
  const [x, y] = partPositions[id];
  const size = id === 'body' ? 140 : 110;
  const viewBox = id === 'head' ? '115 20 170 170' : `${x - size / 2} ${y - size / 2} ${size} ${size}`;
  return <svg viewBox={viewBox} aria-hidden="true"><PartShape id={id} color={color} design={design} /></svg>;
}
