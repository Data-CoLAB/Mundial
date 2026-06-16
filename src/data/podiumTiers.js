// Pódio · Mundial 2026
// Fecha: 17 Jun 2026 18:00 Lisboa (= 17:00 UTC)

export const CLOSE_AT = new Date('2026-06-17T17:00:00Z')

export const POINTS_BY_ROUND = {
  grupos:   5,
  '16avos': 10,
  oitavos:  20,
  quartos:  40,
  meias:    70,
  final:    100,
  campeao:  150,
}

export const ROUND_LABELS = {
  grupos:   'Fase de Grupos',
  '16avos': '16 Avos de Final',
  oitavos:  'Oitavos de Final',
  quartos:  'Quartos de Final',
  meias:    'Meias-Finais',
  final:    'Final (vice)',
  campeao:  'Campeão 🏆',
}

export const ROUNDS = Object.entries(POINTS_BY_ROUND).map(([id, pts]) => ({
  id, pts, label: ROUND_LABELS[id],
}))

// Tiers por ranking FIFA
export const TIERS = [
  {
    id: 'tier1',
    label: 'Tier 1',
    subtitle: 'Favoritas',
    emoji: '🥇',
    maxPts: 150,
    teams: [
      'Argentina', 'França', 'Espanha', 'Inglaterra', 'Brasil',
      'Portugal', 'Alemanha', 'Bélgica', 'Países Baixos',
    ],
  },
  {
    id: 'tier2',
    label: 'Tier 2',
    subtitle: 'Candidatas',
    emoji: '🥈',
    maxPts: 150,
    teams: [
      'Colômbia', 'Uruguai', 'EUA', 'Japão', 'México',
      'Marrocos', 'Croácia', 'Suécia', 'Suíça', 'Senegal',
      'Coreia do Sul', 'Austrália',
    ],
  },
  {
    id: 'tier3',
    label: 'Tier 3',
    subtitle: 'Surpresas',
    emoji: '🥉',
    maxPts: 150,
    teams: [
      'Canadá', 'Escócia', 'Haiti', 'Paraguai', 'Turquia',
      'Costa do Marfim', 'Equador', 'Curaçao', 'Tunísia',
      'Nova Zelândia', 'Irão', 'Egito', 'Cabo Verde', 'Arábia Saudita',
      'Iraque', 'Noruega', 'Argélia', 'Áustria', 'Jordânia',
      'Congo RD', 'Uzbequistão', 'Gana', 'Panamá',
      'África do Sul', 'Chéquia', 'Bósnia-Herz.', 'Qatar',
    ],
  },
]
