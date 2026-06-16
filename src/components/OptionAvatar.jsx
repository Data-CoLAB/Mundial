import { useState, useEffect } from 'react'
import { getFlagUrl } from '../utils/flags'

// Wikipedia page titles for known players
const WIKI_PAGES = {
  'Diogo Costa': 'Diogo_Costa_(footballer)',
  'António Silva': 'António_Silva_(footballer)',
  'Rúben Dias': 'Rúben_Dias',
  'João Cancelo': 'João_Cancelo',
  'Nuno Mendes': 'Nuno_Mendes_(footballer)',
  'Rúben Neves': 'Rúben_Neves',
  'Vitinha': 'Vitinha_(footballer)',
  'Bruno Fernandes': 'Bruno_Fernandes_(footballer,_born_1994)',
  'Bernardo Silva': 'Bernardo_Silva',
  'Rafael Leão': 'Rafael_Leão',
  'Pedro Neto': 'Pedro_Neto_(footballer)',
  'Gonçalo Ramos': 'Gonçalo_Ramos',
  'João Félix': 'João_Félix',
  'Francisco Conceição': 'Francisco_Conceição_(footballer)',
  'Cristiano Ronaldo': 'Cristiano_Ronaldo',
  'Kylian Mbappé': 'Kylian_Mbappé',
  'Erling Haaland': 'Erling_Haaland',
  'Harry Kane': 'Harry_Kane',
  'Vinicius Jr': 'Vinícius_Júnior',
  'Lionel Messi': 'Lionel_Messi',
  'Lamine Yamal': 'Lamine_Yamal',
  'Jude Bellingham': 'Jude_Bellingham',
}

const cache = {}

export default function OptionAvatar({ label }) {
  const flagUrl = getFlagUrl(label)
  const isPlayer = !!WIKI_PAGES[label]
  const [playerImg, setPlayerImg] = useState(label in cache ? cache[label] : undefined)

  useEffect(() => {
    if (!isPlayer || cache[label] !== undefined) return
    const page = WIKI_PAGES[label]
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${page}`)
      .then(r => r.json())
      .then(data => {
        const url = data.thumbnail?.source || null
        cache[label] = url
        setPlayerImg(url)
      })
      .catch(() => {
        cache[label] = null
        setPlayerImg(null)
      })
  }, [label, isPlayer])

  // Country flag
  if (flagUrl) {
    return (
      <img
        src={flagUrl}
        alt={label}
        className="w-7 h-5 object-cover rounded flex-shrink-0"
      />
    )
  }

  // No avatar for generic options (números, sim/não), continents or unknown countries
  if (!isPlayer) return null

  // Player photo loading
  if (playerImg === undefined) {
    return <div className="w-8 h-8 rounded-full bg-[#E2E7F2] flex-shrink-0 animate-pulse" />
  }

  // Player photo loaded
  if (playerImg) {
    return (
      <img
        src={playerImg}
        alt={label}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-[#E2E7F2]"
      />
    )
  }

  // Known player but no photo found — no avatar
  return null
}
