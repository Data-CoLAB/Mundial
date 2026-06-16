# Mundial 2026 — Plataforma Interna de Apostas

Plataforma interna para promover espírito de equipa através de apostas por pontos no Mundial 2026. ~30 utilizadores. Prazo: 16 Jun 2026.

---

## Stack

- **Frontend:** React (Vite) + Tailwind CSS v3
- **Backend/DB:** Firebase (Firestore + Auth + Hosting + Cloud Functions)
- **Auth:** Email + Password (Firebase Auth) — registo restrito a `@datacolab.pt`
- **Admin:** Role `role: "admin"` no documento Firestore do utilizador — definido manualmente na consola Firebase para o único admin (Pedro Moreira)

---

## Utilizadores e Roles

- ~30 utilizadores internos (empresa: DataColab, usa Outlook/Microsoft 365)
- Login com email + password — utilizador regista-se na app com email `@datacolab.pt`
- Primeiro acesso: utilizador cria conta com nome + email + password
- Password esquecida: link de reset enviado por email (Firebase nativo)
- **1 único admin** (Pedro) — acesso a `/admin` condicionado por `role === "admin"` no Firestore
- Admin do Pedro: usar "Esqueci a password" para adicionar password à conta já existente (preserva UID e role)

---

## Sistema de Pontos

- Pontos **fixos por mercado**, definidos pelo admin ao criar o mercado
- Sem odds dinâmicas
- Uma aposta por mercado por utilizador — **não pode ser alterada após submissão**
- Pontos só contam quando o admin **resolve** o mercado (escolhe opção vencedora)
- Cloud Function distribui automaticamente os pontos a todos os utilizadores com a aposta certa
- Leaderboard mostra apenas **pontos já confirmados** (não pendentes)

---

## Mecanismo de Fecho de Mercados

Cada mercado tem dois momentos distintos:

| Campo | Descrição |
|---|---|
| `closesAt` | Timestamp — depois disto ninguém aposta (Firestore Security Rules bloqueiam escrita) |
| `resolvedAt` | Quando admin resolve e distribui pontos |

**Fecho automático:** UI mostra countdown; Firestore rules bloqueiam novas apostas após `closesAt`.
**Fecho manual:** Admin pode fechar qualquer mercado a qualquer momento (set `status: "closed"`).

### Datas de fecho dos mercados globais

| Mercado | Fecha em | Resolve em |
|---|---|---|
| Bota de Ouro | Domingo 21 Jun 2026, 23h59 | Após a final |
| Vencedor do Mundial | Domingo 21 Jun 2026, 23h59 | Após a final |
| Continente vencedor | Domingo 21 Jun 2026, 23h59 | Após a final |
| Portugal chega a que fase | 17 Jun 2026, antes do jogo PT | Quando PT eliminar/vencer |
| Ronaldo marca no torneio | 17 Jun 2026, antes do jogo PT | Após último jogo PT |
| Quantos golos PT no total | 17 Jun 2026, antes do jogo PT | Após último jogo PT |
| Portugal sofre golos na fase de grupos | 17 Jun 2026, antes do jogo PT | Após 3º jogo de grupos |
| Bola de Ouro (melhor jogador) | Domingo 21 Jun 2026, 23h59 | Após a final |
| Resultado exato da final | Antes da final | Após a final |
| Seleção africana que chega mais longe | Domingo 21 Jun 2026, 23h59 | Quando última seleção africana for eliminada |
| Haverá prolongamento na final | Antes da final | Após a final |

---

## Mercados

### Categoria: Mundial Geral

| # | Título | Opções | Pontos |
|---|---|---|---|
| 1 | Qual seleção vai ganhar o Mundial? | As favoritas (top 8-10) + "Outra" | 100 |
| 2 | Qual continente vai ganhar o Mundial? | Europa, América do Sul, América do Norte, África, Ásia | 50 |
| 3 | Portugal chega a que fase? | Fase de grupos, Oitavos, Quartos, Meias-finais, Final, Campeão | 75 |
| 4 | Quem ganha a Bota de Ouro (mais golos)? | Top 8 jogadores + "Outro" | 100 |
| 5 | Quem ganha a Bola de Ouro (melhor jogador)? | Top 6 jogadores + "Outro" | 100 |
| 6 | Resultado exato da final | 1-0, 2-0, 2-1, 1-1, 2-2, 3-1, 3-2, Outro | 150 |
| 7 | Haverá prolongamento na final? | Sim / Não | 30 |
| 8 | Haverá penáltis na final? | Sim / Não | 30 |
| 9 | Haverá cartão vermelho na final? | Sim / Não | 25 |
| 10 | Qual seleção africana chega mais longe? | Marrocos, Senegal, Costa do Marfim, Egito, Argélia, RD Congo, Outro | 50 |
| 11 | Ronaldo marca no torneio? | Sim / Não | 40 |
| 12 | Quantos golos marca Portugal no total? | 0-3, 4-6, 7-9, 10+ | 60 |
| 13 | Portugal sofre golos na fase de grupos? | Sim / Não | 30 |

### Categoria: Portugal vs Congo (jogo 17 Jun 2026)

| # | Título | Opções | Pontos |
|---|---|---|---|
| 1 | Resultado final | Vitória Portugal, Empate, Derrota Portugal | 40 |
| 2 | Resultado ao intervalo | Vitória Portugal, Empate, Derrota Portugal | 30 |
| 3 | Mais ou menos de 2.5 golos | Mais de 2.5, Menos ou igual a 2.5 | 25 |
| 4 | Primeiro marcador | [Squad PT 15 jogadores] | 75 |
| 5 | Jogador a marcar (qualquer altura) | [Squad PT 15 jogadores] | 50 |
| 6 | Portugal marca em primeiro? | Sim / Não | 25 |
| 7 | Haverá cartão vermelho? | Sim / Não | 25 |
| 8 | Minuto do 1º golo PT | 1-30 min, 31-60 min, 61-90 min, Sem golos na 1ª parte | 40 |

*Repetir esta estrutura para Portugal vs Uzbequistão e Portugal vs Colômbia — apenas aparece um jogo de cada vez (admin cria quando quer que apareçam).*

---

## Squad Portugal — 15 Jogadores

1. Diogo Costa
2. António Silva
3. Rúben Dias
4. João Cancelo
5. Nuno Mendes
6. Rúben Neves
7. Vitinha
8. Bruno Fernandes
9. Bernardo Silva
10. Rafael Leão
11. Pedro Neto
12. Gonçalo Ramos
13. João Félix
14. Francisco Conceição
15. Cristiano Ronaldo

*Diogo Jota removido (não convocado). Francisco Conceição adicionado.*

---

## Leaderboard e Prémios

- Ordenado por `totalPoints` (DESC)
- Só mostra pontos confirmados (mercados já resolvidos)
- Em caso de empate: desempate por quem apostou primeiro (timestamp mais antigo)
- **Prémios com fotos reais** (componente `PrizeImg` com fallback para emoji):
  - 🥇 1.º lugar — Camisola oficial PUMA Portugal 2026
  - 🥈 2.º lugar — Bola oficial Adidas Trionda Mundial 2026
  - 🥉 3.º lugar — Caixa de cerveja Super Bock
- Dados dos prémios centralizados em `src/data/prizes.js` (reutilizado no Login e Leaderboard)

---

## Arquitetura Firestore

```
users/{uid}
  name: string          // nome real introduzido no registo
  email: string
  totalPoints: number
  role: "user" | "admin"
  createdAt: Timestamp

markets/{marketId}
  title: string
  category: "global" | "portugal_game"
  gameLabel: string | null        // ex: "Portugal vs Congo"
  gameOrder: number | null        // 1, 2, 3 — para controlar sequência
  points: number
  closesAt: Timestamp
  status: "open" | "closed" | "resolved"
  winningOptionId: string | null
  options: [{ id, label }]        // array embutido no documento
  createdAt: Timestamp

bets/{uid}_{marketId}             // chave composta — impede apostas duplas
  userId: string
  marketId: string
  optionId: string
  placedAt: Timestamp
```

**Cloud Function `resolveMarket`:**
- Trigger: chamada pelo admin via painel
- Input: `marketId`, `winningOptionId`
- Ação: percorre todas as bets com `optionId === winningOptionId`, incrementa `totalPoints` em cada `users/{uid}`
- Set `market.status = "resolved"`, `market.winningOptionId`

---

## Páginas e Rotas

| Rota | Quem acede | Descrição |
|---|---|---|
| `/login` | Todos | Login / Registo / Reset password |
| `/` | Utilizadores autenticados | Lista de mercados agrupados por tab (Geral / Portugal) |
| `/leaderboard` | Utilizadores autenticados | Ranking em tempo real com prémios |
| `/admin` | Só admin | Criar/fechar/resolver mercados + seed de mercados |

---

## Design

- **Tema:** Dark mode — verde floresta (`#060E0A` base), não preto puro
- **Cor primária:** Dourado/âmbar (`#F5A623`) — pontos, CTAs, destaques
- **Cor secundária:** Vermelho Portugal (`#D4163C`) — Portugal tab ativo, scrollbar, accents
- **Superfícies:** Verde escuro (`#102015` cards, `#0C1A10` inputs, `#1E3D28` bordas)
- **Tipografia:** Inter Bold, números grandes para pontos e countdowns
- **Cards:** Gradiente subtil nas bordas, sombra suave
- **Timer:** Countdown animado até o mercado fechar
- **Tab Portugal:** fica vermelho quando ativo (vs dourado no tab Geral)
- **Responsivo:** Mobile-first — utilizadores vão usar no telemóvel

---

## Estrutura de Ficheiros Relevantes

```
src/
  components/
    Navbar.jsx          — navegação sticky, pontos do utilizador
    MarketCard.jsx      — card de mercado com apostas inline
    OptionAvatar.jsx    — foto jogador (Wikipedia API) ou bandeira (flagcdn.com)
    CountdownTimer.jsx  — countdown animado
    PrizeImg.jsx        — imagem do prémio com fallback para emoji
  contexts/
    AuthContext.jsx     — auth state, criação de user doc no Firestore
  data/
    prizes.js           — dados dos 3 prémios (imagens, textos, cores)
  pages/
    Login.jsx           — login + registo + reset password
    Home.jsx            — mercados agrupados, welcome banner, tabs
    Leaderboard.jsx     — ranking + prémios
    Admin.jsx           — gestão de mercados, seed, resolver
  utils/
    flags.js            — mapeamento país → flagcdn.com + emojis
  firebase.js           — inicialização Firebase (region europe-west1)
```

---

## Notas de Implementação

- Firestore Security Rules bloqueiam aposta se `request.time >= market.closesAt` ou `market.status !== "open"`
- Firestore Security Rules bloqueiam aposta duplicada (documento `{uid}_{marketId}` já existe)
- Admin panel protegido por check `users/{uid}.role === "admin"` no Firestore Rules E no frontend
- Jogos de Portugal aparecem sequencialmente — admin controla criando os mercados na altura certa
- Registo restrito a `@datacolab.pt` — validado no frontend (`Login.jsx`)
- Fotos de jogadores via Wikipedia REST API com cache em memória (`OptionAvatar.jsx`)
- Bandeiras via `flagcdn.com` (`src/utils/flags.js`)
- Firebase Auth provider activo: **Email/Password** (magic link desativado)
- Portugal vs Congo: 17 Jun 2026
- Portugal vs Uzbequistão: data a confirmar
- Portugal vs Colômbia: data a confirmar
