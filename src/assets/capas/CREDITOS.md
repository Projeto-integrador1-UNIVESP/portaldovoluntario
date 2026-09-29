# Créditos das fotografias

Todas as fotos vêm do [Unsplash](https://unsplash.com) sob a
[Unsplash License](https://unsplash.com/license), que permite uso comercial e
não exige atribuição. Registramos autoria mesmo assim: é o certo a fazer com o
trabalho de quem fotografou, e é material de referência do TCC.

Os originais não estão no repositório. Só entram fotos gratuitas: resultado
marcado como Unsplash+ (`premium: true`, autoria "Getty Images" ou "Curated
Lifestyle", marca d'água no arquivo) tem licença paga e foi recusado na hora.

## Fotografias editoriais (`src/assets/fotos/`, consumidas por `src/lib/fotos.ts`)

Recortadas na proporção da tela, em 640, 1280 e 1920 px de largura, WebP.

| Arquivo | Cena (`FOTOS.*`) | Proporção | Autoria | Origem |
| --- | --- | --- | --- | --- |
| `hero-*.webp` | `hero` | 3:2 | Sandie Clarke | <https://unsplash.com/photos/hands-planting-seedlings-in-garden-soil-q13Zq1Jufks> |
| `hero-secundaria-*.webp` | `heroSecundaria` | 1:1 | Nellie Adamyan | <https://unsplash.com/photos/a-pile-of-folded-towels-sitting-on-top-of-a-bed-wH_avVRSuJM> |
| `voluntariado-*.webp` | `voluntariado` | 21:9 | Alex Diaz | <https://unsplash.com/photos/a-group-of-people-standing-around-a-table-filled-with-plants-2S1JhFhhSi4> |
| `auth-*.webp` | `auth` | 4:5 | Elio Santos | <https://unsplash.com/photos/hands-sewing-white-fabric-5ZQn_gWKvLE> |
| `sobre-*.webp` | `sobre` | 3:2 | Subhayan Das | <https://unsplash.com/photos/person-holding-bread-on-bowl-at-daytime-GPoJezGXMp4> |
| `como-funciona-*.webp` | `comoFunciona` | 3:2 | Erik Mclean | <https://unsplash.com/photos/person-holding-white-blue-and-red-plaid-textile-QJ3g4T8Cxu4> |
| `obrigado-*.webp` | `obrigado` | 3:2 | Gustavo Sánchez | <https://unsplash.com/photos/a-person-cutting-a-loaf-of-bread-on-a-cutting-board-bMuzlborr0M> |

A foto do hero também aparece na `public/og-image.jpg`.

## Capas de causa (`src/assets/capas/`, mapeadas em `src/lib/capasPorCausa.ts`)

Recortadas em 3:2, em 640 px e 1280 px de largura, WebP.

| Arquivo | Categoria | Autoria | Origem |
| --- | --- | --- | --- |
| `alimentos-*.webp` | Alimentos | Joel Muniz | <https://unsplash.com/photos/3k3l2brxmwQ> |
| `roupas-*.webp` | Roupas e calçados | Maude Frédérique Lavoie | <https://unsplash.com/photos/person-holding-stack-of-denim-jeans-EDSTj4kCUcw> |
| `higiene-*.webp` | Higiene e limpeza | Sophie (@sophiebarrowauthor) | <https://unsplash.com/photos/a-collection-of-personal-care-products-arranged-on-a-white-surface-o-QHS4pQWtY> |
| `inverno-*.webp` | Inverno | Jordan Bigelow (@jordanbigs) | <https://unsplash.com/photos/white-and-blue-knit-textile-53BjYSxca5g> |
| `escolar-*.webp` | Material escolar | Laura Rivera | <https://unsplash.com/photos/assorted-color-pencils-in-yellow-bucket-ArH3dtoDQc0> |
| `brinquedos-*.webp` | Brinquedos | Susan Holt Simpson (@shs521) | <https://unsplash.com/photos/brown-wooden-toy-blocks-GQ327RPuxhI> |
| `moveis-*.webp` | Móveis e utensílios | Dane Deaner | <https://unsplash.com/photos/cookware-set-on-floating-shelves-d9qnD33cBJs> |
| `medicamentos-*.webp` | Medicamentos | Mathurin NAPOLY / matnapo | <https://unsplash.com/photos/open-red-medical-bag-with-supplies-MaKsx8JNbiI> |
| `animais-*.webp` | Animais | Iryna Ukrainets | <https://unsplash.com/photos/happy-puppy-looks-up-while-being-petted-2fEDu3NArbw> |
| `idosos-*.webp` | Pessoas idosas | Trương Tuyết Ly | <https://unsplash.com/photos/close-up-of-elderly-hands-resting-on-a-blue-fabric-P1AGAowPnXc> |
| `outros-*.webp` | Outros | Bryan Dijkhuizen | <https://unsplash.com/photos/SkSIE4uZl2Y> |
| `generica-*.webp` | fallback | Claudia Raya | <https://unsplash.com/photos/1VOx-Ffbd9w> |

## Critério de curadoria

O que foi recusado, e por quê:

- **Nenhum rosto identificável.** Regra dura, não preferência. Nem a Unsplash
  nem a Pexels dão *model release*: a licença cobre a foto, não o direito de
  imagem de quem aparece nela. Pessoa reconhecível ilustrando uma plataforma de
  doação sugere que ela endossa o serviço, e as duas licenças restringem
  exatamente esse uso. Onde há gente aparecem só mãos, braços e tronco, com o
  rosto fora do quadro. Foi por isso que caiu quase toda a busca por
  "volunteers": grupo de voluntários em volta da mesa (`0slSvn3OhFU`,
  `jgm-LddkD88`), gente empacotando em galpão (`9bvNiSWZvXw`), gente de
  costas mas com perfil visível (`hvgirpoLLm8`, `fb2SOuPr9o8`). Em `animais`
  o rosto que aparece é o do cachorro: a mão humana entra só até o pulso.
- **Nada de exploração da vulnerabilidade.** Criança pobre encarando a câmera,
  mão estendida pedindo, e a versão animal disso: cão atrás das grades olhando
  fixo para a lente (`QSoYOsSiiQA`, `2fEDu3NArbw` foi escolhida justamente por
  ser o contrário, um filhote sendo acariciado através da grade). O recorte é
  sempre a ação (mãos plantando, entregando, costurando, servindo), nunca a
  carência. Em `idosos`, mãos em repouso sobre tecido, não mãos apoiadas em
  bengala (`6W1voPFLfrc`, `WlZLCAf_x4U`).
- **Nada de banco de imagem encenado.** Recusada a família sorrindo com caixa
  de mudança em estúdio (`RLaaGzDN-xE`, `k9_AOod2Mj0` e mais seis da mesma
  sessão), colete escrito VOLUNTEERS (`qKVSEuBT5EY`), aperto de mão e coração
  feito com os dedos. Lê como propaganda, e o produto vende confiança.
- **Nada de máscara cirúrgica.** Boa parte do acervo de "doação" é de 2020 e
  data a interface na hora (`Cns0h4ypRyA`, `A4Ax1ApccfA`, `bs-_YaiWSZs`).
- **Paleta.** O sistema é papel creme, marinho `hsl(214 52% 23%)` e terracota
  `hsl(14 65% 44%)`. Foto dominada por verde-limão, magenta ou vermelho
  saturado briga com isso e foi descartada: manta verde-limão em cobertores
  (`CNjfgzoY8JU`), tigela de tomates (`-UOm2fv1fG8`), mesa de costura rosa
  (`ZgMMjAR9b20`). O conjunto final fica em madeira, tricô cru e terracota,
  neutros quentes e um azul-marinho de tecido, e lê como um sistema só.
- **Sem marca registrada no centro do quadro.** A licença não cobre marca; o
  rótulo Campbell's de `alimentos-*.webp` é incidental e o véu da `Capa`
  reduz a leitura, mas se aparecer foto melhor de separação de alimentos com
  mãos e sem rosto, vale trocar.

## Como refazer

Recorte com PIL na proporção da cena (centro, ou foco deslocado quando as mãos
estão fora do centro) e codificação com `cwebp`, buscando o alvo em bytes:

```sh
# fotos editoriais (três larguras)
cwebp -m 6 -sharp_yuv -pass 10 -size 40000  -resize  640  427 origem.png -o saida-640.webp
cwebp -m 6 -sharp_yuv -pass 10 -size 85000  -resize 1280  853 origem.png -o saida-1280.webp
cwebp -m 6 -sharp_yuv -pass 10 -size 150000 -resize 1920 1280 origem.png -o saida-1920.webp
# capas (duas larguras)
cwebp -m 6 -sharp_yuv -pass 10 -size 78000 -resize 1280 854 origem.png -o saida-1280.webp
cwebp -m 6 -sharp_yuv -pass 10 -size 45000 -resize  640 427 origem.png -o saida-640.webp
```

O `-size` busca a qualidade binariamente até bater o alvo em bytes, que é o que
mantém todo arquivo abaixo do teto mesmo nas fotos de textura pesada (tricô,
terra, lápis), onde qualidade fixa estourava.
