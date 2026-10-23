/* Portfólio Thiago Benine: busca, filtros combináveis com contagem prévia e estado na URL. Sem dependências. */
(function () {
  "use strict";

  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)");
  var celular = window.matchMedia("(max-width: 899px)");
  var estreito = window.matchMedia("(max-width: 767px)");

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rola(y) {
    window.scrollTo({ top: Math.max(0, y), behavior: reduz.matches ? "auto" : "smooth" });
  }

  /* ---------------------------------------------------------- galeria da página de projeto */
  function contadorGaleria() {
    var fotos = $("[data-fotos]");
    var atual = $("[data-atual]");
    if (!fotos || !atual || !("IntersectionObserver" in window)) return;
    var figs = $$(".foto", fotos);
    var visivel = figs.map(function () { return 0; });
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { visivel[figs.indexOf(e.target)] = e.intersectionRatio; });
      var melhor = 0;
      visivel.forEach(function (r, i) { if (r > visivel[melhor] + 0.01) melhor = i; });
      atual.textContent = String(melhor + 1);
    }, { root: fotos, threshold: [0, 0.25, 0.5, 0.75, 1] });
    figs.forEach(function (f) { obs.observe(f); });
  }
  contadorGaleria();

  var noIndice = document.getElementById("indice");
  if (!noIndice) return;
  var D;
  try { D = JSON.parse(noIndice.textContent); } catch (e) { return; }

  /* ---------------------------------------------------------- texto e busca */
  var PARADAS = { de: 1, da: 1, do: 1, das: 1, dos: 1, para: 1, pra: 1, com: 1, e: 1, em: 1, um: 1, uma: 1, o: 1, a: 1, os: 1, as: 1, que: 1, no: 1, na: 1, nos: 1, nas: 1, por: 1, meu: 1, minha: 1, preciso: 1, quero: 1 };

  function normaliza(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  function termos(q) {
    return normaliza(q).split(" ").filter(function (t) { return t.length >= 2 && !PARADAS[t]; });
  }

  /* cada termo vira uma lista de alternativas: ele mesmo, o singular e os sinônimos do grupo */
  function alternativas(t) {
    var alt = [t];
    if (t.length > 3 && /s$/.test(t)) alt.push(t.slice(0, -1));
    if (/oes$/.test(t)) alt.push(t.slice(0, -3) + "ao");
    (D.sin || []).forEach(function (grupo) {
      var bate = grupo.some(function (s) {
        return s === t || (t.length >= 3 && s.indexOf(t) === 0) || (s.length >= 3 && t.indexOf(s) === 0);
      });
      if (bate) grupo.forEach(function (s) { if (alt.indexOf(s) < 0) alt.push(s); });
    });
    return alt;
  }

  /* ---------------------------------------------------------- estado */
  var G = D.grupos;
  var LIMITE = 10;
  var E = { q: "", sel: {} };
  G.forEach(function (g) { E.sel[g] = []; });

  function rotulo(g, v) { return (D.r[g] && D.r[g][v]) || v; }

  function leUrl() {
    var p = new URLSearchParams(window.location.search);
    G.forEach(function (g) {
      var bruto = p.getAll(g).join(",");
      E.sel[g] = bruto.split(",").map(function (v) { return v.trim(); })
        .filter(function (v, i, arr) { return v && D.r[g] && D.r[g][v] && arr.indexOf(v) === i; });
    });
    E.q = (p.get("q") || "").trim().slice(0, 80);
  }

  function gravaUrl() {
    var partes = [];
    G.forEach(function (g) {
      if (E.sel[g].length) partes.push(g + "=" + E.sel[g].map(encodeURIComponent).join(","));
    });
    if (E.q) partes.push("q=" + encodeURIComponent(E.q).replace(/%20/g, "+"));
    var url = window.location.pathname + (partes.length ? "?" + partes.join("&") : "") + window.location.hash;
    try { history.replaceState(null, "", url); } catch (e) { /* arquivo local sem history */ }
  }

  function ativos() {
    var n = 0;
    G.forEach(function (g) { n += E.sel[g].length; });
    return n;
  }

  /* casa(item, estado, grupo a ignorar) */
  function casa(it, est, ignora) {
    for (var i = 0; i < G.length; i++) {
      var g = G[i];
      if (g === ignora) continue;
      var sel = est.sel[g];
      if (sel.length && !it.g[g].some(function (v) { return sel.indexOf(v) >= 0; })) return false;
    }
    if (est.alts.length) {
      for (var j = 0; j < est.alts.length; j++) {
        if (!est.alts[j].some(function (a) { return it.b.indexOf(a) >= 0; })) return false;
      }
    }
    return true;
  }

  function preparado(sel, q) {
    return { sel: sel, alts: termos(q).map(alternativas) };
  }

  function conta(est) {
    var n = 0;
    D.itens.forEach(function (it) { if (casa(it, est, null)) n++; });
    return n;
  }

  /* ---------------------------------------------------------- elementos */
  var galeria = $("[data-galeria]");
  var cards = {};
  $$(".painel[data-slug]", galeria).forEach(function (c) { cards[c.getAttribute("data-slug")] = c; });
  var secao = document.getElementById("projetos");
  var frase = $("#frase .frase-letras");
  var fraseSr = $("[data-frase-sr]");
  var anuncio = $("[data-anuncio]");
  var caixaAtivos = $("[data-ativos]");
  var vazio = $("[data-vazio]");
  var vazioOpcoes = $("[data-vazio-opcoes]");
  var vazioTexto = $("[data-vazio-texto]");
  var botaoFiltros = $(".botao-filtros");
  var qtd = $(".filtros-qtd");
  var painel = document.getElementById("filtros");
  var veu = $("[data-veu]");
  var linhas = $$(".cardapio .linha[data-grupo]");
  var cardapio = $(".cardapio");
  var chips = $$(".chip[data-grupo]");
  var form = $("[data-busca]");
  var campo = document.getElementById("busca");
  var limpaBusca = $("[data-limpa-busca]");

  /* ---------------------------------------------------------- frase do quadro, em letras */
  function letras(segmentos) {
    var i = 0;
    var html = "";
    segmentos.forEach(function (seg, k) {
      var palavras = String(seg.t).split(" ");
      var dentro = palavras.map(function (p) {
        var s = "";
        for (var c = 0; c < p.length; c++) {
          s += '<span class="l" style="--i:' + Math.min(i, 40) + '">' + esc(p[c]) + "</span>";
          i++;
        }
        i++;
        return '<span class="p">' + s + "</span>";
      }).join(" ");
      if (k > 0) html += seg.cola ? " " : " ";
      html += seg.c ? '<span class="' + seg.c + '">' + dentro + "</span>" : dentro;
    });
    return html;
  }

  /* a frase do quadro se lê como pedido: "8 projetos de sites e lojas virtuais em WordPress" */
  var LIGA = { area: "de", tipo: "do tipo", ferramenta: "em", setor: "do setor", formato: "no formato" };
  function segmentosDaFrase(n) {
    var segs = [{ t: String(n), c: "fn" }, { t: n === 1 ? "projeto" : "projetos" }];
    G.forEach(function (g) {
      var sel = E.sel[g];
      if (!sel.length) return;
      segs.push({ t: LIGA[g] || "com", c: "fsep" });
      sel.forEach(function (v, i) {
        if (i > 0) segs.push({ t: "ou", c: "fsep" });
        var curto = g === "area" && estreito.matches && D.curto && D.curto[v];
        segs.push({ t: curto || rotulo(g, v), c: "fsel" });
      });
    });
    if (E.q) {
      segs.push({ t: "com", c: "fsep" });
      segs.push({ t: "“" + E.q + "”", c: "fsel" });
    }
    return segs;
  }

  function textoDaFrase(segs) {
    return segs.map(function (s) { return s.t; }).join(" ");
  }

  var ultimaFrase = "";
  var tAnuncio = 0;
  function mostraFrase(n, anima) {
    var segs = segmentosDaFrase(n);
    var texto = textoDaFrase(segs);
    if (texto === ultimaFrase) return;
    ultimaFrase = texto;
    if (fraseSr) fraseSr.textContent = texto;
    if (frase) {
      frase.innerHTML = letras(segs);
      if (anima && !reduz.matches) {
        frase.classList.remove("assentando");
        void frase.offsetWidth;
        frase.classList.add("assentando");
      }
    }
    if (anima && anuncio) {
      clearTimeout(tAnuncio);
      tAnuncio = setTimeout(function () { anuncio.textContent = texto; }, 450);
    }
  }

  /* ---------------------------------------------------------- aplicar o estado na página */
  function atualiza(anima) {
    var est = preparado(E.sel, E.q);
    var total = 0;
    D.itens.forEach(function (it) {
      var ok = casa(it, est, null);
      if (ok) total++;
      var c = cards[it.s];
      if (c) c.hidden = !ok;
    });

    /* contagem prévia: quantos sobram se escolher este valor, mantendo os outros grupos */
    var cont = {};
    G.forEach(function (g) {
      cont[g] = {};
      D.itens.forEach(function (it) {
        if (!casa(it, est, g)) return;
        it.g[g].forEach(function (v) { cont[g][v] = (cont[g][v] || 0) + 1; });
      });
    });

    chips.forEach(function (ch) {
      var g = ch.getAttribute("data-grupo");
      var v = ch.getAttribute("data-valor");
      var marcado = E.sel[g] && E.sel[g].indexOf(v) >= 0;
      var n = (cont[g] && cont[g][v]) || 0;
      ch.setAttribute("aria-pressed", marcado ? "true" : "false");
      var nEl = $(".n", ch);
      if (nEl) nEl.textContent = String(n);
      ch.disabled = !marcado && n === 0;
    });
    ordenaChips();

    var temEscolha = false;
    linhas.forEach(function (ln) {
      var g = ln.getAttribute("data-grupo");
      var v = ln.getAttribute("data-valor");
      var acesa = E.sel[g] && E.sel[g].indexOf(v) >= 0;
      if (acesa) temEscolha = true;
      var n = (cont[g] && cont[g][v]) || 0;
      ln.classList.toggle("acesa", !!acesa);
      ln.classList.toggle("apagada", !acesa && n === 0);
      if (acesa) ln.setAttribute("aria-current", "true"); else ln.removeAttribute("aria-current");
      if (!acesa && n === 0) ln.setAttribute("aria-disabled", "true"); else ln.removeAttribute("aria-disabled");
      var nEl = $(".linha-n", ln);
      if (nEl) nEl.textContent = String(n);
    });
    if (cardapio) cardapio.classList.toggle("tem-escolha", temEscolha);

    $$("[data-total]").forEach(function (el) { el.textContent = String(total); });
    $$("[data-total-rot]").forEach(function (el) { el.textContent = total === 1 ? "projeto" : "projetos"; });

    var nAtivos = ativos();
    if (qtd) { qtd.textContent = String(nAtivos); qtd.hidden = nAtivos === 0; }
    if (botaoFiltros) botaoFiltros.setAttribute("aria-label", nAtivos ? "Filtros, " + nAtivos + " marcado" + (nAtivos > 1 ? "s" : "") : "Filtros");

    desenhaAtivos();
    desenhaVazio(total);
    mostraFrase(total, anima);
    if (limpaBusca) limpaBusca.hidden = !(campo && campo.value);
    gravaUrl();
  }

  /* em cada grupo, os chips que ainda servem vêm primeiro (na ordem original) e os apagados vão para o fim;
     só os primeiros aparecem, o resto fica atrás do "Mostrar mais" */
  var ordemOriginal = new Map();
  chips.forEach(function (ch, i) { ordemOriginal.set(ch, i); });
  function ordenaChips() {
    $$(".grupo", painel || document).forEach(function (grupo) {
      var caixa = $(".chips", grupo);
      if (!caixa) return;
      var lista = $$(".chip", caixa);
      var nova = lista.slice().sort(function (a, b) {
        var za = a.disabled ? 1 : 0;
        var zb = b.disabled ? 1 : 0;
        return za - zb || ordemOriginal.get(a) - ordemOriginal.get(b);
      });
      var mudou = nova.some(function (ch, i) { return ch !== lista[i]; });
      if (mudou && !caixa.contains(document.activeElement)) nova.forEach(function (ch) { caixa.appendChild(ch); });
      var atual = mudou && caixa.contains(document.activeElement) ? lista : nova;
      var extras = 0;
      var limite = grupo.getAttribute("data-grupo") === "area" ? 99 : LIMITE;
      atual.forEach(function (ch, i) {
        if (i >= limite) { ch.setAttribute("data-extra", ""); extras++; } else ch.removeAttribute("data-extra");
      });
      var mais = $("[data-mais]", grupo);
      if (mais) {
        mais.hidden = extras === 0;
        mais.setAttribute("data-rotulo", "Mostrar mais " + extras);
        if (!grupo.classList.contains("aberto")) mais.textContent = "Mostrar mais " + extras;
      }
    });
  }

  function desenhaAtivos() {
    if (!caixaAtivos) return;
    var partes = [];
    G.forEach(function (g) {
      E.sel[g].forEach(function (v) {
        partes.push('<button type="button" class="ativo" data-tira-grupo="' + esc(g) + '" data-tira-valor="' + esc(v) + '">' +
          '<span class="sr">Tirar filtro </span>' + esc(rotulo(g, v)) + icone() + "</button>");
      });
    });
    if (E.q) {
      partes.push('<button type="button" class="ativo" data-tira-busca><span class="sr">Tirar busca </span>“' + esc(E.q) + "”" + icone() + "</button>");
    }
    if (partes.length > 1) partes.push('<button type="button" class="limpa" data-limpa>Limpar tudo</button>');
    caixaAtivos.innerHTML = partes.join("");
    caixaAtivos.hidden = partes.length === 0;
  }

  function icone() {
    return '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  }

  function desenhaVazio(total) {
    if (!vazio) return;
    vazio.hidden = total > 0;
    if (galeria) galeria.hidden = total === 0;
    if (total > 0 || !vazioOpcoes) return;
    var opcoes = [];
    G.forEach(function (g) {
      E.sel[g].forEach(function (v) {
        var sel = {};
        G.forEach(function (h) { sel[h] = h === g ? E.sel[h].filter(function (x) { return x !== v; }) : E.sel[h]; });
        var n = conta(preparado(sel, E.q));
        if (n > 0) opcoes.push({ n: n, html: '<button type="button" class="ativo" data-tira-grupo="' + esc(g) + '" data-tira-valor="' + esc(v) + '">Tirar ' + esc(rotulo(g, v)) + " <span class=\"vazio-n\">(ficam " + n + ")</span></button>" });
      });
    });
    if (E.q) {
      var n = conta(preparado(E.sel, ""));
      if (n > 0) opcoes.push({ n: n, html: '<button type="button" class="ativo" data-tira-busca>Tirar a busca “' + esc(E.q) + '” <span class="vazio-n">(ficam ' + n + ")</span></button>" });
    }
    opcoes.sort(function (a, b) { return b.n - a.n; });
    vazioOpcoes.innerHTML = opcoes.map(function (o) { return o.html; }).join("");
    if (vazioTexto) vazioTexto.hidden = opcoes.length === 0;
  }

  /* ---------------------------------------------------------- ações */
  function vaiParaProjetos() {
    if (!secao) return;
    rola(secao.getBoundingClientRect().top + window.pageYOffset);
  }

  function alterna(g, v, unico) {
    var sel = E.sel[g];
    var i = sel.indexOf(v);
    if (unico) E.sel[g] = (i >= 0 && sel.length === 1) ? [] : [v];
    else if (i >= 0) sel.splice(i, 1);
    else sel.push(v);
    atualiza(true);
  }

  function limpaTudo() {
    G.forEach(function (g) { E.sel[g] = []; });
    E.q = "";
    if (campo) campo.value = "";
    atualiza(true);
  }

  linhas.forEach(function (ln) {
    ln.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button > 0) return;
      ev.preventDefault();
      if (ln.getAttribute("aria-disabled") === "true") return;
      alterna(ln.getAttribute("data-grupo"), ln.getAttribute("data-valor"), true);
      /* a linha acende antes de a página descer até os projetos */
      setTimeout(vaiParaProjetos, reduz.matches ? 0 : 240);
    });
  });

  chips.forEach(function (ch) {
    ch.addEventListener("click", function () {
      alterna(ch.getAttribute("data-grupo"), ch.getAttribute("data-valor"), false);
    });
  });

  document.addEventListener("click", function (ev) {
    var alvo = ev.target.closest ? ev.target : null;
    if (!alvo) return;
    var tira = alvo.closest("[data-tira-grupo]");
    if (tira) {
      var g = tira.getAttribute("data-tira-grupo");
      var v = tira.getAttribute("data-tira-valor");
      E.sel[g] = E.sel[g].filter(function (x) { return x !== v; });
      atualiza(true);
      focoDepoisDeTirar();
      return;
    }
    if (alvo.closest("[data-tira-busca]")) {
      E.q = "";
      if (campo) campo.value = "";
      atualiza(true);
      focoDepoisDeTirar();
      return;
    }
    if (alvo.closest("[data-limpa]")) {
      limpaTudo();
      if (alvo.closest(".ativos") || alvo.closest("[data-vazio]")) focoDepoisDeTirar();
      return;
    }
    var mais = alvo.closest("[data-mais]");
    if (mais) {
      var grupo = mais.closest(".grupo");
      var aberto = grupo.classList.toggle("aberto");
      mais.setAttribute("aria-expanded", aberto ? "true" : "false");
      if (!mais.hasAttribute("data-rotulo")) mais.setAttribute("data-rotulo", mais.textContent);
      mais.textContent = aberto ? "Mostrar menos" : mais.getAttribute("data-rotulo");
      return;
    }
    if (painel && !painel.hidden && !celular.matches && !alvo.closest("#filtros") && !alvo.closest(".botao-filtros")) fechaPainel(false);
  });

  /* depois de tirar um filtro o botão some; o foco vai para o primeiro que sobrou ou para o botão Filtros */
  function focoDepoisDeTirar() {
    var prox = caixaAtivos && $(".ativo", caixaAtivos);
    if (prox) prox.focus();
    else if (botaoFiltros) botaoFiltros.focus();
  }

  /* ---------------------------------------------------------- busca */
  if (form && campo) {
    var tBusca = 0;
    campo.addEventListener("input", function () {
      if (limpaBusca) limpaBusca.hidden = !campo.value;
      clearTimeout(tBusca);
      tBusca = setTimeout(function () {
        var q = campo.value.trim().slice(0, 80);
        if (q !== E.q) { E.q = q; atualiza(true); }
      }, 180);
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      clearTimeout(tBusca);
      E.q = campo.value.trim().slice(0, 80);
      atualiza(true);
      campo.blur();
      vaiParaProjetos();
    });
    if (limpaBusca) {
      limpaBusca.addEventListener("click", function () {
        campo.value = "";
        E.q = "";
        atualiza(true);
        campo.focus();
      });
    }
  }

  /* ---------------------------------------------------------- painel de filtros */
  var focoAntes = null;

  function focaveis() {
    return $$("button:not([disabled]), [href], input, [tabindex]:not([tabindex='-1'])", painel)
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function abrePainel() {
    if (!painel) return;
    focoAntes = document.activeElement;
    painel.hidden = false;
    botaoFiltros.setAttribute("aria-expanded", "true");
    if (celular.matches) {
      painel.setAttribute("role", "dialog");
      painel.setAttribute("aria-modal", "true");
      if (veu) veu.hidden = false;
      document.documentElement.style.overflow = "hidden";
      painel.classList.add("abrindo");
      painel.addEventListener("animationend", function fim() {
        painel.classList.remove("abrindo");
        painel.removeEventListener("animationend", fim);
      });
      var primeiro = $(".chip:not([disabled])", painel) || $(".fecha", painel);
      if (primeiro) primeiro.focus();
    } else {
      painel.removeAttribute("role");
      painel.removeAttribute("aria-modal");
    }
  }

  function fechaPainel(devolveFoco) {
    if (!painel || painel.hidden) return;
    painel.hidden = true;
    painel.classList.remove("abrindo");
    botaoFiltros.setAttribute("aria-expanded", "false");
    if (veu) veu.hidden = true;
    document.documentElement.style.overflow = "";
    if (devolveFoco !== false && botaoFiltros) botaoFiltros.focus();
  }

  if (botaoFiltros && painel) {
    botaoFiltros.addEventListener("click", function () {
      if (painel.hidden) abrePainel(); else fechaPainel(false);
    });
    $$("[data-fecha]", painel).forEach(function (b) { b.addEventListener("click", function () { fechaPainel(true); }); });
    var ver = $("[data-ver]", painel);
    if (ver) {
      ver.addEventListener("click", function () {
        fechaPainel(false);
        vaiParaProjetos();
        var primeiro = galeria && $(".painel:not([hidden]) a", galeria);
        if (primeiro) primeiro.focus({ preventScroll: true });
      });
    }
    if (veu) veu.addEventListener("click", function () { fechaPainel(true); });
    document.addEventListener("keydown", function (ev) {
      if (painel.hidden) return;
      if (ev.key === "Escape") { ev.preventDefault(); fechaPainel(true); return; }
      if (ev.key === "Tab" && celular.matches) {
        var f = focaveis();
        if (!f.length) return;
        var primeiro = f[0];
        var ultimo = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
      }
    });
    var aoMudar = function () { fechaPainel(false); };
    if (celular.addEventListener) celular.addEventListener("change", aoMudar);
    else if (celular.addListener) celular.addListener(aoMudar);
  }

  /* ---------------------------------------------------------- início */
  leUrl();
  if (campo && E.q) campo.value = E.q;
  atualiza(false);
  if ((ativos() || E.q) && secao) {
    window.requestAnimationFrame(function () {
      window.scrollTo(0, secao.getBoundingClientRect().top + window.pageYOffset);
    });
  }
})();
