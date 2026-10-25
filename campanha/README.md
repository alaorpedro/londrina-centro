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

**Vinte e seis slides, sem citar entidade nenhuma** — serve para a ACIL, para o
Sincoval ou para qualquer outra. Cinco capítulos com divisor:

| | Capítulo | Slides |
|---|---|---|
| — | capa + o argumento em uma página | 01–02 |
| 01 | o que os dados dizem sobre o centro | 03–07 |
| 02 | quem compra e o que o centro vende | 08–12 |
| 03 | a tese (diagnóstico + manifesto) | 13–16 |
| 04 | o clube, já funcionando | 17–20 |
| 05 | o negócio (retorno, projeção, proposta) | 21–26 |

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
