const COUNTRY_CODES = {
  'Espanha': 'es', 'Brasil': 'br', 'França': 'fr', 'Argentina': 'ar',
  'Portugal': 'pt', 'Inglaterra': 'gb-eng', 'Alemanha': 'de',
  'Holanda': 'nl', 'Bélgica': 'be', 'Itália': 'it', 'Croácia': 'hr',
  'Uruguai': 'uy', 'México': 'mx', 'EUA': 'us', 'Japão': 'jp',
  'Marrocos': 'ma', 'Senegal': 'sn', 'Egito': 'eg', 'Argélia': 'dz',
  'Costa do Marfim': 'ci', 'Gana': 'gh', 'África do Sul': 'za',
  'Cabo Verde': 'cv', 'Tunísia': 'tn', 'RD Congo': 'cd', 'Congo': 'cg',
  'Europa': null, 'América do Sul': null, 'América do Norte': null,
  'África': null, 'Ásia': null,
}

export function getFlagUrl(name) {
  if (!(name in COUNTRY_CODES)) return null
  const code = COUNTRY_CODES[name]
  return code ? `https://flagcdn.com/w40/${code}.png` : null
}

export function isKnownCountry(name) {
  return name in COUNTRY_CODES
}

const EMOJI_MAP = {
  // Seleções
  'Espanha': '🇪🇸', 'Brasil': '🇧🇷', 'França': '🇫🇷', 'Argentina': '🇦🇷',
  'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Alemanha': '🇩🇪', 'Outra': '🤔',
  'Holanda': '🇳🇱', 'Bélgica': '🇧🇪', 'Itália': '🇮🇹', 'Croácia': '🇭🇷',
  'Uruguai': '🇺🇾', 'México': '🇲🇽', 'EUA': '🇺🇸', 'Japão': '🇯🇵',
  'Outro': '🤔',
  // Africanas
  'Marrocos': '🇲🇦', 'Senegal': '🇸🇳', 'Egito': '🇪🇬', 'Argélia': '🇩🇿',
  'Costa do Marfim': '🇨🇮', 'Gana': '🇬🇭', 'África do Sul': '🇿🇦',
  'Cabo Verde': '🇨🇻', 'Tunísia': '🇹🇳', 'RD Congo': '🇨🇩', 'Congo': '🇨🇬',
  // Continentes
  'Europa': '🌍', 'América do Sul': '🌎', 'América do Norte': '🌎',
  'África': '🌍', 'Ásia': '🌏',
  // Fases
  'Fase de Grupos': '📋', 'Oitavos de Final': '⚔️', 'Quartos de Final': '🏅',
  'Meias-Finais': '🔥', 'Final': '🌟', 'Campeão 🏆': '🏆',
  // Sim/Não
  'Sim': '✅', 'Não': '❌',
  // Jogadores
  'Kylian Mbappé': '⚡', 'Erling Haaland': '💪', 'Harry Kane': '🎯',
  'Vinicius Jr': '🌪️', 'Cristiano Ronaldo': '⭐', 'Lionel Messi': '🐐',
  'Lamine Yamal': '🌟', 'Jude Bellingham': '🎖️',
}

export function getEmoji(label) {
  return EMOJI_MAP[label] ?? null
}
