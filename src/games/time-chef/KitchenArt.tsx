import type { Recipe } from './recipes';

export function ChefArt() {
  return <svg viewBox="0 0 100 110" aria-hidden="true" className="chef-mascot">
    <path d="M26 45V29C6 22 19 2 35 12C42-3 65 0 68 13C91 2 101 29 79 32V45" fill="#fffdf8" stroke="#776755" strokeWidth="3" />
    <rect x="22" y="40" width="60" height="48" rx="17" fill="#b7d7c7" stroke="#567970" strokeWidth="3" />
    <rect x="30" y="51" width="44" height="24" rx="10" fill="#32545a" />
    <circle cx="42" cy="61" r="4" fill="#fbe9a1" /><circle cx="62" cy="61" r="4" fill="#fbe9a1" />
    <path d="M44 70Q52 77 60 70M13 54V72M91 54V72" fill="none" stroke="#567970" strokeWidth="5" strokeLinecap="round" />
    <path d="M20 110V100Q22 86 40 86L51 97L63 86Q84 86 86 103V110" fill="#fffdf8" stroke="#776755" strokeWidth="3" />
    <path d="M40 87L52 95L63 87L57 104H46Z" fill="#d58160" />
  </svg>;
}

export function DishArt({ dish, state = 'ready' }: { dish: Recipe['dish']; state?: 'ready' | 'early' | 'burned' | 'perfect' }) {
  const burned = state === 'burned', early = state === 'early';
  const food = burned ? '#584439' : early ? '#e7d4aa' : '#e4a751';
  return <svg viewBox="0 0 300 200" aria-hidden="true" className={`chef-dish is-${state}`}>
    <ellipse cx="150" cy="173" rx="119" ry="17" fill="#6d4c2820" />
    <ellipse cx="150" cy="164" rx="112" ry="17" fill="#fffdf8" stroke="#d9c5a5" strokeWidth="3" />
    {burned && <g className="chef-smoke" fill="none" stroke="#958f88" strokeWidth="9" strokeLinecap="round" opacity=".7"><path d="M95 73C63 49 116 41 91 16" /><path d="M151 60C127 40 167 30 147 6" /><path d="M208 73C185 57 230 37 207 17" /></g>}
    {dish === 'toast' && <g>
      <path d="M78 96C51 49 111 34 150 50C191 34 250 49 223 96V155Q150 175 78 155Z" fill={food} stroke={burned ? '#392e2b' : '#b87c3c'} strokeWidth="9" strokeLinejoin="round" />
      <path d="M98 100C81 69 115 61 150 72C185 61 219 69 202 100V143Q150 155 98 143Z" fill={burned ? '#392e2b' : early ? '#f5e9cd' : '#f7ce7f'} />
      <path d="M128 87L160 83L174 101L142 105Z" fill={burned ? '#82735e' : '#fff0a3'} />
    </g>}
    {dish === 'pancakes' && <g fill={food} stroke={burned ? '#392e2b' : '#b87c3c'} strokeWidth="3">
      {[0, 1, 2].map(index => <g key={index} transform={`translate(0 ${-index * 18})`}><rect x="64" y="115" width="172" height="33" rx="16" /><ellipse cx="150" cy="115" rx="85" ry="18" /></g>)}
      <path d="M99 76Q155 51 204 80L196 105Q185 116 180 97L152 92Q133 114 125 94Z" fill={burned ? '#392e2b' : '#bb7042'} stroke="none" /><path d="M135 66L166 68L163 80L132 78Z" fill={burned ? '#82735e' : '#ffe394'} stroke="none" />
    </g>}
    {dish === 'cake' && <g><rect x="73" y={early ? 111 : 81} width="154" height={early ? 48 : 78} rx="14" fill={food} stroke={burned ? '#392e2b' : '#bc7a41'} strokeWidth="3" />
      <path d={early ? 'M73 118Q103 95 133 120T227 118V141Q190 118 173 145T100 141Z' : 'M73 88Q92 61 149 68T227 88V107Q210 126 191 104Q174 91 156 109T119 108Q92 129 73 105Z'} fill={burned ? '#392e2b' : early ? '#f0dfbd' : '#f3afaa'} />
      {!burned && <g fill="#fff4c1"><path d="M147 75L151 85L162 86L153 93L155 104L147 98L138 104L140 93L132 86L143 85Z" /><circle cx="102" cy="90" r="4" /><circle cx="199" cy="87" r="4" /></g>}
    </g>}
    {dish === 'soup' && <g><path d="M51 101H249Q240 166 151 168Q66 168 51 101Z" fill="#9dc6be" stroke="#527e79" strokeWidth="3" /><ellipse cx="150" cy="101" rx="98" ry="23" fill={food} stroke="#527e79" strokeWidth="3" />
      {[95, 135, 179, 210].map((x, index) => <ellipse key={x} cx={x} cy={96 + index % 2 * 10} rx="8" ry="4" fill={burned ? '#302b28' : early ? '#b3b585' : '#708b53'} />)}
    </g>}
    <g className="chef-dish-face" fill={burned ? '#fff0d4' : '#473b35'}><circle cx="130" cy="133" r="5" /><circle cx="170" cy="133" r="5" />
      {burned ? <ellipse cx="150" cy="147" rx="8" ry="6" /> : <path d={early ? 'M140 148Q150 139 160 148' : 'M140 144Q150 155 160 144'} fill="none" stroke="#473b35" strokeWidth="3" strokeLinecap="round" />}
    </g>
    {state === 'perfect' && <g fill="#d29833"><path d="M34 69L39 81L52 84L39 89L34 103L29 89L16 84L29 81Z" /><path d="M264 44L269 56L282 59L269 64L264 78L259 64L246 59L259 56Z" /></g>}
  </svg>;
}
