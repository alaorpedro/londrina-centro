# Club43 de Vantagens

Clube de vantagens do comércio de Londrina — "mais para você, mais para Londrina". O morador assina
por R$ 99,90/ano, abre o app e encontra cupons válidos só em lojas do centro. O
lojista entra por contrato fechado presencialmente pelo vendedor — não paga
dentro do app.

**Este repositório está na Fase 0: o piloto para apresentação à ACIL.**

- Escopo completo: [`docs/ESCOPO.md`](docs/ESCOPO.md)
- Dev: `londrina.onmid.app`

---

## As três superfícies

Um deploy só, separadas por prefixo de rota. Cada uma tem cookie de sessão
próprio, então dá para estar logado nas três ao mesmo tempo — é assim que a
demonstração acontece: celular gerando o cupom, notebook validando.

| Rota | Quem usa | O que faz |
|---|---|---|
| `/` | Morador | PWA: ofertas, mapa, cupom, minha conta |
| `/lojista` | Loja | Valida cupom no balcão, resultados, ofertas |
| `/admin` | Equipe do clube | Lojas, contratos, curadoria, relatório ACIL |

---

## Rodar

Precisa de Node 22+ e um Postgres.

```bash
npm install
```

Crie o `.env` a partir do `.env.example`:

```bash
cp .env.example .env
```

Suba o banco e semeie o piloto (10 lojas, 19 ofertas, 24 moradores, 90 dias de
histórico):

```bash
createdb londrina_centro && npm run seed
```

Sobe tudo (Express servindo a API e o `dist`):

```bash
npm run start:local
```

Para desenvolver com hot reload, dois terminais: `npm run dev:api` e `npm run dev`.

### Acessos de demonstração

| Perfil | Onde | Credencial |
|---|---|---|
| Morador assinante | `/` | `43999100000` / `demo1234` |
| Morador sem assinatura | `/` | cadastre um novo — cai no paywall |
| Lojista | `/lojista` | `sapatariabraganca@lojademo.com.br` / `demo1234` |
| Admin | `/admin` | a senha de `ADMIN_SENHA` |

Todas as lojas de demonstração seguem o padrão
`<nomedaloja sem espaço e sem acento>@lojademo.com.br` com senha `demo1234`.

Refazer o seed do zero: `npm run seed -- --limpar`.

---

## O fluxo que sustenta o produto

```
morador toca "Usar agora"
        ↓  confirma que está na loja
código de 6 dígitos, válido 5 minutos, uso único
        ↓  balconista digita no painel
tela verde: cliente, oferta e o que aplicar
        ↓  (opcional) balconista informa o valor da compra
economia real grava no relatório, no lugar da estimativa
```

A tela do morador vira sozinha para a confirmação — ela consulta o servidor a
cada 2,5s enquanto o código está na tela. Os dois lados do balcão veem que deu
certo ao mesmo tempo.

### Anti-fraude

| Vetor | Barreira | Onde |
|---|---|---|
| Print circulando em grupo | expira em 5 min, uso único | `resgates.js` |
| Não-assinante usando desconto | código só nasce com assinatura vigente | R2/R3 |
| Repetir o mesmo cupom | limite por usuário/período | R6 |
| Dois balconistas, mesmo código | `SELECT … FOR UPDATE` na transação | R5 |
| Cupom de outra loja | confere `loja_id` do lojista logado | `validarCodigo` |
| Contrato vencido e loja no ar | job de hora em hora + checagem em runtime | R9 |

---

## Arquitetura

Stack própria (Base ON), sem Lovable.

```
server/
  db.js         schema lc_*, config, rotinas de vigência
  auth.js       três sessões (morador/lojista/admin), scrypt, freio de brute force
  datas.js      tudo no fuso de Londrina — nada de `new Date()` decidindo "hoje"
  resgates.js   motor de cupom: gerar, validar, calcular economia
  index.js      rotas das três superfícies
  seed.js       piloto de demonstração
src/
  morador/      PWA
  lojista/      painel da loja
  admin/        painel do clube + relatório ACIL
  componentes/  Ui, Icones, Graficos
```

- **Front:** React 19 + Vite + Tailwind 4, PWA instalável (~91 KB gzip)
- **Back:** Express 5 + `pg`, sem ORM
- **Banco:** PostgreSQL, tabelas com prefixo `lc_`
- **Deploy:** GitHub → Coolify (Dockerfile multi-stage)

### Duas armadilhas já resolvidas aqui

1. **`--include=dev` no Dockerfile.** O Coolify injeta as variáveis do app como
   ARG no build; um `NODE_ENV=production` faria o npm pular as devDependencies e
   o build quebraria com `sh: tsc: not found`.
2. **Fuso.** O parser de `DATE` do `pg` é desligado em `db.js`. Sem isso, um
   `'2026-08-09'` viraria 08/08 à noite num container em UTC e ofertas válidas
   "até domingo" morreriam no sábado.

---

## O que ficou para a Fase 1

O piloto é peça de apresentação, não produção. Está deliberadamente de fora:

- **Pagamento real.** O checkout roda em modo demonstração: a tela é a
  definitiva, mas a assinatura é liberada sem cobrança. Com `MERCADO_PAGO_TOKEN`
  no ambiente, a mesma rota passa a cobrar de verdade (Pix, cartão à vista e 3x)
  — o front não muda.
- **Leitura de QR pela câmera.** O caminho testado e principal é o balconista
  digitar os 6 dígitos. Escanear exige `getUserMedia` + decodificador; um QR na
  tela que nada consegue ler seria pior que não ter.
- **Mapa com tiles reais.** Hoje é uma projeção das coordenadas num plano, que
  já prova a concentração das lojas. Tiles são requisição a terceiros e decisão
  de chave/atribuição de produção.
- **Verificação do WhatsApp por código** no cadastro.
- **Push** e a régua de renovação de 60/30/7 dias.

---

## Dados de demonstração

⚠️ As 10 lojas do seed são **fictícias**. Os endereços usam ruas reais do centro
de Londrina para o mapa ficar verossímil, e as coordenadas são aproximadas —
posicionam o pin, não servem para navegação. Nenhum comércio real está
representado.

Toda loja do seed entra com `demo = true` e aparece com o selo "demonstração" no
painel do admin. Limpeza antes do lançamento:

```sql
DELETE FROM lc_lojas WHERE demo;
```
