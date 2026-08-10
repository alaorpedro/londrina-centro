/*
  ─────────────────────────────────────────────────────────────
  PANORAMA DO CENTRO DE LONDRINA
  ─────────────────────────────────────────────────────────────

  Ilustração original, desenhada em SVG. Não é fotografia.

  Por que ilustrada e não uma foto:

  1. Direito de imagem. Foto de banco exigiria licença e crédito, e foto de
     terceiro na internet não é nossa para usar. Desenho é obra própria.
  2. Peso. O topo do app é a primeira coisa que carrega no 4G do calçadão. Este
     panorama inteiro custa menos de 2 KB e é vetorial — não borra em tela
     retina nem em tablet.
  3. Identidade. Uma foto genérica de prédios poderia ser qualquer cidade. Aqui
     os dois elementos que fazem alguém dizer "isso é Londrina" estão
     desenhados de propósito:
       · a CATEDRAL METROPOLITANA, com a silhueta cônica modernista que não se
         confunde com nenhuma outra catedral do país
       · os IPÊS, roxo e amarelo — Londrina é a cidade dos ipês, e é dessa dupla
         que sai a paleta da marca do clube

  Se o cliente trouxer uma foto licenciada do centro depois, ela entra no lugar
  deste componente sem mexer em mais nada: o `PanoramaCentro` é só o conteúdo do
  bloco, o resto do cabeçalho não muda.
*/

export function PanoramaCentro({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 150"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        {/* a cidade dissolve para cima, para o texto do cabeçalho respirar */}
        <linearGradient id="pan-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="pan-mask">
          <rect width="400" height="150" fill="url(#pan-fade)" />
        </mask>
      </defs>

      <g mask="url(#pan-mask)">
        {/* ---------- plano de fundo: a cidade que continua ---------- */}
        <g fill="#fff" opacity="0.17">
          <rect x="6" y="86" width="26" height="64" />
          <rect x="36" y="72" width="18" height="78" />
          <rect x="58" y="92" width="30" height="58" />
          <rect x="150" y="80" width="22" height="70" />
          <rect x="176" y="94" width="16" height="56" />
          <rect x="286" y="76" width="20" height="74" />
          <rect x="310" y="88" width="28" height="62" />
          <rect x="342" y="70" width="16" height="80" />
          <rect x="362" y="90" width="32" height="60" />
        </g>

        {/* ---------- plano médio: quadras do calçadão ---------- */}
        <g opacity="0.32">
          <g fill="#fff">
            <rect x="0" y="104" width="34" height="46" />
            <rect x="38" y="96" width="24" height="54" />
            <rect x="66" y="110" width="30" height="40" />
            <rect x="196" y="100" width="26" height="50" />
            <rect x="226" y="112" width="22" height="38" />
            <rect x="252" y="94" width="28" height="56" />
            <rect x="284" y="108" width="24" height="42" />
            <rect x="330" y="102" width="26" height="48" />
            <rect x="360" y="114" width="40" height="36" />
          </g>
          {/* janelas: pontilhado esparso, só para dar textura de prédio */}
          <g fill="#4a1a94" opacity="0.5">
            {[
              [6, 112], [16, 112], [26, 112], [6, 124], [16, 124], [26, 124],
              [44, 104], [54, 104], [44, 116], [54, 116], [44, 128], [54, 128],
              [72, 118], [82, 118], [72, 130], [82, 130],
              [202, 108], [212, 108], [202, 120], [212, 120], [202, 132], [212, 132],
              [232, 120], [240, 120], [232, 132], [240, 132],
              [258, 102], [268, 102], [258, 114], [268, 114], [258, 126], [268, 126],
              [290, 116], [300, 116], [290, 128], [300, 128],
              [336, 110], [346, 110], [336, 122], [346, 122],
              [366, 122], [376, 122], [386, 122],
            ].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width="5" height="7" rx="0.8" />
            ))}
          </g>
        </g>

        {/*
          ---------- a Catedral Metropolitana ----------
          O casco cônico com as nervuras verticais e a cruz no ápice. É a peça
          que faz o desenho ser Londrina e não uma cidade qualquer, então fica
          no centro óptico e com a maior opacidade do conjunto.
        */}
        <g opacity="0.55">
          <path
            d="M104 150 C 106 118, 118 78, 138 44 C 158 78, 170 118, 172 150 Z"
            fill="#fff"
          />
          <g stroke="#4a1a94" strokeWidth="0.9" opacity="0.32">
            <path d="M138 48 V150" />
            <path d="M126 62 C 122 92, 118 122, 117 150" />
            <path d="M150 62 C 154 92, 158 122, 159 150" />
            <path d="M114 84 C 111 106, 109 128, 108.5 150" />
            <path d="M162 84 C 165 106, 167 128, 167.5 150" />
          </g>
          {/* cruz do ápice */}
          <g fill="#fff">
            <rect x="136.6" y="24" width="2.8" height="22" rx="1.2" />
            <rect x="131" y="30" width="14" height="2.8" rx="1.2" />
          </g>
        </g>

        {/* ---------- torre alta, para quebrar a linha do horizonte ---------- */}
        <g opacity="0.38">
          <rect x="322" y="58" width="14" height="92" fill="#fff" />
          <rect x="327.4" y="46" width="3.2" height="14" rx="1.4" fill="#fff" />
        </g>

        {/*
          ---------- os ipês ----------
          Roxo e amarelo, as duas cores da marca. Ficam no primeiro plano e são
          os únicos elementos coloridos: é neles que o olho pousa.
        */}
        <g>
          {/* ipê-roxo, à esquerda */}
          <g opacity="0.85">
            <path d="M62 150 V126" stroke="#4a1a94" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <g fill="#c2aeff">
              <circle cx="62" cy="120" r="15" opacity="0.9" />
              <circle cx="50" cy="126" r="10" opacity="0.75" />
              <circle cx="74" cy="127" r="9" opacity="0.75" />
              <circle cx="62" cy="110" r="9" opacity="0.6" />
            </g>
          </g>

          {/* ipê-amarelo, à direita — o acento da marca */}
          <g opacity="0.9">
            <path d="M242 150 V128" stroke="#4a1a94" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <g fill="#f5b301">
              <circle cx="242" cy="122" r="14" opacity="0.92" />
              <circle cx="231" cy="128" r="9" opacity="0.78" />
              <circle cx="253" cy="129" r="8" opacity="0.78" />
              <circle cx="242" cy="113" r="8" opacity="0.62" />
            </g>
          </g>

          {/* ipê-roxo menor, lá no fim da rua */}
          <g opacity="0.5">
            <path d="M352 150 V136" stroke="#4a1a94" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            <g fill="#c2aeff">
              <circle cx="352" cy="132" r="9" opacity="0.85" />
              <circle cx="345" cy="137" r="6" opacity="0.7" />
              <circle cx="359" cy="137" r="5.5" opacity="0.7" />
            </g>
          </g>
        </g>

        {/* ---------- calçada ---------- */}
        <rect x="0" y="146" width="400" height="4" fill="#fff" opacity="0.22" />
      </g>
    </svg>
  )
}
