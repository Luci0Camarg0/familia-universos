/*
 * Widget de agenda (ensaios, shows, eventos…).
 * Lê e grava o arquivo dados/agenda.json do repositório.
 */
(function () {
  'use strict';

  var ARQUIVO = 'dados/agenda.json';
  var TIPOS = ['Ensaio', 'Show', 'Evento', 'Gravação', 'Reunião', 'Outro'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  function hojeISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function somarDias(iso, n) {
    var p = iso.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function partes(iso) {
    var p = String(iso || '').split('-').map(Number);
    if (p.length !== 3 || !p[0]) return null;
    var d = new Date(p[0], p[1] - 1, p[2]);
    return { dia: p[2], mes: MESES[p[1] - 1], semana: SEMANA[d.getDay()], ano: p[0] };
  }
  function novoId() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function ordenar(lista) {
    return lista.slice().sort(function (a, b) {
      return (a.data + ' ' + (a.hora || '99:99')).localeCompare(b.data + ' ' + (b.hora || '99:99'));
    });
  }
  function slug(t) { return String(t || 'outro').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function dataBR(iso) { var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] : iso; }

  function Agenda(el) {
    this.el = el;
    this.limite = parseInt(el.getAttribute('data-limite') || '0', 10);
    this.completa = el.hasAttribute('data-completa');
    this.itens = [];
    this.editando = null;   // id do item aberto no formulário
    this.rascunho = null;   // item novo ou duplicado ainda não salvo
    this.salvando = false;
    var self = this;
    el.addEventListener('click', function (e) { self.clique(e); });
    el.addEventListener('submit', function (e) { e.preventDefault(); self.salvar(e.target); });
    document.addEventListener('fu:sessao', function () { if (!self.rascunho && !self.editando) self.carregar(); });
    this.carregar();
  }

  Agenda.prototype.carregar = function () {
    var self = this;
    if (!this.itens.length) this.el.innerHTML = '<p class="carregando">Carregando agenda…</p>';
    FU.lerJson(ARQUIVO, { itens: [] }).then(function (d) {
      self.itens = (d && Array.isArray(d.itens)) ? d.itens : [];
      self.desenhar();
    });
  };

  Agenda.prototype.desenhar = function () {
    var hoje = hojeISO();
    var editor = FU.conectado();
    var todos = ordenar(this.itens);
    var proximos = todos.filter(function (i) { return i.data >= hoje; });
    var passados = todos.filter(function (i) { return i.data < hoje; }).reverse();
    if (this.limite) proximos = proximos.slice(0, this.limite);

    var h = '';
    h += '<div class="agenda-barra">';
    h += '<button type="button" class="botao botao-pequeno" data-acao="novo"' + (this.rascunho && !this.rascunho._dup ? ' hidden' : '') + '>+ Nova data</button>';
    h += '</div>';

    if (this.rascunho && !this.rascunho._dup) h += this.formulario(this.rascunho, true);

    if (!proximos.length && !(this.rascunho)) {
      h += '<p class="vazio">Nenhuma data marcada daqui pra frente.</p>';
    }

    h += '<ol class="agenda-lista">';
    var self = this;
    proximos.forEach(function (i) { h += self.item(i, hoje, editor); });
    h += '</ol>';

    if (this.completa && passados.length) {
      h += '<details class="agenda-passados"><summary>Já passaram (' + passados.length + ')</summary><ol class="agenda-lista">';
      passados.forEach(function (i) { h += self.item(i, hoje, editor, true); });
      h += '</ol></details>';
    }

    this.el.innerHTML = h;
    var foco = this.el.querySelector('form input[name="titulo"]');
    if (foco && this._focar) { foco.focus(); this._focar = false; }
  };

  Agenda.prototype.item = function (i, hoje, editor, passado) {
    var esc = FU.esc;
    var h = '';
    if (this.editando === i.id) {
      h += '<li>' + this.formulario(i, false) + '</li>';
    } else {
      var p = partes(i.data) || { dia: '?', mes: '', semana: '' };
      var quando = i.data === hoje ? 'Hoje' : (i.data === somarDias(hoje, 1) ? 'Amanhã' : p.semana);
      h += '<li class="evento' + (passado ? ' passado' : '') + '" data-id="' + esc(i.id) + '">';
      h += '<div class="evento-data"><b>' + esc(p.dia) + '</b><span>' + esc(p.mes) + '</span></div>';
      h += '<div class="evento-info">';
      h += '<span class="tipo tipo-' + esc(slug(i.tipo)) + '">' + esc(i.tipo || 'Outro') + '</span>';
      h += '<h3>' + esc(i.titulo) + '</h3>';
      h += '<p class="evento-quando">' + esc(quando) + (i.hora ? ' · ' + esc(i.hora) : '') + (i.local ? ' · ' + esc(i.local) : '') + '</p>';
      if (i.obs) h += '<p class="evento-obs">' + esc(i.obs) + '</p>';
      {
        h += '<div class="evento-acoes">';
        h += '<button type="button" data-acao="editar" data-id="' + esc(i.id) + '">Editar</button>';
        h += '<button type="button" data-acao="duplicar" data-id="' + esc(i.id) + '">Duplicar</button>';
        h += '<button type="button" class="perigo" data-acao="apagar" data-id="' + esc(i.id) + '">Apagar</button>';
        h += '</div>';
      }
      h += '</div></li>';
    }
    if (this.rascunho && this.rascunho._dup === i.id) h += '<li>' + this.formulario(this.rascunho, true) + '</li>';
    return h;
  };

  Agenda.prototype.formulario = function (i, novo) {
    var esc = FU.esc;
    var titulo = novo ? (i._dup ? 'Cópia: mude o que precisar' : 'Nova data') : 'Editar data';
    var h = '<form class="evento-form" data-id="' + esc(i.id) + '" data-novo="' + (novo ? '1' : '') + '">';
    h += '<p class="evento-form-titulo">' + titulo + '</p>';
    h += '<div class="campos">';
    h += '<label class="campo"><span>Tipo</span><select name="tipo">';
    TIPOS.forEach(function (t) { h += '<option' + (t === i.tipo ? ' selected' : '') + '>' + t + '</option>'; });
    h += '</select></label>';
    h += '<label class="campo campo-largo"><span>O que é</span><input name="titulo" required maxlength="120" value="' + esc(i.titulo) + '" placeholder="Ex.: Ensaio geral para o show do Sesc"></label>';
    h += '<label class="campo"><span>Data</span><input type="date" name="data" required value="' + esc(i.data) + '"></label>';
    h += '<label class="campo"><span>Hora (opcional)</span><input type="time" name="hora" value="' + esc(i.hora) + '"></label>';
    h += '<label class="campo campo-largo"><span>Local (opcional)</span><input name="local" maxlength="140" value="' + esc(i.local) + '" placeholder="Ex.: Instituto, Parque da Cidadania"></label>';
    h += '<label class="campo campo-largo"><span>Observação (opcional)</span><textarea name="obs" rows="2" maxlength="500" placeholder="Ex.: levar pen drive com os beats">' + esc(i.obs) + '</textarea></label>';
    h += '</div>';
    h += '<div class="acoes"><button type="button" class="botao botao-linha" data-acao="cancelar">Cancelar</button>';
    h += '<button type="submit" class="botao">Salvar</button></div>';
    h += '</form>';
    return h;
  };

  Agenda.prototype.clique = function (e) {
    var b = e.target.closest('[data-acao]');
    if (!b || this.salvando) return;
    var acao = b.getAttribute('data-acao');
    var id = b.getAttribute('data-id');
    var item = this.itens.filter(function (i) { return i.id === id; })[0];

    if (acao !== 'cancelar' && !FU.conectado()) {
      var self = this;
      FU.editar(function () { self.clique(e); });
      return;
    }
    if (acao === 'novo') {
      this.editando = null;
      this.rascunho = { id: novoId(), tipo: 'Ensaio', titulo: '', data: hojeISO(), hora: '', local: '', obs: '' };
      this._focar = true;
    } else if (acao === 'editar' && item) {
      this.rascunho = null;
      this.editando = id;
      this._focar = true;
    } else if (acao === 'duplicar' && item) {
      this.editando = null;
      this.rascunho = Object.assign({}, item, { id: novoId(), _dup: item.id });
      this._focar = true;
    } else if (acao === 'apagar' && item) {
      if (!window.confirm('Apagar "' + item.titulo + '" de ' + dataBR(item.data) + '?')) return;
      this.gravar({ apagar: id }, 'Agenda: apaga ' + item.titulo + ' (' + dataBR(item.data) + ')');
      return;
    } else if (acao === 'cancelar') {
      this.editando = null;
      this.rascunho = null;
    }
    this.desenhar();
  };

  Agenda.prototype.salvar = function (form) {
    if (this.salvando) return;
    var dados = {
      id: form.getAttribute('data-id'),
      tipo: form.tipo.value,
      titulo: form.titulo.value.trim(),
      data: form.data.value,
      hora: form.hora.value,
      local: form.local.value.trim(),
      obs: form.obs.value.trim()
    };
    if (!dados.titulo || !dados.data) return;
    var novo = form.getAttribute('data-novo') === '1';
    this.gravar({ salvar: dados }, 'Agenda: ' + (novo ? 'adiciona ' : 'atualiza ') + dados.tipo.toLowerCase() + ' ' + dataBR(dados.data) + ' – ' + dados.titulo);
  };

  Agenda.prototype.gravar = function (op, mensagem) {
    var self = this;
    var final = null;
    this.salvando = true;
    var botoes = this.el.querySelectorAll('button');
    botoes.forEach(function (b) { b.disabled = true; });
    var enviar = this.el.querySelector('form button[type="submit"]');
    if (enviar) enviar.textContent = 'Salvando…';
    FU.gravar(mensagem, [], function () {
      return FU.lerJson(ARQUIVO, { itens: [] }).then(function (d) {
        var itens = (d && Array.isArray(d.itens)) ? d.itens.slice() : [];
        if (op.apagar) itens = itens.filter(function (i) { return i.id !== op.apagar; });
        if (op.salvar) {
          var achou = false;
          itens = itens.map(function (i) { if (i.id === op.salvar.id) { achou = true; return op.salvar; } return i; });
          if (!achou) itens.push(op.salvar);
        }
        final = ordenar(itens);
        return [{ caminho: ARQUIVO, texto: JSON.stringify({ itens: final }, null, 2) + '\n' }];
      });
    }).then(function () {
      self.itens = final;
      self.editando = null;
      self.rascunho = null;
      self.salvando = false;
      self.desenhar();
      FU.aviso(op.apagar ? 'Data apagada.' : 'Salvo! Para quem visita, aparece em 1 ou 2 minutos.', 'ok');
    }).catch(function (e) {
      // Mantém o formulário como está, para não perder o que foi digitado.
      self.salvando = false;
      botoes.forEach(function (b) { b.disabled = false; });
      if (enviar) enviar.textContent = 'Salvar';
      FU.aviso(FU.mensagemDeErro(e), 'erro');
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-agenda]').forEach(function (el) { new Agenda(el); });
  });
})();
