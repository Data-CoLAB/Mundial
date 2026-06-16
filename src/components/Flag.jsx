import { FLAG } from '../data/worldcupGroups'

// Bandeira de uma seleção via flagcdn (SVG — funciona em qualquer tamanho e país).
// Fallback: sigla de 3 letras se a seleção não estiver no mapa FLAG.
export default function Flag({ team, size = 20 }) {
  const code = FLAG[team]
  const h = Math.round(size * 0.75)
  if (!code) {
    return <span className="text-xs font-bold text-slate-500 shrink-0">{team?.slice(0, 3).toUpperCase()}</span>
  }
  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt=""
      loading="lazy"
      className="rounded-[2px] shrink-0 object-cover"
      style={{ width: size, height: h }}
    />
  )
}
