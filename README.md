# Blog da Família UniVersos

Site: https://luci0camarg0.github.io/familia-universos/

Blog estático (Jekyll no GitHub Pages) com notícias do radar de shows, agenda editável, anexos (PDF/Word) e beats.

## Como o blog salva as coisas

O site não tem servidor. Quem entra na "Área do grupo" cola uma chave do GitHub (fine-grained token, só este repositório, Contents: Read and write). O navegador grava direto no repositório pela API do GitHub, num único commit por ação, e o GitHub Pages republica.

| O quê | Arquivo de dados | Onde ficam os arquivos |
|---|---|---|
| Agenda | `dados/agenda.json` | — |
| Anexos | `dados/anexos.json` | `arquivos/anexos/` |
| Beats | `dados/beats.json` | `arquivos/beats/` |

Código: `assets/js/github.js` (chave, API e commit), `assets/js/agenda.js`, `assets/js/arquivos.js`.

## Como publicar uma notícia (pesquisa diária de shows)

Ver [COMO-PUBLICAR.md](COMO-PUBLICAR.md).
