import { FLAG } from '../data/worldcupGroups'

// Bandeira de uma seleção via flagcdn (SVG — funciona em qualquer tamanho e país).
// - Seleção por definir (team vazio): bandeira "hollow" com um ponto de interrogação.
// - Seleção sem código no mapa FLAG: fallback para a sigla de 3 letras.
export default function Flag({ team, size = 20 }) {
  const h = Math.round(size * 0.75)

  // Por definir (ex.: vencedor de um jogo ainda não jogado)
  if (!team) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-[2px] shrink-0 border border-dashed border-slate-400/70 bg-slate-200/40 text-slate-400 font-bold leading-none"
        style={{ width: size, height: h, fontSize: Math.round(h * 0.8) }}
        aria-label="Seleção por definir"
      >
        ?
      </span>
    )
  }

  const code = FLAG[team]
  if (!code) {
    return <span className="text-xs font-bold text-slate-500 shrink-0">{team.slice(0, 3).toUpperCase()}</span>
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
