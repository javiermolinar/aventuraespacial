import { motion } from 'motion/react';
import type { PartId } from '../../game';
import type { RobotDesign } from './design';
import { PartOutline, PartShape, robotPartOrder } from './RobotArtwork';

export { PartIcon, partPositions } from './RobotArtwork';

/** Animated assembly is only used by the playable workshop. */
export function Robot({ placed, selected, ready, color, design, complete = false, miniature = false }: {
  placed: PartId[]; selected?: PartId; ready?: boolean; color: string; design: RobotDesign; complete?: boolean; miniature?: boolean;
}) {
  return <svg viewBox="0 0 400 420" className={`robot-svg ${complete ? 'is-complete' : ''}`} aria-label={complete ? 'Robot terminado' : 'Plano del robot'} role="img">
    <ellipse cx="200" cy="389" rx="91" ry="12" fill="#3c4054" opacity=".08" />
    {!miniature && <g stroke="#acb7af" strokeWidth="1" opacity=".45" fill="none"><path d="M65 74V49H90M310 49H335V74M65 339V364H90M310 364H335V339" /><path d="M200 16V29M200 402V413M35 211H48M352 211H365" /></g>}
    <motion.g animate={complete && !miniature ? { y: [0, -9, 0], rotate: [0, -2, 2, 0] } : { y: 0, rotate: 0 }} transition={{ duration: 2.8, repeat: complete && !miniature ? Infinity : 0 }} style={{ transformOrigin: '200px 380px' }}>
      {robotPartOrder.map(id => placed.includes(id) ? <motion.g key={`${id}-placed`} initial={miniature ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 250, damping: 16 }}><PartShape id={id} color={color} design={design} /></motion.g> : <g key={id} className={`robot-outline ${selected === id ? 'selected' : ''} ${selected === id && ready ? 'ready' : ''}`} stroke={selected === id ? '#7961ce' : '#b7c2b7'} strokeWidth={selected === id ? 2.5 : 2} strokeDasharray="6 6" fill={selected === id ? '#ece7f7' : '#e7ece3'} fillOpacity={selected === id ? '.85' : '.65'}>
        <PartOutline id={id} design={design} />
      </g>)}
    </motion.g>
  </svg>;
}
