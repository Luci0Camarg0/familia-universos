/*
 * Montador de setlist (Beats e Guias): marca as faixas, ordena e baixa uma pasta .zip.
 * O ZIP é montado no próprio navegador (JSZip), sem precisar de chave.
 */
(function () {
  'use strict';

  var JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  var MEMORIA = 'fu_setlist';
  var TIPO = 'beats';
  var UM = 'beat', VARIOS = 'beats';

  var beats = [];        // todas as faixas da página (beats ou guias)
  var ordem = [];        // ids escolhidos, na ordem do show
  var baixando = false;
  var el = {};

  function ler() { try { return JSON.parse(localStorage.getItem(MEMORIA) || '{}'); } catch (e) { return {}; } }
  function guardar() { try { localStorage.setItem(MEMORIA, JSON.stringify({ ordem: ordem, nome: el.nome.value })); } catch (e) {} }

  function hoje() {
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
  }
  function tamanho(b) { return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'; }
  function nomeArquivo(t) {
    return String(t || 'beat').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'beat';
  }
  function porId(id) { return beats.filter(function (b) { return b.id === id; })[0]; }

  function desenhar() {
    var esc = FU.esc;
    ordem = ordem.filter(porId);
    var total = ordem.reduce(function (s, id) { return s + (porId(id).tamanho || 0); }, 0);

    el.lista.innerHTML = ordem.map(function (id, n) {
      var b = porId(id);
      return '<li class="setlist-item">' +
        '<span class="setlist-num">' + String(n + 1).padStart(2, '0') + '</span>' +
        '<span class="setlist-titulo">' + esc(b.titulo) + (b.bpm ? ' <small>' + esc(b.bpm) + ' BPM</small>' : '') + '</span>' +
        '<span class="setlist-mover">' +
        '<button type="button" data-mover="-1" data-id="' + esc(id) + '"' + (n === 0 ? ' disabled' : '') + ' aria-label="Subir ' + esc(b.titulo) + '">↑</button>' +
        '<button type="button" data-mover="1" data-id="' + esc(id) + '"' + (n === ordem.length - 1 ? ' disabled' : '') + ' aria-label="Descer ' + esc(b.titulo) + '">↓</button>' +
        '<button type="button" data-tirar="' + esc(id) + '" aria-label="Tirar ' + esc(b.titulo) + ' do setlist">×</button>' +
        '</span></li>';
    }).join('');

    el.resumo.textContent = ordem.length
      ? ordem.length + ' ' + (ordem.length === 1 ? UM : VARIOS) + ' · ' + tamanho(total)
      : 'Marque ' + (TIPO === 'guias' ? 'as guias' : 'os beats') + ' na lista abaixo, na ordem do show.';
    el.rodape.hidden = !ordem.length;
    el.painel.classList.toggle('vazio-setlist', !ordem.length);

    document.querySelectorAll('[data-setlist]').forEach(function (c) {
      c.checked = ordem.indexOf(c.getAttribute('data-setlist')) !== -1;
      c.closest('.item-arquivo').classList.toggle('no-setlist', c.checked);
    });
    guardar();
  }

  function carregarJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise(function (ok, falha) {
      var s = document.createElement('script');
      s.src = JSZIP_URL;
      s.onload = function () { ok(window.JSZip); };
      s.onerror = function () { falha(new Error('Não deu para carregar o gerador de ZIP. Confira a internet.')); };
      document.head.appendChild(s);
    });
  }

  // Busca o beat publicado no site; se ele acabou de subir e ainda não está no ar, busca direto no GitHub.
  function buscar(b) {
    var cru = 'https://raw.githubusercontent.com/' + FU.owner + '/' + FU.repo + '/' + FU.branch + '/' + b.arquivo;
    return fetch(FU.url(b.arquivo)).then(function (r) {
      if (r.ok) return r.blob();
      return fetch(cru).then(function (r2) {
        if (!r2.ok) throw new Error('Não achei o arquivo de “' + b.titulo + '”.');
        return r2.blob();
      });
    });
  }

  function baixar() {
    if (baixando || !ordem.length) return;
    baixando = true;
    el.erro.hidden = true;
    var botao = el.baixar;
    var nome = nomeArquivo(el.nome.value || ('Setlist ' + hoje()));
    var lista = ordem.map(porId);
    botao.disabled = true;

    carregarJSZip().then(function (JSZip) {
      var zip = new JSZip();
      var pasta = zip.folder(nome);
      var texto = nome + '\n\n';
      var feitos = 0;
      botao.textContent = 'Baixando 0 de ' + lista.length + '…';
      return Promise.all(lista.map(function (b, n) {
        var num = String(n + 1).padStart(2, '0');
        var ext = b.extensao || (b.arquivo.split('.').pop());
        texto += num + '. ' + b.titulo + (b.bpm ? ' (' + b.bpm + ' BPM' + (b.tom ? ', ' + b.tom : '') + ')' : '') + '\n';
        return buscar(b).then(function (blob) {
          pasta.file(num + ' - ' + nomeArquivo(b.titulo) + '.' + ext, blob, { binary: true });
          feitos++;
          botao.textContent = 'Baixando ' + feitos + ' de ' + lista.length + '…';
        });
      })).then(function () {
        pasta.file('setlist.txt', texto);
        botao.textContent = 'Montando o ZIP…';
        return zip.generateAsync({ type: 'blob', compression: 'STORE' });
      });
    }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nome + '.zip';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      FU.aviso('Pronto! “' + nome + '.zip” foi baixado.', 'ok');
    }).catch(function (e) {
      el.erro.textContent = (e && e.message) || 'Não deu para montar o ZIP.';
      el.erro.hidden = false;
    }).then(function () {
      baixando = false;
      botao.disabled = false;
      botao.textContent = 'Baixar ZIP';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    el.painel = document.querySelector('[data-setlist-painel]');
    if (!el.painel) return;
    el.lista = el.painel.querySelector('[data-setlist-lista]');
    el.resumo = el.painel.querySelector('[data-setlist-resumo]');
    el.rodape = el.painel.querySelector('[data-setlist-rodape]');
    el.nome = el.painel.querySelector('[data-setlist-nome]');
    el.baixar = el.painel.querySelector('[data-setlist-baixar]');
    el.erro = el.painel.querySelector('[data-setlist-erro]');
    TIPO = el.painel.getAttribute('data-setlist-tipo') || 'beats';
    if (TIPO !== 'beats') { MEMORIA = 'fu_setlist_' + TIPO; UM = 'guia'; VARIOS = 'guias'; }

    var salvo = ler();
    ordem = Array.isArray(salvo.ordem) ? salvo.ordem : [];
    el.nome.value = salvo.nome || ('Setlist ' + hoje());

    document.addEventListener('fu:arquivos', function (e) {
      if (e.detail.tipo !== TIPO) return;
      beats = e.detail.itens || [];
      desenhar();
    });
    document.addEventListener('change', function (e) {
      var c = e.target.closest('[data-setlist]');
      if (!c) return;
      var id = c.getAttribute('data-setlist');
      var i = ordem.indexOf(id);
      if (c.checked && i === -1) ordem.push(id);
      if (!c.checked && i !== -1) ordem.splice(i, 1);
      desenhar();
    });
    el.lista.addEventListener('click', function (e) {
      var m = e.target.closest('[data-mover]');
      var t = e.target.closest('[data-tirar]');
      if (m) {
        var id = m.getAttribute('data-id'), i = ordem.indexOf(id), j = i + parseInt(m.getAttribute('data-mover'), 10);
        if (j < 0 || j >= ordem.length) return;
        ordem.splice(i, 1); ordem.splice(j, 0, id);
        desenhar();
        var foco = el.lista.querySelector('[data-mover="' + m.getAttribute('data-mover') + '"][data-id="' + id + '"]');
        if (foco && !foco.disabled) foco.focus();
      }
      if (t) { ordem.splice(ordem.indexOf(t.getAttribute('data-tirar')), 1); desenhar(); }
    });
    el.nome.addEventListener('input', guardar);
    el.baixar.addEventListener('click', baixar);
    el.painel.querySelector('[data-setlist-limpar]').addEventListener('click', function () { ordem = []; desenhar(); });
  });
})();
