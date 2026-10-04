# Referência visual

Implementação baseada no [frame 1:2 do Figma](https://www.figma.com/design/uWM4FrZcCvqiG3LWbOIcO9/Sem-t%C3%ADtulo?node-id=1-2), acessado pela conta conectada `swap`.

Os 27 SVGs dos estados e os ícones de indicação, origem e busca foram baixados para `public/design`. Os arquivos originais permanecem intactos. `src/data/map-geometry.ts` registra as posições e rótulos do frame de 960 × 760; `asset-dimensions.json` registra suas dimensões intrínsecas.

O mapa externo é um SVG interativo que compõe os assets locais com transforms. Filtros SVG aplicam as cores dos resultados e o destaque de seleção sem reescrever os vetores originais. O mapa é esquemático, conforme o design, e não serve como limite geográfico oficial.

Geist e JetBrains Mono são servidas localmente. Fundo, dimensões, controles, resumo e legenda seguem o frame. Os textos “TSE Oficial” e “AO VIVO” são substituídos por indicação de demonstração no modo mock. O painel aparece ao selecionar uma UF e se adapta para um painel inferior no celular; a busca permite selecionar também estados pequenos.
