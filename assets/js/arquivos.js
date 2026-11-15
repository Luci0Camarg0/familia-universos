/*
 * Anexos (PDF/Word) e Beats (áudio).
 * Os arquivos vão para arquivos/<tipo>/ no repositório e a lista fica em dados/<tipo>.json.
 */
(function () {
  'use strict';

  var LIMITE = 50 * 1024 * 1024; // 50 MB

  function tamanho(b) {
    if (!b && b !== 0) return '';
    if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' KB';
    return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  }
  function dataBR(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  function slug(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'arquivo';
  }
  function extensao(nome) { var m = /\.([a-z0-9]+)$/i.exec(nome || ''); return m ? m[1].toLowerCase() : ''; }
  function semExtensao(nome) { return String(nome || '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim(); }
  function novoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var ICONE_DOC = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';

  function Arquivos(el) {
    this.el = el;
    this.tipo = el.getAttribute('data-arquivos');          // anexos | beats
    this.pasta = el.getAttribute('data-pasta');
    this.aceita = el.getAttribute('data-aceita');
    this.extensoes = el.getAttribute('data-extensoes').split(',');
    this.rotulo = el.getAttribute('data-rotulo');
    this.dados = 'dados/' + this.tipo + '.json';
    this.lista = el.querySelector('[data-lista]');
    this.itens = [];
    this.ocupado = false;
    var self = this;

    el.querySelector('[data-adicionar]').addEventListener('click', function () { self.abrirEnvio(); });
    this.lista.addEventListener('click', function (e) {
      var b = e.target.closest('[data-apagar]');
      if (b) self.apagar(b.getAttribute('data-apagar'));
    });
    document.addEventListener('fu:sessao', function () { self.carregar(); });
    this.carregar();
  }

  Arquivos.prototype.carregar = function () {
    var self = this;
    FU.lerJson(this.dados, { itens: [] }).then(function (d) {
      self.itens = (d && Array.isArray(d.itens)) ? d.itens : [];
      self.desenhar();
    });
  };

  Arquivos.prototype.desenhar = function () {
    var esc = FU.esc, self = this;
    var editor = FU.conectado();
    var itens = this.itens.slice().sort(function (a, b) { return String(b.enviado_em).localeCompare(String(a.enviado_em)); });
    if (!itens.length) {
      this.lista.innerHTML = '<p class="vazio">Nada por aqui ainda. Clique em “Adicionar ' + esc(this.rotulo) + '” para subir o primeiro.</p>';
      return;
    }
    var agora = Date.now();
    var h = '<ul class="itens-arquivo">';
    itens.forEach(function (i) {
      var link = FU.url(i.arquivo);
      var ext = (i.extensao || extensao(i.arquivo)).toUpperCase();
      var recente = agora - new Date(i.enviado_em).getTime() < 3 * 60 * 1000;
      var meta = [];
      if (self.tipo === 'beats') {
        if (i.bpm) meta.push(esc(i.bpm) + ' BPM');
        if (i.tom) meta.push('Tom ' + esc(i.tom));
        if (i.produtor) meta.push('Prod. ' + esc(i.produtor));
      }
      meta.push(esc(ext));
      if (i.tamanho) meta.push(tamanho(i.tamanho));
      if (i.enviado_em) meta.push('enviado em ' + dataBR(i.enviado_em));

      h += '<li class="item-arquivo item-' + self.tipo + '">';
      if (self.tipo === 'anexos') h += '<span class="item-icone ext-' + esc(ext.toLowerCase()) + '">' + ICONE_DOC + '<small>' + esc(ext) + '</small></span>';
      h += '<div class="item-info">';
      h += '<h3>' + esc(i.titulo) + '</h3>';
      if (i.descricao) h += '<p class="item-desc">' + esc(i.descricao) + '</p>';
      h += '<p class="item-meta">' + meta.join(' · ') + '</p>';
      if (recente) h += '<p class="item-novo">Acabou de subir: o arquivo fica disponível em 1 ou 2 minutos.</p>';
      if (self.tipo === 'beats') h += '<audio controls preload="none" src="' + esc(link) + '"></audio>';
      h += '</div>';
      h += '<div class="item-acoes">';
      if (ext === 'PDF') h += '<a class="botao botao-pequeno" href="' + esc(link) + '" target="_blank" rel="noopener">Abrir</a>';
      h += '<a class="botao botao-pequeno botao-linha" href="' + esc(link) + '" download>Baixar</a>';
      if (editor) h += '<button type="button" class="botao botao-pequeno botao-perigo" data-apagar="' + esc(i.id) + '">Apagar</button>';
      h += '</div></li>';
    });
    h += '</ul>';
    this.lista.innerHTML = h;
  };

  // ---------- enviar ----------
  Arquivos.prototype.abrirEnvio = function () {
    if (!FU.conectado()) {
      FU.pedirEntrada('Para adicionar ' + this.rotulo + ', entre com a chave do GitHub.');
      return;
    }
    if (this.el.querySelector('.envio')) { this.el.querySelector('.envio input[type=file]').click(); return; }
    var esc = FU.esc, beats = this.tipo === 'beats';
    var painel = document.createElement('form');
    painel.className = 'envio';
    var h = '';
    h += '<p class="evento-form-titulo">Adicionar ' + esc(this.rotulo) + '</p>';
    h += '<label class="soltar" data-soltar><input type="file" name="arquivo" accept="' + esc(this.aceita) + '" required>';
    h += '<span data-soltar-texto>Toque para escolher o arquivo ou arraste ele aqui</span></label>';
    h += '<div class="campos">';
    h += '<label class="campo campo-largo"><span>Nome que vai aparecer</span><input name="titulo" required maxlength="120"></label>';
    if (beats) {
      h += '<label class="campo"><span>BPM (opcional)</span><input name="bpm" inputmode="numeric" maxlength="5" placeholder="Ex.: 90"></label>';
      h += '<label class="campo"><span>Tom (opcional)</span><input name="tom" maxlength="12" placeholder="Ex.: Lá menor"></label>';
      h += '<label class="campo campo-largo"><span>Produzido por (opcional)</span><input name="produtor" maxlength="80"></label>';
    }
    h += '<label class="campo campo-largo"><span>Descrição (opcional)</span><textarea name="descricao" rows="2" maxlength="400"></textarea></label>';
    h += '</div>';
    h += '<p class="erro" data-envio-erro hidden></p>';
    h += '<div class="acoes"><button type="button" class="botao botao-linha" data-cancelar>Cancelar</button>';
    h += '<button type="submit" class="botao" data-enviar>Enviar</button></div>';
    painel.innerHTML = h;
    this.el.querySelector('.arquivos-barra').after(painel);

    var self = this;
    var input = painel.querySelector('input[type=file]');
    var zona = painel.querySelector('[data-soltar]');
    function escolheu() {
      var f = input.files && input.files[0];
      if (!f) return;
      painel.querySelector('[data-soltar-texto]').textContent = f.name + ' · ' + tamanho(f.size);
      zona.classList.add('escolhido');
      if (!painel.titulo.value) painel.titulo.value = semExtensao(f.name);
    }
    input.addEventListener('change', escolheu);
    ['dragenter', 'dragover'].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.add('arrastando'); }); });
    ['dragleave', 'drop'].forEach(function (t) { zona.addEventListener(t, function () { zona.classList.remove('arrastando'); }); });
    zona.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) { input.files = e.dataTransfer.files; escolheu(); }
    });
    painel.querySelector('[data-cancelar]').addEventListener('click', function () { if (!self.ocupado) painel.remove(); });
    painel.addEventListener('submit', function (e) { e.preventDefault(); self.enviar(painel); });
    input.click();
  };

  Arquivos.prototype.enviar = function (painel) {
    if (this.ocupado) return;
    var self = this;
    var erro = painel.querySelector('[data-envio-erro]');
    var botao = painel.querySelector('[data-enviar]');
    var f = painel.arquivo.files && painel.arquivo.files[0];
    function falhar(msg) { erro.textContent = msg; erro.hidden = false; }
    erro.hidden = true;

    if (!f) return falhar('Escolha um arquivo.');
    var ext = extensao(f.name);
    if (this.extensoes.indexOf(ext) === -1) return falhar('Esse tipo de arquivo não entra aqui. Aceita: ' + this.extensoes.join(', ').toUpperCase() + '.');
    if (f.size > LIMITE) return falhar('Arquivo com ' + tamanho(f.size) + '. O limite é 50 MB' + (this.tipo === 'beats' ? ': exporte em MP3.' : '.'));

    var titulo = painel.titulo.value.trim() || semExtensao(f.name);
    var id = novoId();
    var caminho = this.pasta + '/' + slug(titulo) + '-' + id.slice(-4) + '.' + ext;
    var item = {
      id: id,
      titulo: titulo,
      arquivo: caminho,
      extensao: ext,
      tamanho: f.size,
      enviado_em: new Date().toISOString(),
      descricao: painel.descricao.value.trim()
    };
    if (this.tipo === 'beats') {
      item.bpm = painel.bpm.value.trim();
      item.tom = painel.tom.value.trim();
      item.produtor = painel.produtor.value.trim();
    }
    Object.keys(item).forEach(function (k) { if (item[k] === '') delete item[k]; });

    this.ocupado = true;
    botao.disabled = true;
    botao.textContent = f.size > 5 * 1024 * 1024 ? 'Enviando… (arquivo grande, pode levar 1 minuto)' : 'Enviando…';
    var final;

    FU.arquivoParaBase64(f).then(function (b64) {
      return FU.gravar(
        (self.tipo === 'beats' ? 'Beats' : 'Anexos') + ': adiciona ' + titulo,
        [{ caminho: caminho, base64: b64 }],
        function () {
          return FU.lerJson(self.dados, { itens: [] }).then(function (d) {
            var itens = (d && Array.isArray(d.itens)) ? d.itens.slice() : [];
            itens.push(item);
            final = itens;
            return [{ caminho: self.dados, texto: JSON.stringify({ itens: itens }, null, 2) + '\n' }];
          });
        });
    }).then(function () {
      self.itens = final;
      painel.remove();
      self.desenhar();
      FU.aviso('Enviado! “' + titulo + '” já está na lista.', 'ok');
    }).catch(function (e) {
      falhar(FU.mensagemDeErro(e));
      botao.disabled = false;
      botao.textContent = 'Tentar de novo';
    }).then(function () { self.ocupado = false; });
  };

  // ---------- apagar ----------
  Arquivos.prototype.apagar = function (id) {
    var self = this;
    var item = this.itens.filter(function (i) { return i.id === id; })[0];
    if (!item || this.ocupado) return;
    if (!window.confirm('Apagar “' + item.titulo + '”? O arquivo sai do blog.')) return;
    this.ocupado = true;
    var final;
    FU.gravar((this.tipo === 'beats' ? 'Beats' : 'Anexos') + ': apaga ' + item.titulo, [], function () {
      return FU.lerJson(self.dados, { itens: [] }).then(function (d) {
        var itens = ((d && d.itens) || []).filter(function (i) { return i.id !== id; });
        final = itens;
        return [
          { caminho: self.dados, texto: JSON.stringify({ itens: itens }, null, 2) + '\n' },
          { caminho: item.arquivo, apagar: true }
        ];
      });
    }).then(function () {
      self.itens = final;
      self.desenhar();
      FU.aviso('Apagado.', 'ok');
    }).catch(function (e) {
      FU.aviso(FU.mensagemDeErro(e), 'erro');
    }).then(function () { self.ocupado = false; });
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-arquivos]').forEach(function (el) { new Arquivos(el); });
  });
})();
