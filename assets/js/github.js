/*
 * Família UniVersos – ligação do blog com o GitHub.
 *
 * O blog é estático (GitHub Pages). Para salvar anexos, beats e a agenda,
 * o navegador de quem está conectado grava os arquivos direto no repositório
 * usando a chave (token) do GitHub, que fica guardada só naquele aparelho.
 * Cada gravação vira um "commit" e o GitHub Pages republica o site sozinho.
 */
(function () {
  'use strict';

  var CFG = window.FU || {};
  var CHAVE_TOKEN = 'fu_token';
  var CHAVE_NOME = 'fu_nome';
  var API = 'https://api.github.com';

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function guardar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function url(caminho) { return (CFG.base || '') + '/' + String(caminho).replace(/^\//, ''); }

  function utf8ParaBase64(txt) {
    var bytes = new TextEncoder().encode(txt);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function base64ParaUtf8(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function arquivoParaBase64(arquivo) {
    return new Promise(function (ok, falha) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { falha(new Error('Não deu para ler o arquivo do seu aparelho.')); };
      r.readAsDataURL(arquivo);
    });
  }

  // ---------- aviso (toast) ----------
  var timerAviso;
  function aviso(msg, tipo) {
    var el = document.querySelector('[data-aviso]');
    if (!el) return;
    el.textContent = msg;
    el.className = 'aviso' + (tipo ? ' aviso-' + tipo : '');
    el.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { el.hidden = true; }, tipo === 'erro' ? 9000 : 6000);
  }

  // ---------- sessão ----------
  function token() { return ler(CHAVE_TOKEN); }
  function conectado() { return !!token(); }

  function avisarMudanca() {
    document.dispatchEvent(new CustomEvent('fu:sessao', { detail: { conectado: conectado() } }));
  }

  // ---------- API do GitHub ----------
  function api(caminho, opcoes) {
    opcoes = opcoes || {};
    var t = opcoes.token || token();
    var headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (t) headers.Authorization = 'Bearer ' + t;
    if (opcoes.body) headers['Content-Type'] = 'application/json';
    return fetch(API + caminho, {
      method: opcoes.method || 'GET',
      headers: headers,
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return {}; }).then(function (dados) {
        if (!r.ok) {
          var e = new Error(dados && dados.message ? dados.message : 'Erro ' + r.status);
          e.status = r.status;
          throw e;
        }
        return dados;
      });
    });
  }

  function repo() { return '/repos/' + CFG.owner + '/' + CFG.repo; }

  function mensagemDeErro(e) {
    if (!e) return 'Algo deu errado.';
    if (e.status === 401) return 'A chave do GitHub não vale mais (venceu ou foi apagada). Entre de novo com uma chave nova.';
    if (e.status === 403 || e.status === 404) return 'Sua chave não tem permissão para gravar neste blog. Confira o passo “Contents: Read and write” na página Como usar.';
    if (e.status === 413 || /too large|payload/i.test(e.message || '')) return 'Arquivo grande demais para o GitHub. Tente um arquivo menor (MP3 em vez de WAV, por exemplo).';
    if (e instanceof TypeError) return 'Sem conexão com o GitHub agora. Confira a internet e tente de novo.';
    return e.message || 'Algo deu errado.';
  }

  // Lê um JSON do repositório (sempre a versão mais nova).
  // Conectado: lê pela API. Visitante: lê o arquivo publicado no site.
  function lerJson(caminho, padrao) {
    if (conectado()) {
      return api(repo() + '/contents/' + caminho + '?ref=' + encodeURIComponent(CFG.branch))
        .then(function (d) { return JSON.parse(base64ParaUtf8(d.content)); })
        .catch(function (e) {
          if (e.status === 404) return padrao;
          if (e.status === 401) { sair(true); }
          return lerPublicado(caminho, padrao);
        });
    }
    return lerPublicado(caminho, padrao);
  }
  function lerPublicado(caminho, padrao) {
    return fetch(url(caminho) + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .catch(function () { return padrao; });
  }

  /*
   * Grava várias mudanças num único commit.
   *  binarios: [{ caminho, base64 }]           – arquivos enviados (PDF, MP3…)
   *  montar:   function () -> Promise<[{ caminho, texto } | { caminho, apagar: true }]>
   *            chamada de novo se outra pessoa gravou ao mesmo tempo.
   */
  function gravar(mensagem, binarios, montar) {
    binarios = binarios || [];
    var blobs = [];
    var subir = binarios.reduce(function (p, b) {
      return p.then(function () {
        return api(repo() + '/git/blobs', { method: 'POST', body: { content: b.base64, encoding: 'base64' } })
          .then(function (r) { blobs.push({ path: b.caminho, mode: '100644', type: 'blob', sha: r.sha }); });
      });
    }, Promise.resolve());

    function tentar(n) {
      var ref = repo() + '/git/ref/heads/' + CFG.branch;
      var shaCommit;
      return api(ref).then(function (r) {
        shaCommit = r.object.sha;
        return Promise.all([api(repo() + '/git/commits/' + shaCommit), montar ? montar() : []]);
      }).then(function (res) {
        var arvoreBase = res[0].tree.sha;
        var entradas = blobs.slice();
        (res[1] || []).forEach(function (m) {
          if (m.apagar) entradas.push({ path: m.caminho, mode: '100644', type: 'blob', sha: null });
          else entradas.push({ path: m.caminho, mode: '100644', type: 'blob', content: m.texto });
        });
        return api(repo() + '/git/trees', { method: 'POST', body: { base_tree: arvoreBase, tree: entradas } });
      }).then(function (arvore) {
        return api(repo() + '/git/commits', { method: 'POST', body: { message: mensagem, tree: arvore.sha, parents: [shaCommit] } });
      }).then(function (c) {
        return api(repo() + '/git/refs/heads/' + CFG.branch, { method: 'PATCH', body: { sha: c.sha } });
      }).catch(function (e) {
        // 422 = alguém gravou no meio do caminho. Lê de novo e tenta outra vez.
        if (e.status === 422 && n < 3) return tentar(n + 1);
        throw e;
      });
    }

    return subir.then(function () { return tentar(1); });
  }

  // ---------- entrar / sair ----------
  function entrar(chave) {
    chave = String(chave || '').trim();
    return api(repo(), { token: chave }).then(function (r) {
      if (r.permissions && r.permissions.push === false) {
        var e = new Error('sem-permissao'); e.status = 403; throw e;
      }
      return api('/user', { token: chave }).catch(function () { return {}; });
    }).then(function (u) {
      guardar(CHAVE_TOKEN, chave);
      guardar(CHAVE_NOME, u && u.login ? u.login : 'grupo');
      avisarMudanca();
      return u;
    }).catch(function (e) {
      if (e.status === 401) throw new Error('Essa chave não funcionou. Confira se copiou ela inteira.');
      if (e.status === 403 || e.status === 404) throw new Error('A chave funciona, mas não tem acesso ao repositório do blog. Na criação da chave, escolha o repositório “' + CFG.repo + '” e marque Contents: Read and write.');
      throw new Error(mensagemDeErro(e));
    });
  }

  function sair(silencioso) {
    guardar(CHAVE_TOKEN, null);
    guardar(CHAVE_NOME, null);
    avisarMudanca();
    if (silencioso) aviso('A chave do GitHub deste aparelho venceu. Na próxima edição o blog pede uma nova.', 'erro');
  }

  // ---------- janela da chave (aparece só uma vez por aparelho) ----------
  var depois = null;
  function prepararJanela() {
    var janela = document.querySelector('[data-janela-entrar]');
    if (!janela) return;
    var form = janela.querySelector('[data-form-entrar]');
    var erro = janela.querySelector('[data-entrar-erro]');
    var enviar = janela.querySelector('[data-entrar-enviar]');

    function mostrar() {
      erro.hidden = true;
      if (janela.open) return;
      if (typeof janela.showModal === 'function') janela.showModal(); else janela.setAttribute('open', '');
      setTimeout(function () { form.chave.focus(); }, 30);
    }
    function fechar() { depois = null; if (janela.close) janela.close(); else janela.removeAttribute('open'); }

    janela.querySelectorAll('[data-fechar]').forEach(function (b) { b.addEventListener('click', fechar); });
    janela.addEventListener('click', function (e) { if (e.target === janela) fechar(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      erro.hidden = true;
      enviar.disabled = true;
      enviar.textContent = 'Conferindo…';
      entrar(form.chave.value).then(function () {
        var continuar = depois;
        form.reset();
        fechar();
        aviso('Pronto! Neste aparelho o blog não pede mais a chave.', 'ok');
        if (continuar) continuar();
      }).catch(function (err) {
        erro.textContent = err.message;
        erro.hidden = false;
      }).then(function () {
        enviar.disabled = false;
        enviar.textContent = 'Liberar';
      });
    });

    FU.pedirChave = function (continuar) { depois = continuar || null; mostrar(); };
  }

  // Executa uma ação de edição. Se este aparelho ainda não tem a chave, pede uma vez e continua.
  function editar(acao) {
    if (conectado()) return acao();
    FU.pedirChave(acao);
  }

  // ---------- menu do celular ----------
  function prepararMenu() {
    var b = document.querySelector('[data-menu]');
    var menu = document.getElementById('menu');
    if (!b || !menu) return;
    b.addEventListener('click', function () {
      var aberto = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', aberto ? 'false' : 'true');
      menu.classList.toggle('aberto', !aberto);
    });
  }

  // ---------- exporta ----------
  var FU = window.FU = window.FU || {};
  FU.esc = esc;
  FU.url = url;
  FU.aviso = aviso;
  FU.conectado = conectado;
  FU.lerJson = lerJson;
  FU.gravar = gravar;
  FU.utf8ParaBase64 = utf8ParaBase64;
  FU.arquivoParaBase64 = arquivoParaBase64;
  FU.mensagemDeErro = mensagemDeErro;
  FU.sair = sair;
  FU.editar = editar;
  FU.pedirChave = function () {};

  document.addEventListener('DOMContentLoaded', function () {
    prepararMenu();
    prepararJanela();
    avisarMudanca();
  });
})();
