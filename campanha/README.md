# Campanha Club43

## Mote

**"Club43, tem tudo no centro!"** — a marca dentro da frase, para ninguém repetir a
linha sem dizer o nome.

Declina por loja: *Tem café no centro* · *Tem sapato no centro* · *Tem beleza no
centro*. Uma fórmula, quarenta peças. O guarda-chuva vira prova: o "tudo" é a soma
das lojas.

Fecha sempre com: **"E agora tem desconto. R$ 99,90 o ano."**

## Arquivos

| Arquivo | O que é |
|---|---|
| `apresentacao.html` | deck institucional, autocontido (logo embutido em data URI) |
| `club43-apresentacao.pdf` | o mesmo, pronto para levar à reunião |
| `selo-preview.html` | estudo do adesivo de vitrine |

## A apresentação

Serve para **qualquer entidade** — nenhuma é citada pelo nome. Dez slides.

⚠️ **Regra que não pode ser quebrada: os números do app são fictícios.** Os 268
resgates e os R$ 15 mil de economia do piloto foram semeados por mim para a
demonstração não abrir vazia. Nunca apresentar como resultado.

A apresentação separa três camadas, e cada uma está rotulada:

1. **Dado real** — Perfil de Londrina 2024 (Prefeitura), tabela 5.1.5. O varejo caiu
   de 10.075 (2018) para 8.617 (2022), −1.458 unidades.
   🔴 O salto para 10.518 em 2023 aparece em TODAS as atividades e o total do
   município sobe 15% no mesmo ano — é atualização cadastral, não crescimento.
   Apresentar como recuperação perde a sala se alguém souber.
2. **O piloto** — mostrado como protótipo funcionando, que é verdade. O slide 10
   propõe gerar e validar um cupom ao vivo. É o que ganha a reunião.
3. **Projeção** — rotulada na tela, com as premissas à vista: 40 lojas, 2 cupons por
   assinante/mês, ticket R$ 120, economia média R$ 40.

## Refazer o PDF

```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=club43-apresentacao.pdf \
  "file://$PWD/apresentacao.html"
```

## Pendente

**Quanto vale o contrato do lojista.** Sem esse número não existe a condição de
convênio, que é o que a entidade leva para a base dela. A apresentação está pronta
menos esse slide.
