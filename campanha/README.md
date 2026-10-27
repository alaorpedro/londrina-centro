# Campanha Club43

## Mote

**"Club43, tem tudo no centro!"** — a marca dentro da frase, para ninguém repetir a
linha sem dizer o nome.

Declina por loja: *Tem café no centro* · *Tem sapato no centro* · *Tem beleza no
centro*. Uma fórmula, quarenta peças. O guarda-chuva vira prova: o "tudo" é a soma
das lojas. Fecha sempre com **"E agora tem desconto. R$ 99,90 o ano."**

## Arquivos

| Arquivo | O que é |
|---|---|
| `apresentacao.src.html` | **a fonte** — referencia as imagens por arquivo. É aqui que se edita |
| `apresentacao.html` | gerado pelo build: autocontido, com tudo embutido |
| `club43-apresentacao.pdf` | gerado pelo build: o que se leva à reunião |
| `build.sh` | embute os ativos e gera o PDF; falha se sobrar referência externa |
| `app-home.jpg` · `app-cupom.jpg` · `app-loja.jpg` | capturas reais do app |
| `selo-preview.html` | estudo do adesivo de vitrine |

```
./build.sh
```

⚠️ **Nunca editar `apresentacao.html` direto** — ele é sobrescrito. Editar a `.src`.

## Por que autocontido

Caminho relativo quebra assim que o arquivo sai da pasta, e o deck vai circular por
e-mail e WhatsApp. O `build.sh` embute logo e mockups em data URI e **aborta se
sobrar qualquer `src=` externo**.

## Domínio

O deck todo assina **club43.com.br**. Em 25/10/2026 estavam livres no registro.br:
`club43.com.br`, `club43.app.br`, `clube43.com.br` e `club43.com`.
🔴 Registrar antes de a campanha vazar o nome. O app hoje responde em
`club43.onmid.app` — o redirecionamento entra quando o domínio existir.

## A apresentação

**Vinte e nove slides, sem citar entidade nenhuma** — serve para a ACIL, para o
Sincoval ou para qualquer outra. Seis capítulos com divisor:

| | Capítulo | Slides |
|---|---|---|
| — | capa + o argumento em uma página | 01–02 |
| 01 | o que os dados dizem sobre o centro | 03–07 |
| 02 | quem compra e o que o centro vende | 08–12 |
| 03 | a tese (diagnóstico + manifesto) | 13–16 |
| 04 | o clube, já funcionando | 17–20 |
| 05 | o negócio (retorno, projeção, o dado) | 21–24 |
| 06 | **a entidade dentro do clube** — o pedido | 25–28 |
| — | fecho | 29 |

### 🎯 Para que serve o documento

Pedir **patrocínio institucional**: a entidade entra com a marca dela no app e na
campanha. **Não se pede dinheiro** — em nenhum slide, em nenhum momento.

🔴 A versão anterior fechava com *"Não queremos patrocínio. Queremos acesso e
medição conjunta."* Essa frase passou a dizer o contrário do pedido e foi
substituída por **"Não queremos verba. Queremos a marca de vocês junto."** Se
alguém reabrir um PDF antigo, é essa a diferença.

O pedido é **anunciado no slide 02** (bloco 04, com as palavras "sem desembolso")
e **defendido no capítulo 06**. Pedir só no fim emboscaria a entidade; pedir no
começo faria ela avaliar a proposta antes de ouvir o argumento.

🔴 **A objeção real não é preço, é risco de marca.** O logo da entidade no app
significa que ela responde por ele. O slide 28 entrega a resposta pronta: contrato
obriga a loja a honrar, a entidade pode remover qualquer loja sem justificar,
reclamação entra no relatório junto com os resultados, e **saída sem ônus em 48h**.
Oferecer a saída é o que faz entrar.

🔴 **Realização compartilhada, nunca exclusiva.** Com ACIL e Sincoval na mesa, se a
primeira travar exclusividade a segunda não entra nunca. Está escrito no slide 28.

🔴 **Pedir marca muda quem decide.** Acesso o superintendente resolve na sala;
chancela vai para a diretoria. O capítulo 06 vai ser **encaminhado sem você junto**
— por isso ele se sustenta sozinho, com contrapartida e garantias escritas.

⚠️ **Regra que não pode ser quebrada: os números do app são fictícios.** Os resgates
e a economia do piloto foram semeados para a demonstração não abrir vazia. Nunca
apresentar como resultado. **Nenhum número do piloto entra no deck.**

### As fontes externas, todas públicas

Toda afirmação com número tem a fonte impressa no próprio slide. São três estudos
e um anuário:

| Fonte | O que sustenta |
|---|---|
| **Comportamento de Consumo no Varejo** — ACIL + Sebrae/PR, executada pela Litz. 400 entrevistados de 18 a 60 anos, coleta de 7 a 28/04/2025, apresentada no Mercado em Foco em 13/06/2025 | canal de compra por categoria (slide 05), deslocamento por zona (07), perfil do consumidor (09), penetração por segmento (10) |
| **Como Londrina Compra — Tendências Reais do Varejo 2025** — Sebrae/PR, ACIL e Litz, 03/12/2025 | confirma os recortes por categoria da pesquisa acima |
| **Pesquisa de Natal 2025** — ACIL, coleta de 3 a 5/12/2025, com gestores do comércio | composição e porte do comércio (10), gargalo de mídia do lojista (12), 46% sobre horário especial (14) |
| **Perfil de Londrina 2024** (ano-base 2023), tabela 5.1.5 — PML / Secretaria de Fazenda | queda de 1.458 estabelecimentos (04) |

🔴 **Dois cuidados que a reunião vai cobrar:**

- **A soma de cada linha do slide 05 passa de 100%** porque o entrevistado podia
  marcar mais de um canal. Está escrito na nota do slide — não deixar passar como
  erro.
- **A pesquisa só publicou as zonas norte e sul.** Leste, oeste e centro não saíram.
  O slide 07 diz isso.
- **67,8% como "a região central é o principal polo de consumo" ficou de fora.** A
  notícia da ACIL repete exatamente o mesmo número do Instagram no mesmo parágrafo,
  e a cobertura da Taroba sobre a mesma pesquisa não traz esse dado. Cheira a erro
  de publicação. Se a ACIL confirmar na pesquisa completa, é o número de abertura
  do deck.

### O argumento, em quatro passos

É a espinha do deck e a ordem em que se fala:

1. **O presencial continua de pé.** 93,5% do londrinense compra pessoalmente. O
   comércio de rua não foi derrubado pela internet.
2. **Mas a cidade não sai do bairro.** Na zona norte, a mais populosa, 85,4%
   consomem dentro da própria região — só **14,6%** se deslocam. A zona sul prova
   que o deslocamento acontece quando há motivo: 57,8% já compram fora.
3. **E na categoria do centro, o shopping ganha.** Vestuário: shopping 62,0% contra
   34,7% do comércio de rua do centro. **27 pontos.** Em eletrodoméstico, porém, o
   centro (29,0%) já passa o shopping (24,0%) — o problema não é o endereço, é o
   motivo.
4. **O shopping não ganha por ar-condicionado. Ganha porque é um programa.** Motivo
   o ano inteiro, calendário único, fidelidade e fluxo medido. O centro tem mais
   lojas e nenhum programa comum. É esse vazio que o Club43 ocupa.

O **manifesto** (slide 16) é o fecho do argumento, não enfeite: *"O centro de
Londrina não está morrendo. Está sem convite."*

### Projeção

Slide 23, com selo **"não é resultado medido"** e as premissas à vista: 40 lojas,
2 cupons por assinante/mês, ticket R$ 120, economia média R$ 40. O cenário base
(2.000 assinantes) é 0,34% da população da cidade — a referência de tamanho está
no slide para a projeção não parecer otimismo.

### Cor de dado ≠ cor de marca

Os gráficos usam uma família azul só (`--d1` a `--d4`) com **amarelo como destaque**,
nunca as cores do logo: o navy `#052A52` é escuro demais para empilhar e o verde
`#70C134` não alcança contraste sobre branco. O amarelo marca sempre a mesma coisa —
**o centro** — em todos os gráficos do deck.

## Fotografia

### A regra editorial (não negociável)

**LUGAR só com foto real de Londrina. PESSOA só em recorte onde a cidade não
é identificável.** Uma foto de rua estrangeira passando por "centro de Londrina"
numa sala com a ACIL derruba a apresentação inteira.

🔴 **Quase aconteceu:** o arquivo `Cena londrina.jpg` do Wikimedia Commons é
**Covent Garden, em Londres** — "londrina" ali é adjetivo, não a cidade. Estava a
um passo de virar capa. Conferir o conteúdo de toda foto, nunca o nome do arquivo.

### O que está no deck

| Arquivo | Divisor | O que mostra |
|---|---|---|
| `foto-centro-londrina.jpg` | capa · manifesto · 06 | Catedral Metropolitana + skyline do centro |
| `p-movimento.jpg` | 01 — os dados | pessoas atravessando uma rua de comércio |
| `p-consumidora.jpg` | 02 — quem compra | mulher com sacola **e celular na mão** (o gesto do app) |
| `p-sacolas.jpg` | 03 — a tese | consumidora saindo com as compras |
| `p-amigas.jpg` | 04 — o clube | três mulheres com sacolas, juntas |
| `p-lojista.jpg` | 05 — o negócio | **comerciante atendendo pela arara** |

**Origem:** a Catedral é da Arquidiocese de Londrina, CC BY-SA 4.0, via Wikimedia
Commons — creditada no **slide 29**. As cinco de pessoas vêm do banco
**Freepik/Magnific** sob licença comercial do plano Premium+, que dispensa
atribuição (o crédito no slide 29 fica por transparência, não por obrigação).

🔴 **Por que trocamos as fotos de pessoas (26/10):** as anteriores eram CC0 do
StockSnap e liam como europeias/americanas. Num pitch sobre o centro de Londrina
isso enfraquece. As novas são mais diversas e latinas — e uma delas resolveu um
buraco de conteúdo: **não havia nenhuma imagem de lojista no deck**, e o lojista
é metade do público.

### Como achar e recortar foto nova (MCP do Magnific)

1. `stock_search` com `content_type: photo`, `orientation: portrait`,
   `ai_generated: excluded`. 🔴 Busca por texto **não** filtra etnia — monte uma
   folha de contato com as `previewUrl` (são públicas e de graça) e **olhe**.
2. `stock_download` devolve URL assinada que **expira em minutos**: baixe na hora.
   Custa 40 créditos (free) ou 150 (premium) por imagem.
3. Recorte para **730×760** com o `crop.js` do passo a passo abaixo.

🔴 **`sips -c` corta pelo CENTRO e ignora `--cropOffset`.** Em foto de corpo
inteiro isso decapita. O recorte com deslocamento (topo em 13% da altura) é feito
em BMP por código próprio — o script fica no histórico deste commit.

🔴 **A capa pede troca.** A foto da Catedral é boa e é Londrina de verdade, mas o
acervo livre do calçadão é fraco — o que existe no Commons é obra de
repavimentação e fachada de farmácia. Uma foto própria do calçadão com gente
substitui a capa em um comando: basta salvar por cima de `foto-centro-londrina.jpg`
mantendo proporção 16:9 e rodar o `build.sh`.

### Peso do PDF: a armadilha que custou 10 MB

🔴 **`filter: blur()` e `filter: saturate()` obrigam o Chrome a rasterizar a camada
inteira.** Os dois borrões decorativos dos slides escuros viravam **doze bitmaps de
2162×2252 dentro do PDF — 7 MB só eles**. Com `radial-gradient` no lugar do
`blur()`, o efeito é o mesmo e o custo é zero: o PDF caiu de **17 MB para 3,5 MB**.

Para descobrir onde o peso está, somar os `/Subtype /Image` do PDF por dimensão —
o `README` do commit traz o script. Vale sempre que o arquivo inchar sem motivo.

🔴 **Banda de foto como elemento deixa uma linha vertical de 1px** na emenda: o
Chrome compõe a camada à parte e o arredondamento aparece. A foto do divisor é
`background` da própria seção (`--foto` + `background-size:54% 100%`), com o
degradê no mesmo `background` — assim não existe borda para emendar.

## Refazer as capturas do app

Entrar no app, tirar o screenshot e **recortar pelo canto superior esquerdo**.
🔴 `sips -c` recorta pelo CENTRO e ignora `--cropOffset` — isso comeu 84px da
esquerda de cada tela na primeira tentativa, e só apareceu quando o mockup ficou
pronto. Conferir sempre o resultado, não confiar no comando.

## Conferir o layout antes de gerar o PDF

Nenhum slide pode estourar os 720px. O jeito rápido: subir a pasta num servidor
local, abrir a `.src` e medir o `.in` de cada `section`:

```js
document.querySelectorAll('section.s').forEach((s,i)=>{
  const inn=s.querySelector('.in'); const d=inn.scrollHeight-inn.clientHeight;
  if(d>0) console.log('slide',i+1,'estoura',d,'px');
});
```

🔴 Medir pelo `getBoundingClientRect` de todos os filhos dá falso positivo: os
borrões `.br` dos slides escuros passam 200px do limite **de propósito** e ficam
escondidos pelo `overflow:hidden`.

## Pendente

**Quanto vale o contrato do lojista.** Sem esse número não existe a condição de
convênio, que é o que a entidade leva para a base dela.
