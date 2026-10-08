/*
  A marca em SVG, vetorizada do arquivo original — não um "Club43" redigitado
  numa fonte parecida do Google. Isso importa: wordmark re-tipografado vira
  sósia, e numa apresentação a diferença aparece.

  Três variantes, porque uma só não serve:

    Logo            compacta, branca  → sobre o navy da marca
    LogoEscura      compacta, navy    → sobre fundo claro
    LogoCompleta    lockup inteiro    → só onde cabe grande

  A COMPLETA traz o slogan "mais para você / mais para Londrina", que vira
  borrão abaixo de ~140px de largura. Por isso o padrão nas barras é a compacta,
  com o slogan dito em texto de verdade ao lado — legível e selecionável.

  Os arquivos ficam em /public e são servidos como imagem, fora do bundle: o
  navegador guarda em cache separado e o JS não engorda com 23 KB de curva.
*/

type Props = { className?: string }

const COMPACTA = { w: 1129, h: 734 }
const COMPLETA = { w: 1254, h: 1254 }

export function Logo({ className = 'h-14 w-auto' }: Props) {
  return (
    <img
      src="/club43-compacto-branco.svg"
      alt="Club43 de Vantagens"
      className={className}
      width={COMPACTA.w}
      height={COMPACTA.h}
    />
  )
}

export function LogoEscura({ className = 'h-14 w-auto' }: Props) {
  return (
    <img
      src="/club43-compacto.svg"
      alt="Club43 de Vantagens"
      className={className}
      width={COMPACTA.w}
      height={COMPACTA.h}
    />
  )
}

export function LogoCompleta({ className = 'h-40 w-auto' }: Props) {
  return (
    <img
      src="/club43.svg"
      alt="Club43 de Vantagens — mais para você, mais para Londrina"
      className={className}
      width={COMPLETA.w}
      height={COMPLETA.h}
    />
  )
}

/** Só o símbolo: o "43" em quadrado navy, para cantos apertados. */
export function LogoMarca({ className = 'h-10 w-10' }: Props) {
  return <img src="/icone.svg" alt="Club43" className={className} width={512} height={512} />
}
