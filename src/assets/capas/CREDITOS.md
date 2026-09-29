# Créditos das fotografias de capa

Todas as fotos vêm do [Unsplash](https://unsplash.com) sob a
[Unsplash License](https://unsplash.com/license), que permite uso comercial e
não exige atribuição. Registramos autoria mesmo assim: é o certo a fazer com o
trabalho de quem fotografou, e é material de referência do TCC.

Os arquivos foram recortados em 3:2, redimensionados para 640 px e 1280 px de
largura e convertidos em WebP. Os originais não estão no repositório.

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
| `outros-*.webp` | Outros | Bryan Dijkhuizen | <https://unsplash.com/photos/SkSIE4uZl2Y> |
| `generica-*.webp` | fallback | Claudia Raya | <https://unsplash.com/photos/1VOx-Ffbd9w> |

## Critério de curadoria

O que foi recusado, e por quê:

- **Nenhum rosto identificável.** Regra dura, não preferência. Nem a Unsplash
  nem a Pexels dão *model release*: a licença cobre a foto, não o direito de
  imagem de quem aparece nela. Pessoa reconhecível ilustrando uma plataforma de
  doação sugere que ela endossa o serviço, e as duas licenças restringem
  exatamente esse uso. Onde há gente — `alimentos` e `roupas` — aparecem só
  mãos e tronco, com o rosto fora do quadro.
- **Nada de exploração da vulnerabilidade.** Criança pobre encarando a câmera,
  mão estendida pedindo. É o *poverty porn*: antiético, além de datado. O
  recorte é sempre a ação (mãos separando, roupa dobrada, caixa sendo
  organizada), nunca a carência.
- **Nada de banco de imagem encenado.** Foi recusada uma pilha de resultados de
  "voluntários diversos sorrindo em fundo branco de estúdio", colete escrito
  VOLUNTEER e aperto de mão. Lê como propaganda, e o produto vende confiança.
- **Nada de máscara cirúrgica.** Boa parte do acervo de "doação" é de 2020 e
  data a interface na hora.
- **Paleta.** O sistema é azul-petróleo `hsl(200 80% 30%)` com laranja
  `hsl(25 95% 38%)`. Foto dominada por verde-limão ou magenta briga com isso e
  foi descartada — daí a recusa de uma manta verde-limão em `inverno` e de
  sabonetes magenta em `higiene`. O conjunto final fica em madeira, neutros
  quentes e azuis, e lê como um sistema só.

## Ressalva conhecida

Em `alimentos-*.webp` aparece um rótulo de sopa Campbell's no centro do quadro.
É marca estrangeira num produto brasileiro e a licença não cobre marca
registrada. O uso é incidental e decorativo, e o véu escuro da `Capa` reduz a
leitura do rótulo, mas se aparecer foto melhor de separação de alimentos com
mãos e sem rosto, vale trocar.

## Como refazer

Recorte, redimensionamento e codificação:

```sh
cwebp -m 6 -sharp_yuv -pass 10 -size 78000 -resize 1280 854 origem.png -o saida-1280.webp
cwebp -m 6 -sharp_yuv -pass 10 -size 45000 -resize  640 427 origem.png -o saida-640.webp
```

O `-size` busca a qualidade binariamente até bater o alvo em bytes, que é o que
mantém todo arquivo abaixo de 80 KB mesmo nas fotos de textura pesada (tricô,
lápis), onde qualidade fixa estourava o teto.
