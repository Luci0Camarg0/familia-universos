# Como publicar uma notícia do radar de shows

Cada notícia é um arquivo Markdown em `_posts/`, com nome `AAAA-MM-DD-titulo-em-slug.md`.

## Regras

1. **Só publique quando houver novidade** em relação ao que já está no blog (evento novo, data confirmada, chamada/edital aberto, contato novo). Sem novidade, não publique nada.
2. **Data e hora no passado.** O GitHub Pages não publica posts com data futura. Use a hora da pesquisa com fuso `-0300`.
3. **Categoria** é uma destas: `Agenda`, `Festivais`, `Espaços`, `Contatos`, `Editais`.
4. Texto em português, tom de notícia: primeiro parágrafo diz o que aconteceu; depois os detalhes; no fim, um bloco "Próximo passo" para o grupo.
5. Grafia oficial: **Família UniVersos**. Não citar Thierry como integrante.
6. Listar as fontes (URLs públicas) no campo `fontes`.
7. Tabelas largas vão dentro de `<div class="tabela" markdown="1">` … `</div>` (com linha em branco antes e depois da tabela).
8. Encaixe com o grupo: `<span class="enc alta">Alta</span>`, `<span class="enc media">Média</span>`, `<span class="enc baixa">Baixa</span>`.

## Modelo

```markdown
---
layout: post
title: "Título curto e informativo"
date: 2026-11-16 08:50:00 -0300
categoria: Agenda
resumo: "Uma ou duas frases que aparecem no card da página inicial."
fontes:
  - nome: "Nome da fonte"
    url: "https://..."
---

Primeiro parágrafo com a notícia.

## Detalhes

...

<div class="oportunidade" markdown="1">
<b>Próximo passo</b>
O que o grupo deve fazer com essa informação.
</div>
```

Faça commit direto na branch `main` com a mensagem `Notícia: <título>`. O site republica em 1 ou 2 minutos.
