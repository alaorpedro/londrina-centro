import { pool, initDb } from './db.js'
import { gerarHash } from './auth.js'
import { hojeBrt, somarDias, diaSemanaBrt } from './datas.js'
import { calcularEconomia } from './resgates.js'

/*
  Semeia o piloto para a apresentação à ACIL.

  ⚠️  TUDO AQUI É DADO DE DEMONSTRAÇÃO.
  As lojas são fictícias. Os endereços usam ruas reais do centro de Londrina só
  para o mapa ficar verossímil, e as coordenadas são aproximadas — servem para
  posicionar o pin, não para navegação. Nenhum comércio real está representado.
  Toda loja entra com `demo = true`; a tela do admin mostra o selo, e a limpeza
  antes do lançamento é `DELETE FROM lc_lojas WHERE demo`.

  Rodar:  npm run seed          (só insere se o banco estiver vazio)
          npm run seed -- --limpar   (apaga o que é demo e semeia de novo)
*/

const LIMPAR = process.argv.includes('--limpar')

/* Gerador previsível: a mesma demonstração todas as vezes. Numa apresentação,
   "por que o gráfico mudou?" é uma pergunta que ninguém quer responder. */
let semente = 20260810
function sorteio() {
  semente = (semente * 1664525 + 1013904223) % 4294967296
  return semente / 4294967296
}
function entre(min, max) {
  return Math.floor(sorteio() * (max - min + 1)) + min
}
function escolher(lista) {
  return lista[Math.floor(sorteio() * lista.length)]
}

/* Tira o acento antes de derrubar o que não é letra — senão "Café Cataratas"
   vira "cafcataratas" e o e-mail impresso no fim do seed não bate com o que foi
   gravado. */
function apelido(nome) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const HOJE = hojeBrt()
const SENHA_DEMO = 'demo1234'

/* ---------- lojas ---------- */

const LOJAS = [
  {
    nome: 'Café Cataratas',
    categoria: 'Alimentação',
    descricao: 'Cafeteria e padaria artesanal no coração do centro, aberta desde 1998.',
    endereco: 'Rua Sergipe, 1240',
    referencia: 'Em frente à Praça Rocha Pombo',
    lat: -23.3106, lng: -51.1621,
    horario: 'Seg a sex 7h–19h · Sáb 8h–14h',
    cor: '#B45309',
    vendedor: 'Rafael Meireles',
  },
  {
    nome: 'Sapataria Bragança',
    categoria: 'Moda e calçados',
    descricao: 'Calçados masculinos e femininos, conserto e tingimento no mesmo dia.',
    endereco: 'Rua Maranhão, 830 — Calçadão',
    referencia: 'Meio do calçadão, ao lado da banca',
    lat: -23.3114, lng: -51.1607,
    horario: 'Seg a sex 9h–18h · Sáb 9h–13h',
    cor: '#7C2D12',
    vendedor: 'Rafael Meireles',
  },
  {
    nome: 'Ótica Vista Nova',
    categoria: 'Óticas e joalherias',
    descricao: 'Exame de vista gratuito, lentes com garantia de dois anos.',
    endereco: 'Avenida Paraná, 461',
    referencia: 'Esquina com a Rua Pernambuco',
    lat: -23.3098, lng: -51.1634,
    horario: 'Seg a sex 8h30–18h30 · Sáb 9h–13h',
    cor: '#0E7490',
    vendedor: 'Camila Fontes',
  },
  {
    nome: 'Studio Bela Face',
    categoria: 'Beleza e estética',
    descricao: 'Cabelo, unhas e estética facial. Atendimento com hora marcada.',
    endereco: 'Rua Pernambuco, 1145, sala 3',
    referencia: 'Edifício Centro Comercial, 3º andar',
    lat: -23.3122, lng: -51.1615,
    horario: 'Ter a sáb 9h–19h',
    cor: '#BE185D',
    vendedor: 'Camila Fontes',
  },
  {
    nome: 'Empório do Centro',
    categoria: 'Alimentação',
    descricao: 'Mercearia fina, vinhos, queijos e cestas de presente.',
    endereco: 'Avenida Higienópolis, 705',
    referencia: 'Próximo ao Terminal Central',
    lat: -23.3089, lng: -51.1652,
    horario: 'Seg a sáb 8h–20h',
    cor: '#166534',
    vendedor: 'Rafael Meireles',
  },
  {
    nome: 'Livraria Paiquerê',
    categoria: 'Lazer',
    descricao: 'Livros novos e usados, quadrinhos e um café no fundo da loja.',
    endereco: 'Rua Quintino Bocaiúva, 322',
    referencia: 'Ao lado do cinema antigo',
    lat: -23.3131, lng: -51.1596,
    horario: 'Seg a sáb 9h–19h',
    cor: '#4338CA',
    vendedor: 'Camila Fontes',
  },
  {
    nome: 'Moda Viva',
    categoria: 'Moda e calçados',
    descricao: 'Roupa feminina do 36 ao 52, com provador e ajuste na hora.',
    endereco: 'Rua Maranhão, 1102 — Calçadão',
    referencia: 'Perto da esquina com a Av. Paraná',
    lat: -23.3110, lng: -51.1613,
    horario: 'Seg a sex 9h–18h30 · Sáb 9h–14h',
    cor: '#A21CAF',
    vendedor: 'Rafael Meireles',
  },
  {
    nome: 'Barbearia Norte',
    categoria: 'Beleza e estética',
    descricao: 'Corte, barba e cuidados masculinos. Sem hora marcada.',
    endereco: 'Rua Mato Grosso, 512',
    referencia: 'Sobreloja, entrada pela lateral',
    lat: -23.3117, lng: -51.1641,
    horario: 'Seg a sáb 9h–20h',
    cor: '#1F2937',
    vendedor: 'Camila Fontes',
  },
  {
    nome: 'Pet Amigo Centro',
    categoria: 'Pet',
    descricao: 'Banho, tosa e ração. Leva e traz na região central.',
    endereco: 'Avenida Juscelino Kubitschek, 980',
    referencia: 'Ao lado do posto',
    lat: -23.3082, lng: -51.1668,
    horario: 'Seg a sáb 8h–18h',
    cor: '#0D9488',
    vendedor: 'Rafael Meireles',
  },
  {
    nome: 'Casa & Cia Decorações',
    categoria: 'Casa e decoração',
    descricao: 'Cama, mesa, banho e enxoval. Entrega em toda Londrina.',
    endereco: 'Rua Piauí, 275',
    referencia: 'Quase esquina com a Av. Higienópolis',
    lat: -23.3094, lng: -51.1645,
    horario: 'Seg a sex 9h–18h · Sáb 9h–13h',
    cor: '#9A3412',
    vendedor: 'Camila Fontes',
  },
]

/*
  As vigências são escolhidas de propósito para a demonstração mostrar o
  sistema respirando, não só o caso feliz:
    índice 3 → vence em 12 dias  (dispara o alerta de renovação)
    índice 8 → vence em 25 dias  (aparece na fila de 30 dias)
  O resto vence lá na frente.
*/
const VENCIMENTO = { 3: 12, 8: 25 }

/* ---------- ofertas ---------- */

const OFERTAS = [
  { loja: 0, titulo: 'Café + pão na chapa por R$ 9,90', tipo: 'valor_fixo', valor: 6,
    estimada: 6, regras: 'Válido para café expresso ou coado, tamanho médio.',
    dias: [1, 2, 3, 4, 5], hora: ['07:00', '11:00'], limite_morador: 1, periodo: 'dia',
    descricao: 'O café da manhã do centro. De segunda a sexta, até as 11h.' },

  { loja: 0, titulo: '20% em todo o cardápio da tarde', tipo: 'percentual', valor: 20,
    estimada: 14, regras: 'Não acumula com outras promoções. Consumo no local.',
    dias: [1, 2, 3, 4], hora: ['14:00', '17:00'], limite_morador: 1, periodo: 'semana',
    descricao: 'Aquele intervalo da tarde sai mais barato.' },

  { loja: 1, titulo: '25% de desconto em qualquer calçado', tipo: 'percentual', valor: 25,
    estimada: 62, regras: 'Exceto produtos já em liquidação.',
    limite_morador: 1, periodo: 'mes',
    descricao: 'Um quarto do preço a menos, na loja inteira.' },

  { loja: 1, titulo: 'Conserto de salto com 50% off', tipo: 'percentual', valor: 50,
    estimada: 25, regras: 'Um par por visita. Prazo de 48h.',
    limite_morador: 1, periodo: 'mes' },

  { loja: 2, titulo: 'R$ 150 de desconto em óculos de grau completo', tipo: 'valor_fixo',
    valor: 150, estimada: 150, regras: 'Armação + lentes. Não vale para lente de contato.',
    limite_morador: 1, periodo: 'total', limite_total: 120,
    descricao: 'Armação e lentes com desconto direto no caixa.' },

  { loja: 3, titulo: 'Leve 2 esmaltações, pague 1', tipo: 'leve_pague', valor: 0,
    estimada: 45, regras: 'A segunda esmaltação pode ser usada em até 30 dias.',
    dias: [2, 3, 4], limite_morador: 1, periodo: 'mes',
    descricao: 'Traga uma amiga ou guarde a segunda para depois.' },

  { loja: 3, titulo: '30% na primeira limpeza de pele', tipo: 'percentual', valor: 30,
    estimada: 54, regras: 'Só para quem nunca fez o procedimento na casa.',
    limite_morador: 1, periodo: 'total' },

  { loja: 4, titulo: '15% em vinhos e queijos', tipo: 'percentual', valor: 15,
    estimada: 28, regras: 'Não válido para rótulos importados acima de R$ 300.',
    limite_morador: 2, periodo: 'mes',
    descricao: 'Para a mesa do fim de semana.' },

  { loja: 4, titulo: 'Cesta de café da manhã com R$ 40 off', tipo: 'valor_fixo', valor: 40,
    estimada: 40, regras: 'Cestas a partir de R$ 120. Encomenda com 1 dia.',
    limite_morador: 1, periodo: 'mes', limite_total: 80 },

  { loja: 5, titulo: '20% em livros nacionais', tipo: 'percentual', valor: 20,
    estimada: 18, regras: 'Exceto didáticos e importados.',
    limite_morador: 2, periodo: 'mes',
    descricao: 'Vale para o acervo novo e o usado.' },

  { loja: 5, titulo: 'Café grátis na compra de qualquer livro', tipo: 'brinde', valor: 0,
    estimada: 9, regras: 'Um café por compra, consumo no local.',
    limite_morador: 1, periodo: 'semana' },

  { loja: 6, titulo: '30% na segunda peça', tipo: 'percentual', valor: 30,
    estimada: 47, regras: 'O desconto vale sobre a peça de menor valor.',
    limite_morador: 1, periodo: 'mes',
    descricao: 'Levou duas, a segunda sai com desconto cheio.' },

  { loja: 7, titulo: 'Corte + barba por R$ 45', tipo: 'valor_fixo', valor: 25,
    estimada: 25, regras: 'De segunda a quinta, por ordem de chegada.',
    dias: [1, 2, 3, 4], limite_morador: 2, periodo: 'mes',
    descricao: 'O combo completo, sem hora marcada.' },

  { loja: 8, titulo: '25% no banho e tosa', tipo: 'percentual', valor: 25,
    estimada: 22, regras: 'Cães de até 15kg. Agendamento pelo WhatsApp.',
    dias: [1, 2, 3, 4, 5], limite_morador: 1, periodo: 'mes' },

  { loja: 9, titulo: 'R$ 60 off em jogos de cama', tipo: 'valor_fixo', valor: 60,
    estimada: 60, regras: 'Compras acima de R$ 250.',
    limite_morador: 1, periodo: 'mes', limite_total: 150 },

  /* --- oportunidade relâmpago: é o destaque da home e o gancho do push ---
     Sem janela de hora, de propósito. Com 09:00-21:00 ela aparecia "encerrada"
     numa demonstração às 22h — e esta é o cartão de visitas da home. A janela curta de verdade quem demonstra é o happy hour
     abaixo, que fecha às 19h. */
  { loja: 6, titulo: '40% OFF só hoje', tipo: 'percentual', valor: 40,
    estimada: 78, regras: 'Somente hoje, enquanto durar o estoque da arara promocional.',
    limite_morador: 1, periodo: 'dia', limite_total: 60,
    relampago: true, dias_de_vida: 1,
    descricao: 'A arara da frente inteira com 40%. Só até o fim do dia.' },

  { loja: 0, titulo: 'Happy hour: chope pela metade do preço', tipo: 'percentual', valor: 50,
    estimada: 16, regras: 'Das 17h às 19h, consumo no local.',
    dias: [4, 5], hora: ['17:00', '19:00'], limite_morador: 2, periodo: 'semana',
    relampago: true, dias_de_vida: 21 },

  /* --- fila de aprovação do admin: mostra a curadoria (R12) funcionando --- */
  { loja: 2, titulo: '5% de desconto em lentes de contato', tipo: 'percentual', valor: 5,
    estimada: 9, regras: 'Válido para caixas fechadas.',
    limite_morador: 1, periodo: 'mes', status: 'pendente', criada_por: 'lojista',
    descricao: 'Enviada pelo lojista — desconto fraco, boa candidata a reprovação.' },

  { loja: 9, titulo: '10% em itens de decoração', tipo: 'percentual', valor: 10,
    estimada: 24, regras: 'Exceto móveis.',
    limite_morador: 1, periodo: 'mes', status: 'pendente', criada_por: 'lojista' },
]

/* ---------- moradores ---------- */

const BAIRROS = [
  'Gleba Palhano', 'Aurora', 'Igapó', 'Shangri-lá', 'Jardim Bandeirantes',
  'Cinco Conjuntos', 'Vila Nova', 'Antares', 'Centro', 'Jardim Leonor',
]

const NOMES = [
  'Ana Beatriz Ramos', 'Carlos Eduardo Lima', 'Daniela Prado', 'Eduardo Nakamura',
  'Fernanda S. Toledo', 'Gustavo Ferreira', 'Helena Muniz', 'Igor Bastos',
  'Juliana Kawano', 'Leonardo Prates', 'Marina Delgado', 'Nelson Ribeiro',
  'Olívia Camargo', 'Paulo Henrique Sá', 'Renata Villela', 'Sérgio Kubota',
  'Tatiane Moraes', 'Vinícius Alencar', 'Yara Constantino', 'Bruno Tagliari',
  'Camila Nogueira', 'Diego Sartori', 'Elisa Bertoldi', 'Felipe Aoki',
]

/* ====================================================================== */

async function limpar() {
  console.log('[seed] apagando dados de demonstração…')
  // a cascata das FKs cuida de ofertas, contratos, lojistas e resgates
  await pool.query('DELETE FROM lc_lojas WHERE demo')
  await pool.query(`DELETE FROM lc_moradores WHERE demo`)
}

async function semear() {
  await initDb()

  if (LIMPAR) await limpar()

  const existe = await pool.query('SELECT COUNT(*)::int AS n FROM lc_lojas')
  if (existe.rows[0].n > 0 && !LIMPAR) {
    console.log('[seed] o banco já tem lojas. Use `npm run seed -- --limpar` para refazer.')
    await pool.end()
    return
  }

  /* --- lojas, contratos e acessos --- */

  const idLoja = []
  for (const [i, l] of LOJAS.entries()) {
    const loja = await pool.query(
      `INSERT INTO lc_lojas
         (nome, categoria, descricao, endereco, referencia, lat, lng, whatsapp,
          instagram, horario, cor, status, demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'ativa',TRUE) RETURNING id`,
      [
        l.nome, l.categoria, l.descricao, l.endereco, l.referencia, l.lat, l.lng,
        `43999${String(200000 + i * 1111)}`,
        '@' + apelido(l.nome),
        l.horario, l.cor,
      ],
    )
    idLoja[i] = loja.rows[0].id

    const dias = VENCIMENTO[i] ?? entre(120, 330)
    await pool.query(
      `INSERT INTO lc_contratos (loja_id, vendedor, valor, inicio, fim, status, observacao)
       VALUES ($1,$2,$3,$4,$5,'ativo',$6)`,
      [
        idLoja[i], l.vendedor, escolher([149, 199, 249, 299]),
        somarDias(HOJE, -entre(60, 200)), somarDias(HOJE, dias),
        'Contrato de demonstração do piloto.',
      ],
    )

    const email = `${apelido(l.nome)}@lojademo.com.br`
    await pool.query(
      `INSERT INTO lc_lojistas (loja_id, nome, email, senha_hash, papel)
       VALUES ($1,$2,$3,$4,'dono')`,
      [idLoja[i], l.nome, email, gerarHash(SENHA_DEMO)],
    )
  }
  console.log(`[seed] ${LOJAS.length} lojas, contratos e acessos criados`)

  /* --- ofertas --- */

  const ofertasVivas = []
  for (const [i, o] of OFERTAS.entries()) {
    const status = o.status ?? 'aprovada'
    const inicio = somarDias(HOJE, -entre(30, 90))
    const fim = somarDias(HOJE, o.dias_de_vida ?? entre(60, 180))

    const linha = await pool.query(
      `INSERT INTO lc_ofertas
         (loja_id, titulo, descricao, tipo, valor_desconto, economia_estimada, regras,
          inicio, fim, dias_semana, hora_inicio, hora_fim, limite_total,
          limite_por_morador, periodo_limite, relampago, destaque, status, criada_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING id, tipo, valor_desconto, economia_estimada`,
      [
        idLoja[o.loja], o.titulo, o.descricao ?? null, o.tipo, o.valor, o.estimada,
        o.regras ?? null, inicio, fim, o.dias ?? [],
        o.hora?.[0] ?? null, o.hora?.[1] ?? null,
        o.limite_total ?? null, o.limite_morador ?? 1, o.periodo ?? 'mes',
        Boolean(o.relampago), i === 4 || i === 2, status, o.criada_por ?? 'admin',
      ],
    )
    if (status === 'aprovada') ofertasVivas.push({ ...linha.rows[0], loja: o.loja, def: o })
  }
  console.log(`[seed] ${OFERTAS.length} ofertas criadas`)

  /* --- moradores e assinaturas --- */

  const idMorador = []
  for (const [i, nome] of NOMES.entries()) {
    const whatsapp = `43999${String(100000 + i)}` // sempre 11 dígitos, como celular real
    const m = await pool.query(
      `INSERT INTO lc_moradores (nome, whatsapp, email, senha_hash, bairro, demo, criado_em)
       VALUES ($1,$2,$3,$4,$5, TRUE, now() - ($6 || ' days')::interval) RETURNING id`,
      [
        nome, whatsapp,
        `${apelido(nome.split(' ')[0])}${i}@exemplo.com.br`,
        gerarHash(SENHA_DEMO),
        escolher(BAIRROS),
        String(entre(5, 110)),
      ],
    )
    idMorador[i] = m.rows[0].id

    // 20 dos 24 assinam; os outros ficam como "cadastrou e não assinou",
    // que é justamente o funil que o admin precisa enxergar
    if (i < 20) {
      /*
        Os dois últimos assinantes entram com quase um ano de casa: vencem em
        ~30 dias e nunca resgataram nada (o histórico abaixo só usa 0..17).
        São eles que fazem a régua de renovação e o alerta de "pagante que nunca
        usou" aparecerem com número na apresentação — os dois pontos em que o
        modelo anual é frágil e sobre os quais a ACIL vai perguntar.
      */
      const dormente = i >= 18
      // os três primeiros assinaram nos últimos dias: sem eles o painel abre com
      // "0 novos no mês" e a receita do mês zerada, que é a pior primeira
      // impressão possível numa apresentação
      const inicio = dormente
        ? somarDias(HOJE, -335)
        : somarDias(HOJE, i < 3 ? -entre(1, 8) : -entre(12, 200))
      const forma = sorteio() < 0.45 ? 'pix' : 'cartao'
      const valor = forma === 'pix' ? 89.9 : 99.9
      const parcelas = forma === 'pix' ? 1 : escolher([1, 1, 2, 3])

      const a = await pool.query(
        `INSERT INTO lc_assinaturas (morador_id, status, valor, forma, parcelas, inicio, vence_em)
         VALUES ($1,'ativa',$2,$3,$4,$5,$6) RETURNING id`,
        [idMorador[i], valor, forma, parcelas, inicio, somarDias(inicio, 365)],
      )
      await pool.query(
        `INSERT INTO lc_pagamentos (assinatura_id, referencia, valor, parcela, de_parcelas, status, pago_em)
         VALUES ($1,'demo',$2,1,$3,'pago', now() - ($4 || ' days')::interval)`,
        [a.rows[0].id, valor, parcelas, String(entre(10, 120))],
      )
    }
  }
  console.log(`[seed] ${NOMES.length} moradores (20 assinantes) criados`)

  /* --- histórico de resgates ---
     90 dias de uso, com a curva que o comércio de rua realmente tem: sexta e
     sábado puxam, o pico é no almoço e no fim da tarde. Sem isso os painéis
     abrem vazios e não há o que apresentar. */

  const PESO_DIA = { 0: 0.15, 1: 0.7, 2: 0.8, 3: 0.9, 4: 1.0, 5: 1.5, 6: 1.3 }
  const HORAS = [9, 10, 11, 11, 12, 12, 13, 14, 15, 16, 16, 17, 17, 18, 18, 19]

  let inseridos = 0
  for (let d = 89; d >= 0; d--) {
    const dia = somarDias(HOJE, -d)
    const dow = diaSemanaBrt(new Date(`${dia}T12:00:00-03:00`))

    // adoção crescendo ao longo do trimestre — o gráfico do relatório precisa
    // contar uma história de crescimento, que é o argumento junto à ACIL
    const maturidade = 0.35 + (89 - d) / 89 * 0.65
    const base = 6 * PESO_DIA[dow] * maturidade
    const quantos = Math.max(0, Math.round(base + (sorteio() - 0.5) * 3))

    for (let k = 0; k < quantos; k++) {
      const oferta = escolher(ofertasVivas)
      if (oferta.def.dias?.length && !oferta.def.dias.includes(dow)) continue
      if (oferta.def.relampago && oferta.def.dias_de_vida === 1) continue

      const morador = idMorador[entre(0, 17)] // 18 e 19 ficam dormentes de propósito
      const hora = escolher(HORAS)
      const minuto = entre(0, 59)

      const compra = sorteio() < 0.62 ? entre(35, 480) : null
      const economia = calcularEconomia(
        { tipo: oferta.tipo, valor_desconto: oferta.valor_desconto,
          economia_estimada: oferta.economia_estimada },
        compra ?? 0,
      )

      const carimbo = `${dia}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00-03:00`

      await pool.query(
        `INSERT INTO lc_resgates
           (oferta_id, loja_id, morador_id, codigo, status, gerado_em, expira_em,
            validado_em, validado_por, valor_compra, economia, dia)
         VALUES ($1,$2,$3,$4,'validado',
                 $5::timestamptz - interval '2 minutes', $5::timestamptz + interval '3 minutes',
                 $5::timestamptz,
                 (SELECT id FROM lc_lojistas WHERE loja_id = $2 LIMIT 1),
                 $6,$7,$8)`,
        [
          oferta.id, idLoja[oferta.loja], morador,
          String(entre(0, 999999)).padStart(6, '0'), carimbo, compra, economia, dia,
        ],
      )
      inseridos++
    }
  }
  console.log(`[seed] ${inseridos} resgates históricos (90 dias)`)

  /* --- favoritos, só para a tela não abrir vazia --- */
  for (let i = 0; i < 20; i++) {
    await pool.query(
      `INSERT INTO lc_favoritos (morador_id, loja_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [idMorador[entre(0, 19)], idLoja[entre(0, LOJAS.length - 1)]],
    )
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('  Piloto semeado. Acessos de demonstração:')
  console.log('─────────────────────────────────────────────')
  console.log('  Morador   →  /              43999100000 / demo1234')
  console.log('  Lojista   →  /lojista       cafecataratas@lojademo.com.br / demo1234')
  console.log('  Admin     →  /admin         senha da variável ADMIN_SENHA')
  console.log('─────────────────────────────────────────────\n')

  await pool.end()
}

semear().catch((e) => {
  console.error('[seed] falhou:', e)
  process.exit(1)
})
