---
layout: default
title: Como usar
---
<article class="materia" markdown="1">
<header class="materia-topo">
<h1>Como usar o blog</h1>
<p class="linha-fina">Qualquer pessoa pode ler as notícias, ver a agenda, abrir os anexos e ouvir os beats. Não tem login: os botões de adicionar e editar ficam sempre à mostra. Só na <b>primeira vez</b> que um aparelho for mexer, o blog pede a chave do GitHub do grupo, e depois nunca mais.</p>
</header>

<div class="materia-corpo" markdown="1">

## Por que precisa de uma chave? {#por-que}

O blog fica hospedado de graça no GitHub. Cada anexo, beat ou data que você salva vira um arquivo guardado lá. A chave é o que prova para o GitHub que é alguém do grupo mexendo, e não um visitante qualquer. Sem ela, ninguém de fora consegue apagar ou trocar nada.

A chave fica salva **só no aparelho** onde você colou (celular ou computador). Em outro aparelho, ele pede a mesma chave uma vez.

## Criar a chave (uma vez só) {#chave}

<ol class="passos">
<li>Entre no GitHub com a conta <b>Luci0Camarg0</b> (a dona do blog).</li>
<li>Abra <a href="https://github.com/settings/personal-access-tokens/new?name=Blog+Familia+UniVersos&amp;description=Chave+do+blog+para+anexos%2C+beats+e+agenda&amp;target_name=Luci0Camarg0&amp;expires_in=none&amp;contents=write" target="_blank" rel="noopener">esta página de criar chave</a>. Se o GitHub pedir sua senha ou código, confirme.</li>
<li>Em <b>Token name</b>, escreva <code>Blog Familia UniVersos</code> (se já não vier preenchido).</li>
<li>Em <b>Expiration</b>, escolha <b>No expiration</b> (ou 1 ano; quando vencer, é só criar outra).</li>
<li>Em <b>Repository access</b>, marque <b>Only select repositories</b> e escolha <code>familia-universos</code>.</li>
<li>Em <b>Permissions</b>, abra <b>Repository permissions</b>, procure <b>Contents</b> e mude para <b>Read and write</b>.</li>
<li>Desça e clique em <b>Generate token</b>. Copie o código que começa com <code>github_pat_</code>. Ele só aparece uma vez: guarde num lugar seguro, como as notas do celular.</li>
<li>Volte ao blog e clique em qualquer botão de adicionar ou editar. Na janelinha que abrir, cole a chave e clique em <b>Liberar</b>. Pronto: neste aparelho o blog não pede mais.</li>
</ol>

> **Cuidado:** a chave funciona como uma senha do blog. Só passe para quem é do grupo e pode mexer no conteúdo. Se ela vazar, apague em [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens) e crie outra.

## Agenda

Na [Agenda]({{ '/agenda/' | relative_url }}) (ou no quadro da página inicial):

- **+ Nova data**: escolha o tipo (ensaio, show, evento, gravação, reunião), escreva o que é, a data, e se quiser hora, local e observação.
- **Editar**: muda qualquer informação de uma data.
- **Duplicar**: cria uma cópia igual, já aberta para você trocar só o que muda (por exemplo, a data do próximo ensaio).
- **Apagar**: tira a data da agenda.

Datas que já passaram saem do quadro da página inicial e ficam guardadas em “Já passaram”, na página da Agenda.

## Anexos e Beats

- Em [Anexos]({{ '/anexos/' | relative_url }}), o botão **Adicionar anexo** aceita PDF e Word (.doc e .docx).
- Em [Beats]({{ '/beats/' | relative_url }}), o botão **Adicionar instrumental** aceita MP3, WAV, M4A, AAC, OGG e FLAC. Dá para anotar BPM, tom e quem produziu.
- Limite de **50 MB por arquivo**. Para beats, prefira MP3.
- O blog tem espaço para cerca de **1 GB** no total. Dá para muitas centenas de MP3, mas não para guardar todos os WAV do estúdio.
- **Tudo que sobe fica público.** Não coloque documento com CPF, RG, dados bancários ou contrato assinado com dados pessoais.

## Depois de salvar

Quem está conectado vê a mudança na hora. Para os visitantes, o GitHub republica o blog sozinho e leva **1 ou 2 minutos**.

## Notícias

As notícias vêm da pesquisa de shows da região. Quando a pesquisa diária encontra algo novo, ela vira uma notícia aqui.

</div>
</article>
