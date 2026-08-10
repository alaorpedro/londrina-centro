# Londrina Centro — Escopo do Projeto

**Domínio (dev):** londrina.onmid.app
**Data:** 10/08/2026
**Status:** escopo aprovado para desenvolvimento — piloto para apresentação à ACIL

---

## 1. O que é

Clube de descontos exclusivo do comércio da região central de Londrina. O morador
assina, abre o app e encontra ofertas reais — desconto, leve 2 pague 1, brinde,
oportunidade relâmpago — válidas só em lojas do centro. O objetivo declarado é
puxar gente dos bairros de volta ao centro e dar ao lojista uma ferramenta de
atração com resultado mensurável.

O produto se apoia em três coisas que precisam existir juntas:

1. **Oferta boa o suficiente** para o morador pagar a assinatura sem pensar duas vezes
2. **Validação simples o suficiente** para o balconista usar sem treinamento
3. **Relatório convincente o suficiente** para o lojista renovar o contrato

Se qualquer uma das três falhar, o modelo trava. O escopo abaixo está construído
em torno disso.

---

## 2. Atores e modelo de negócio

| Ator | Como entra | Como paga | O que acessa |
|---|---|---|---|
| **Morador** | Baixa o app e se cadastra sozinho | R$ 99,90/ano via Mercado Pago (Pix ou 3x) | App PWA |
| **Lojista** | Vendedor fecha contrato presencialmente | Fora do app, direto com o vendedor | Painel do lojista |
| **Balconista** | Criado pelo dono da loja | — | Só a tela de validação |
| **Vendedor** | — | Recebe comissão fora do sistema | Nada no v1 (só é registrado no contrato) |
| **Admin** | Conta interna | — | Painel completo |

### Fluxo comercial do lojista

```
Vendedor visita a loja
        ↓
Fecha contrato (papel/assinatura digital, fora do app)
        ↓
Envia dados + oferta acordada para o Admin
        ↓
Admin cadastra loja, contrato e primeira oferta
        ↓
Sistema envia acesso ao lojista por WhatsApp/e-mail
        ↓
Loja entra no ar no app
        ↓
[contrato vence] → loja e ofertas somem do app automaticamente
```

**Sem período de teste.** A loja só aparece no app com contrato ativo.

---

## 3. Regras de negócio

Estas são as regras que o código precisa garantir. Cada uma vira teste.

### Acesso do morador

- **R1.** Quem não é assinante **vê** todas as ofertas, com loja, foto e regra completa.
- **R2.** Quem não é assinante **não gera código**. O botão "Usar agora" abre a tela de assinatura.
- **R3.** Assinatura vencida, cancelada ou com parcela em aberto volta ao estado de R2 — mantém conta, histórico e navegação, perde a geração de código.
- **R3.1.** Pagamento parcelado em 3x libera o acesso **integral desde a primeira parcela**. Parcela recusada nas seguintes suspende o acesso após 5 dias de carência.

*Racional:* mostrar a oferta inteira é a isca. Esconder converte muito menos —
o morador precisa ver o que está perdendo.

### Cupom e resgate

- **R4.** Código de **6 dígitos**, gerado sob demanda, **válido por 5 minutos**.
- **R5.** Uso **único**. Validado uma vez, morre. Garantido por lock transacional no banco — dois balconistas validando o mesmo código ao mesmo tempo, só um passa.
- **R6.** Cada assinante usa cada oferta **1x por mês** (configurável por oferta: 1x total, 1x/semana, 1x/mês, ilimitado).
- **R7.** A oferta pode ter **limite total de resgates** (ex: 100 cupons) e **janela de validade** — datas, dias da semana e faixa de horário. Ex: "terça a quinta, 14h às 18h".
- **R8.** Código expirado sem validação libera o direito de volta — o morador pode gerar outro.

### Ciclo de vida da loja

- **R9.** Contrato vencido → loja e todas as ofertas somem do app **no dia seguinte ao vencimento**, sem intervenção manual. Job diário + verificação em tempo de consulta (cinto e suspensório).
- **R10.** Loja "pausada" pelo admin some do app mas mantém o histórico e o acesso ao painel.
- **R11.** Loja sem nenhuma oferta ativa não aparece na lista principal (aparece no mapa, marcada como "sem oferta no momento").
- **R12.** Oferta criada pelo lojista entra como **pendente** e só vai ao ar depois de aprovada pelo admin. Oferta criada pelo admin já entra aprovada.

*Racional para R12:* a curadoria é o que protege o valor da assinatura. Se entrar
"5% off em compras acima de R$ 300", o assinante cancela no mês seguinte.

---

## 4. O fluxo de validação (o coração do produto)

Este é o ponto onde o app encosta na realidade do balcão. Se for confuso, o
lojista para de usar e o relatório fica vazio.

### Do lado do morador

1. Abre a oferta → toca **"Usar agora"**
2. Tela de confirmação: *"Você está na loja agora? O código vale por 5 minutos."*
3. Tela do código: **6 dígitos gigantes**, QR abaixo, contador regressivo visível
4. Após validação: tela verde — *"Pronto! Você economizou R$ 32,00"*

### Do lado do lojista

1. Balconista abre o painel na aba **"Validar"** (tela inicial, sem menu no caminho)
2. Digita os 6 dígitos — ou toca em "escanear" e usa a câmera no QR
3. Tela mostra: **nome do cliente**, **oferta**, **o que aplicar** (ex: "20% de desconto")
4. Confirma → tela verde grande, registro gravado

A tela de validação é desenhada para balcão: fonte grande, alto contraste, dois
toques até a confirmação, funciona em celular velho e em tablet.

### Anti-fraude

| Vetor | Barreira |
|---|---|
| Print do código circulando em grupo | Expira em 5 min e é de uso único |
| Não-assinante usando desconto | Código só é gerado com assinatura ativa |
| Assinante repetindo o mesmo cupom | Limite por usuário/período (R6) |
| Balconista validando sem cliente | Todo resgate grava hora, oferta, loja e quem validou — anomalia aparece no relatório do admin |
| Dois resgates simultâneos do mesmo código | Lock transacional (R5) |

**Geofence (validar só se o morador estiver a X metros da loja):** fica para a
Fase 2. Em PWA no iOS o GPS dá falso negativo dentro de galeria e prédio antigo —
exatamente o cenário do centro de Londrina. Bloquearia venda de verdade.

---

## 5. App do morador (PWA)

| # | Tela | Conteúdo |
|---|---|---|
| 1 | Onboarding | 3 telas: o que é, quanto custa, **como instalar na tela inicial** |
| 2 | Cadastro | Nome, WhatsApp (verificação por código), e-mail, senha |
| 3 | **Home** | Busca, categorias, faixa "Oportunidades" (relâmpago), destaques, lista de ofertas |
| 4 | Detalhe da oferta | Foto, loja, regra completa, validade, botão "Usar agora" ou paywall |
| 5 | Código | 6 dígitos + QR + contador de 5 min |
| 6 | Confirmação | "Você economizou R$ X" + total economizado no mês |
| 7 | Mapa | Pins das lojas do centro, filtro por categoria |
| 8 | Perfil da loja | Todas as ofertas, endereço, "como chegar", WhatsApp, horário |
| 9 | Favoritos | Lojas e ofertas salvas |
| 10 | Minha conta | Assinatura e data de vencimento, histórico de resgates, **quanto já economizei**, renovar |
| 11 | Assinatura | R$ 99,90/ano — Pix ou até 3x no cartão, checkout Mercado Pago |

**"Quanto já economizei"** é a tela que segura a renovação. Soma o valor de todos
os resgates e compara com os R$ 99,90 pagos. Com dois ou três usos o morador já
pagou o ano inteiro — e é exatamente esse número que a régua de renovação envia
por e-mail e WhatsApp aos 60 dias do vencimento.

### Categorias iniciais

Alimentação · Moda e calçados · Beleza e estética · Saúde · Serviços ·
Casa e decoração · Eletrônicos · Lazer · Pet · Óticas e joalherias

---

## 6. Painel do lojista

| # | Tela | Conteúdo |
|---|---|---|
| 1 | **Validar** | Tela inicial. Campo de 6 dígitos + botão de câmera |
| 2 | Dashboard | Resgates hoje/semana/mês, gráfico por dia, horário de pico, oferta campeã |
| 3 | Minhas ofertas | Lista, criar (vai para aprovação), editar, pausar |
| 4 | Histórico | Tabela de resgates: data, hora, oferta, primeiro nome do cliente |
| 5 | Perfil da loja | Foto, logo, descrição, horário, contato |
| 6 | Equipe | Adicionar balconista (acesso só à tela de validação) |
| 7 | Meu contrato | Vigência, data de renovação, contato do vendedor |

O dashboard é o argumento de renovação. Precisa responder em 5 segundos:
*"quanta gente esse app trouxe pra minha loja este mês?"*

---

## 7. Painel do administrador

| # | Módulo | Conteúdo |
|---|---|---|
| 1 | Dashboard | Assinantes pagantes, assinantes ativos (com resgate), receita do mês, renovações pendentes, resgates totais, lojas ativas |
| 2 | Lojas | Cadastrar, editar, pausar, ver desempenho individual |
| 3 | **Contratos** | Vendedor responsável, valor, vigência, **alertas de vencimento em 30/15/7 dias** |
| 4 | Ofertas | Aprovar/reprovar pendentes, criar direto, marcar destaque na home |
| 5 | Assinantes | Lista, status, histórico de pagamento, inadimplentes |
| 6 | Relatórios | Ver seção 8 |
| 7 | Conteúdo | Banners da home, disparo de push manual |
| 8 | Auditoria | Log de toda ação sensível: quem aprovou, quem pausou, quem cancelou |

### Alertas operacionais no dashboard

- Contratos vencendo em 30 dias → aviso para o vendedor renovar
- Lojas sem oferta ativa há mais de 7 dias → o lojista esfriou
- Lojas com zero resgates no mês → risco de não renovar
- Ofertas pendentes de aprovação há mais de 48h
- Assinaturas vencendo nos próximos 60 dias (fila de renovação)
- Parcelas de cartão recusadas
- Assinantes pagantes que nunca resgataram nada — alvo de reativação

---

## 8. Relatório ACIL

Um relatório separado, exportável em PDF, construído para a conversa institucional
— não para operação. É a peça que justifica o projeto perante a associação.

- Total de moradores atraídos ao centro no período
- Economia total gerada para os consumidores (R$)
- Número de lojas participantes e ranking por resgate
- Distribuição de resgates por dia da semana e horário
- Mapa de calor dos resgates na região central
- Categorias mais procuradas
- Evolução mês a mês

**Economia total gerada** é o número de ouro. É o que a ACIL leva para a imprensa
e para os associados.

---

## 9. Assinatura e pagamento

**Gateway:** Mercado Pago
**Plano:** **R$ 99,90 por ano** — pagamento único, acesso por 12 meses.

| Forma | Condição | Custo aproximado |
|---|---|---|
| **Pix à vista** | R$ 89,90 com desconto | ~1% de taxa |
| **Cartão à vista** | R$ 99,90 | ~5% de taxa |
| **Cartão em até 3x** | 3 × R$ 33,30 sem juros | ~7% de taxa |

Preço e formas de pagamento ficam em configuração no banco, alteráveis sem deploy.

### Por que anual único e não assinatura recorrente

No Mercado Pago, **assinatura recorrente e parcelamento não se combinam** — quem
usa Preapproval não parcela. Como o parcelamento em 3x é requisito, o plano é
**pagamento único com vigência de 12 meses**.

A contrapartida é que não há renovação automática. Isso é tratado por processo:

- **60 dias antes do vencimento:** e-mail com o relatório "quanto você economizou este ano"
- **30 dias antes:** push + WhatsApp com link de renovação e desconto de antecipação
- **7 dias antes:** push diário
- **No vencimento:** acesso cai para o estado de não-assinante (R2) — mantém conta,
  histórico e navegação, perde a geração de código
- **Após o vencimento:** faixa fixa no app com o botão de renovar

O relatório de economia acumulada (seção 5) é a peça central da renovação. Quem
economizou R$ 400 no ano não pensa duas vezes em pagar R$ 99,90 de novo.

### O que R$ 99,90/ano significa para o modelo

| Assinantes | Receita anual do app |
|---|---|
| 500 | R$ 49.950 |
| 1.000 | R$ 99.900 |
| 3.000 | R$ 299.700 |

A R$ 8,32/mês equivalentes, a assinatura deixa de ser a receita principal e passa
a ser o **motor de audiência**. A receita real do projeto está nos contratos dos
lojistas, vendidos pelo vendedor — e quanto maior a base de assinantes, mais caro
e mais fácil de vender fica cada contrato.

Isso melhora o posicionamento perante a ACIL: o projeto não lucra em cima do
morador, ele cobra um valor simbólico para fomentar o comércio central. É um
discurso muito mais defensável em uma associação comercial.

**Efeito colateral a monitorar:** preço baixo aumenta o volume mas também o
descarte — parte dos assinantes paga e nunca usa. Isso não prejudica o caixa,
mas infla a base e distorce o relatório da ACIL. Por isso o relatório separa
**assinantes ativos** (com pelo menos um resgate no período) de **assinantes
pagantes**.

---

## 10. Modelo de dados

Prefixo `lc_` no Postgres do Coolify.

```
lc_users                assinante: nome, whatsapp, email, senha, verificado_em
lc_subscriptions        status, valor, forma_pagamento, inicio, vence_em, renovada_de
lc_payments             mp_payment_id, valor, parcelas, parcela_atual, status, pago_em
lc_merchants            nome, categoria, endereço, lat/lng, contatos, fotos, horário, status
lc_contracts            merchant_id, vendedor, valor, inicio, fim, status
lc_merchant_users       login do lojista/balconista, papel
lc_offers               tipo, valor, regras, imagem, janela de validade, limites, status
lc_redemptions          offer_id, user_id, código, gerado_em, expira_em, validado_em, validado_por
lc_favorites            user_id → merchant/offer
lc_admin_users          conta interna
lc_audit_log            ação, ator, alvo, antes/depois, timestamp
lc_settings             preço, textos, parâmetros operacionais
lc_push_tokens          inscrições de notificação
```

### Tipos de oferta (`lc_offers.tipo`)

| Tipo | Exemplo |
|---|---|
| `percentual` | 20% de desconto |
| `valor_fixo` | R$ 30 de desconto |
| `leve_pague` | Leve 2, pague 1 |
| `brinde` | Ganhe uma sobremesa |
| `relampago` | 40% off, só hoje até as 18h |

`relampago` ganha destaque próprio na home e dispara push.

---

## 11. Stack e infraestrutura

Base ON — stack própria, sem Lovable.

- **Front:** React + Vite, PWA com service worker e instalação na tela inicial
- **Back:** API Node em container no Coolify
- **Banco:** PostgreSQL no Coolify (VPS)
- **DNS/CDN/WAF:** Cloudflare
- **Imagens:** Cloudflare R2 via Worker (mesmo padrão do cinfel-media)
- **Pagamento:** Mercado Pago (Preapproval + Pix + webhooks)
- **Push:** Web Push (VAPID)
- **E-mail:** Resend
- **WhatsApp:** gateway próprio (baseon-wa-gateway) para verificação de cadastro e envio de acesso ao lojista
- **Deploy:** GitHub → Coolify

### Limitação conhecida do PWA no iOS

Push no iPhone só funciona **depois** que o morador adiciona o app à tela inicial.
Isso é tratado no onboarding com uma tela dedicada ensinando o gesto, e com um
lembrete recorrente para quem ainda não instalou. É o principal motivo para a
Fase 3 (app nativo) existir.

---

## 12. Fases de entrega

### Fase 0 — Piloto para a ACIL · ✅ construído

Objetivo: apresentação. Um app navegável de ponta a ponta que permita a alguém
da ACIL pegar o celular e usar. Código em `AG/londrina-centro/`.

Entregue e verificado em tela:

- App do morador completo (11 telas), PWA instalável, ~91 KB gzip
- Fluxo de resgate funcionando de verdade: código de 6 dígitos, expiração de
  5 min, uso único com lock transacional, e a tela do morador virando sozinha
  para a confirmação quando o balconista valida
- Todas as regras R1–R12 implementadas e testadas, incluindo cupom de outra
  loja, código expirado, limite por período e paywall do não-assinante
- Painel do lojista com validação de balcão, resultados e curadoria de ofertas
- Painel admin com cadastro de loja + contrato + acesso numa transação só,
  fila de aprovação e alertas operacionais
- Relatório ACIL com economia gerada, ranking de lojas, dia/horário de pico e
  bairro de origem dos visitantes
- Seed de demonstração: 10 lojas, 19 ofertas, 24 moradores, 90 dias de histórico

Deliberadamente fora do piloto (ver Fase 1):

| Item | Por quê |
|---|---|
| Cobrança real | Checkout roda em modo demonstração; a integração entra atrás da mesma rota, sem mexer no front |
| Leitura de QR pela câmera | O caminho principal e testado é digitar os 6 dígitos. Um QR que nada consegue ler seria pior que não ter |
| Mapa com tiles reais | Hoje é a projeção das coordenadas num plano, que já prova a concentração das lojas |
| Verificação de WhatsApp por código | Travaria a apresentação em SMS |

### Fase 1 — Produção · ~4 semanas após aprovação

- Mercado Pago em produção: Pix, cartão à vista e em 3x, webhooks, carência
- Régua de renovação anual (60/30/7 dias) por e-mail, push e WhatsApp
- Cadastro das 40 lojas e das ofertas de lançamento
- Painel do lojista completo (equipe, histórico, contrato)
- Painel admin completo (alertas, auditoria, relatórios, aprovação de ofertas)
- Push notifications
- Termos de uso e política de privacidade (LGPD)
- Verificação de WhatsApp no cadastro
- Testes de carga do fluxo de validação

### Fase 2 — Pós-lançamento

- Programa de indicação ("indique e ganhe um mês")
- Notificação por proximidade ("você está a 200m de uma oferta")
- Geofence opcional na validação
- Avaliação da loja pelo morador
- Autoatendimento do lojista para renovação de contrato

### Fase 3 — App nativo

- App Store + Play Store
- Push confiável no iOS
- **Atenção:** a Apple cobra 15–30% sobre assinatura vendida dentro do app.
  A estratégia é manter a venda da assinatura no site e deixar o app nativo só
  para uso — modelo permitido e usado por serviços de assinatura no Brasil.

**Total até produção: ~7 semanas**, com a demo para a ACIL na semana 3.

---

## 13. Riscos e pontos de atenção

| # | Risco | Mitigação |
|---|---|---|
| 1 | **Renovação anual não é automática** (limitação do Mercado Pago: recorrência não parcela) | Régua de renovação em 60/30/7 dias + relatório de economia acumulada como argumento |
| 1b | **Preço baixo infla a base com assinante que nunca usa** | Relatório separa pagantes de ativos. Campanha de reativação para quem não resgatou nada |
| 2 | **Ofertas fracas matam a assinatura** | Aprovação obrigatória do admin (R12). Definir um piso mínimo de desconto em contrato |
| 3 | **Balconista não valida o cupom** | Tela de validação de dois toques + material de treinamento impresso na loja + alerta no admin para lojas com zero resgate |
| 4 | **Massa crítica no lançamento** | As 40 lojas precisam estar no ar no dia 1. Não abrir assinatura antes disso |
| 5 | **Push no iOS depende da instalação** | Onboarding dedicado + Fase 3 |
| 6 | **Contrato vence e a loja continua no app** | Automação R9 com job diário e checagem em runtime |
| 7 | **Delimitação da região central ainda indefinida** | Pendente. Ver seção 14 |

---

## 14. Pendências

1. **Perímetro da região central** — lista de ruas/avenidas ou bairros que definem
   a área elegível. Vira regra de cadastro de loja e recorte do mapa. *Alaor vai
   levantar.*
2. **Identidade visual** — logo e paleta do "Londrina Centro". Definir se é marca
   independente ou assinada pela ACIL.
3. **Domínio público** — londrina.onmid.app serve para desenvolvimento. Para o
   público, avaliar domínio próprio.
4. **Contrato do lojista** — modelo jurídico, valor e vigência padrão.
5. **Controlador dos dados (LGPD)** — ONMID ou ACIL. Define quem assina a política
   de privacidade.
6. **Valor do contrato do lojista e comissão do vendedor** — com a assinatura a
   R$ 99,90/ano, esta passa a ser a **receita principal do projeto**. Precisa estar
   definida antes da apresentação à ACIL, porque é o número que sustenta a
   viabilidade. Não afeta o código no v1.
