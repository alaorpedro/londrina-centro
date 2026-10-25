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

Catorze slides, **sem citar entidade nenhuma** — serve para qualquer uma.
Três capítulos com divisor: o problema, a solução, o negócio.

⚠️ **Regra que não pode ser quebrada: os números do app são fictícios.** Os resgates
e a economia do piloto foram semeados para a demonstração não abrir vazia. Nunca
apresentar como resultado.

As três camadas, cada uma rotulada na tela:

1. **Dado real** — Perfil de Londrina 2024 (Prefeitura), tabela 5.1.5. O varejo caiu
   de 10.075 (2018) para 8.617 (2022), −1.458 unidades.
   🔴 O salto para 10.518 em 2023 aparece em TODAS as atividades e o total do
   município sobe 15% no mesmo ano — é atualização cadastral, não crescimento.
   Por isso a série do gráfico para em 2022.
2. **O piloto** — mockups são capturas reais do app no ar. O slide 14 propõe gerar e
   validar um cupom ao vivo na sala. É o que ganha a reunião.
3. **Projeção** — com selo "não é resultado medido" e as premissas à vista: 40 lojas,
   2 cupons por assinante/mês, ticket R$ 120, economia média R$ 40.

## Refazer as capturas do app

Entrar no app, tirar o screenshot e **recortar pelo canto superior esquerdo**.
🔴 `sips -c` recorta pelo CENTRO e ignora `--cropOffset` — isso comeu 84px da
esquerda de cada tela na primeira tentativa, e só apareceu quando o mockup ficou
pronto. Conferir sempre o resultado, não confiar no comando.

## Pendente

**Quanto vale o contrato do lojista.** Sem esse número não existe a condição de
convênio, que é o que a entidade leva para a base dela.
