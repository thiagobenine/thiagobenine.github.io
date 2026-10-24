/* Portfólio Thiago Benine, versão Comando: menu do celular, imagem ampliada, busca com resultados na paleta,
   filtros combináveis com contagem prévia e estado na URL. Sem dependências. */
(function () {
  "use strict";

  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)");
  var celular = window.matchMedia("(max-width: 959px)");
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

  /* ---------------------------------------------------------- imagem ampliada
     Um fundo escuro cobre a página com a maior versão da foto. Setas, teclado, deslizar, pinça e
     toque duplo no celular; fecha com X, Esc, toque fora, deslizar para baixo e o voltar do navegador. */
  function ampliacao() {
    var links = $$("[data-amplia]");
    if (!links.length || !document.body.appendChild) return;

    function svg(d, tam) {
      return '<svg class="ic" viewBox="0 0 24 24" width="' + tam + '" height="' + tam + '" aria-hidden="true" focusable="false" ' +
        'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";
    }
    var itens = links.map(function (a) {
      var img = $("img", a);
      var fig = a.closest ? a.closest("figure") : null;
      var leg = fig ? $("figcaption", fig) : null;
      var legTxt = a.getAttribute("data-leg") || (leg ? leg.textContent.trim() : "");
      return {
        a: a, img: img, src: a.href,
        w: Number(a.getAttribute("data-w")) || 1600, h: Number(a.getAttribute("data-h")) || 1067,
        alt: img ? img.getAttribute("alt") || "" : "", leg: legTxt
      };
    });
    var total = itens.length;
    var h1 = document.getElementById("titulo-projeto");
    var titulo = h1 ? ($(".sr", h1) || h1).textContent.trim() : "";

    var luz = document.createElement("div");
    luz.className = "luz" + (total === 1 ? " luz-uma" : "");
    luz.hidden = true;
    luz.tabIndex = -1;
    luz.setAttribute("role", "dialog");
    luz.setAttribute("aria-modal", "true");
    luz.setAttribute("aria-label", titulo ? "Imagens ampliadas: " + titulo : "Imagens ampliadas do projeto");
    luz.innerHTML =
      '<p class="luz-titulo" aria-hidden="true">' + esc(titulo) + "</p>" +
      '<button type="button" class="luz-botao luz-fecha" aria-label="Fechar a imagem ampliada">' + svg('<path d="M6 6l12 12M18 6 6 18"/>', 22) + "</button>" +
      '<div class="luz-palco"><img class="luz-img" alt="" draggable="false"></div>' +
      '<p class="luz-legenda" aria-hidden="true"></p>' +
      '<button type="button" class="luz-botao luz-seta luz-ant" aria-label="Imagem anterior">' + svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 22) + "</button>" +
      '<p class="luz-conta" aria-hidden="true"><span class="luz-n"></span><span class="luz-de"> / ' + total + "</span></p>" +
      '<button type="button" class="luz-botao luz-seta luz-prox" aria-label="Próxima imagem">' + svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 22) + "</button>" +
      '<p class="sr" aria-live="polite" aria-atomic="true"></p>';
    document.body.appendChild(luz);

    var palco = $(".luz-palco", luz);
    var foto = $(".luz-img", luz);
    var legenda = $(".luz-legenda", luz);
    var numero = $(".luz-n", luz);
    var fecha = $(".luz-fecha", luz);
    var ant = $(".luz-ant", luz);
    var prox = $(".luz-prox", luz);
    var aviso = $("[aria-live]", luz);

    var aberto = false, empurrou = false, focoAntes = null, inertes = [];
    var atual = 0;
    var s = 1, tx = 0, ty = 0;       /* zoom e deslocamento da foto */
    var W = 0, H = 0, iw = 0, ih = 0; /* palco e foto encaixada */
    var MAX = 4;

    function aplica(anima) {
      foto.style.transition = anima && !reduz.matches ? "transform .22s cubic-bezier(.16, 1, .3, 1), opacity .2s" : "none";
      foto.style.transform = "translate(" + tx + "px, " + ty + "px) scale(" + s + ")";
    }
    function limita() {
      var mx = Math.max(0, (iw * s - W) / 2);
      var my = Math.max(0, (ih * s - H) / 2);
      tx = Math.min(mx, Math.max(-mx, tx));
      ty = Math.min(my, Math.max(-my, ty));
    }
    function encaixa() {
      var it = itens[atual];
      W = palco.clientWidth;
      H = palco.clientHeight;
      var r = Math.min(W / it.w, H / it.h, 2);
      iw = Math.round(it.w * r);
      ih = Math.round(it.h * r);
      foto.style.width = iw + "px";
      foto.style.height = ih + "px";
      s = 1; tx = 0; ty = 0;
      foto.style.opacity = "";
      aplica(false);
    }

    var precarregadas = {};
    function precarrega(k) {
      if (k < 0 || k >= total || precarregadas[k]) return;
      precarregadas[k] = new Image();
      precarregadas[k].src = itens[k].src;
    }

    function mostra(direcao) {
      var it = itens[atual];
      encaixa();
      /* começa com a versão que a página já baixou e troca pela maior quando ela chega */
      var ja = it.img && it.img.complete && it.img.naturalWidth ? (it.img.currentSrc || it.img.src) : "";
      foto.alt = it.alt;
      if (ja && ja !== it.src) {
        foto.src = ja;
        var grande = precarregadas[atual] || new Image();
        precarregadas[atual] = grande;
        var troca = function () { if (itens[atual] === it && aberto) foto.src = it.src; };
        if (grande.complete && grande.naturalWidth) troca();
        else { grande.addEventListener("load", troca); if (!grande.src) grande.src = it.src; }
      } else {
        foto.src = it.src;
      }
      legenda.textContent = it.leg;
      legenda.hidden = !it.leg;
      var n = String(atual + 1);
      numero.textContent = n;
      if (direcao && !reduz.matches) {
        foto.classList.remove("entra-prox", "entra-ant");
        void foto.offsetWidth;
        foto.classList.add(direcao > 0 ? "entra-prox" : "entra-ant");
      }
      var focado = document.activeElement;
      ant.disabled = atual === 0;
      prox.disabled = atual === total - 1;
      /* a seta que acabou de apagar estava com o foco: ele passa para a outra */
      if (focado && focado.disabled) (prox.disabled ? (ant.disabled ? fecha : ant) : prox).focus();
      aviso.textContent = "Imagem " + n + " de " + total + (it.leg ? ". " + it.leg : "");
      precarrega(atual + 1);
      precarrega(atual - 1);
    }

    function vai(k) {
      if (k < 0 || k >= total) { tx = 0; ty = 0; aplica(true); return; }
      var direcao = k > atual ? 1 : -1;
      atual = k;
      mostra(direcao);
    }

    function abre(k) {
      if (aberto) return;
      aberto = true;
      atual = k;
      focoAntes = document.activeElement;
      luz.hidden = false;
      document.documentElement.classList.add("luz-aberta");
      inertes = [];
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el !== luz && !el.inert && el.tagName !== "SCRIPT") { el.inert = true; el.setAttribute("aria-hidden", "true"); inertes.push(el); }
      });
      mostra(0);
      luz.focus({ preventScroll: true });
      try { history.pushState({ luz: true }, ""); empurrou = true; } catch (e) { empurrou = false; }
    }

    function desmonta() {
      if (!aberto) return;
      aberto = false;
      luz.hidden = true;
      document.documentElement.classList.remove("luz-aberta");
      inertes.forEach(function (el) { el.inert = false; el.removeAttribute("aria-hidden"); });
      inertes = [];
      /* o foco volta para a foto em que a pessoa parou, e a galeria mostra essa foto */
      var alvo = itens[atual].a;
      if (alvo.scrollIntoView) alvo.scrollIntoView({ block: "nearest", inline: "center" });
      (alvo || focoAntes).focus({ preventScroll: true });
    }

    function fechaLuz() {
      if (!aberto) return;
      desmonta();
      if (empurrou) { empurrou = false; history.back(); }
    }

    window.addEventListener("popstate", function () {
      if (aberto) { empurrou = false; desmonta(); }
    });

    links.forEach(function (a, k) {
      a.addEventListener("click", function (ev) {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button > 0) return;
        ev.preventDefault();
        abre(k);
      });
    });
    fecha.addEventListener("click", fechaLuz);
    ant.addEventListener("click", function () { vai(atual - 1); });
    prox.addEventListener("click", function () { vai(atual + 1); });
    /* toque ou clique no fundo, fora da foto e dos botões, fecha (menos o clique que termina um arrasto) */
    var arrastou = false;
    luz.addEventListener("click", function (ev) {
      if (arrastou) { arrastou = false; return; }
      if (ev.target === luz || ev.target === palco) fechaLuz();
    });

    document.addEventListener("keydown", function (ev) {
      if (!aberto) return;
      if (ev.key === "Escape") { ev.preventDefault(); fechaLuz(); return; }
      if (ev.key === "ArrowLeft") { ev.preventDefault(); vai(atual - 1); return; }
      if (ev.key === "ArrowRight") { ev.preventDefault(); vai(atual + 1); return; }
      if (ev.key === "Home") { ev.preventDefault(); if (atual > 0) vai(0); return; }
      if (ev.key === "End") { ev.preventDefault(); if (atual < total - 1) vai(total - 1); return; }
      if (ev.key === "Tab") {
        var f = [fecha, ant, prox].filter(function (b) { return !b.disabled && b.offsetParent !== null; });
        if (!f.length) { ev.preventDefault(); return; }
        var primeiro = f[0], ultimo = f[f.length - 1], ativo = document.activeElement;
        if (ev.shiftKey && (ativo === primeiro || ativo === luz)) { ev.preventDefault(); ultimo.focus(); }
        else if (!ev.shiftKey && (ativo === ultimo || f.indexOf(ativo) < 0)) { ev.preventDefault(); primeiro.focus(); }
      }
    });

    window.addEventListener("resize", function () {
      if (aberto && (palco.clientWidth !== W || palco.clientHeight !== H)) encaixa();
    });

    /* ---- gestos: deslizar troca a foto, pinça e toque duplo dão zoom, arrastar com zoom move a foto */
    var dedos = {};
    var gesto = null;
    var ultimoToque = null;

    function centro() {
      var r = palco.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    function doisDedos() {
      var ids = Object.keys(dedos);
      var a = dedos[ids[0]], b = dedos[ids[1]];
      var c = centro();
      return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2 - c.x, y: (a.y + b.y) / 2 - c.y };
    }
    function zoomEm(px, py, novo) {
      var qx = (px - tx) / s, qy = (py - ty) / s;
      s = novo;
      tx = px - s * qx;
      ty = py - s * qy;
      limita();
    }

    palco.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      if (ev.pointerType === "mouse") ev.preventDefault();
      arrastou = false;
      dedos[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var n = Object.keys(dedos).length;
      if (n === 2) {
        var p = doisDedos();
        gesto = { tipo: "pinca", d0: p.d, s0: s, qx: (p.x - tx) / s, qy: (p.y - ty) / s };
        arrastou = true;
      } else if (n === 1) {
        gesto = { tipo: "um", x0: ev.clientX, y0: ev.clientY, tx0: tx, ty0: ty, t0: Date.now(), eixo: null, alvo: ev.target, tipoPonteiro: ev.pointerType };
      }
    });

    /* movimento e soltura ouvidos na janela: o arrasto pode sair do palco sem perder o fim */
    window.addEventListener("pointermove", function (ev) {
      if (!dedos[ev.pointerId] || !gesto) return;
      dedos[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      if (gesto.tipo === "pinca" && Object.keys(dedos).length >= 2) {
        var p = doisDedos();
        s = Math.min(MAX, Math.max(1, gesto.s0 * p.d / gesto.d0));
        tx = p.x - s * gesto.qx;
        ty = p.y - s * gesto.qy;
        limita();
        aplica(false);
        return;
      }
      if (gesto.tipo !== "um") return;
      var dx = ev.clientX - gesto.x0, dy = ev.clientY - gesto.y0;
      if (!gesto.eixo) {
        if (Math.hypot(dx, dy) < 8) return;
        gesto.eixo = s > 1.01 ? "mover" : Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        arrastou = true;
      }
      if (gesto.eixo === "mover") {
        tx = gesto.tx0 + dx;
        ty = gesto.ty0 + dy;
        limita();
      } else if (gesto.eixo === "x") {
        var semVizinha = (dx > 0 && atual === 0) || (dx < 0 && atual === total - 1);
        tx = semVizinha ? dx * 0.3 : dx;
      } else {
        ty = dy > 0 ? dy : dy * 0.25;
        foto.style.opacity = String(1 - Math.min(Math.abs(ty) / 600, 0.4));
      }
      aplica(false);
    });

    function solta(ev) {
      if (!dedos[ev.pointerId]) return;
      delete dedos[ev.pointerId];
      var resta = Object.keys(dedos);
      if (!gesto) return;
      if (gesto.tipo === "pinca") {
        if (resta.length === 1) {
          var d = dedos[resta[0]];
          gesto = { tipo: "um", x0: d.x, y0: d.y, tx0: tx, ty0: ty, t0: 0, eixo: "mover" };
        } else if (!resta.length) {
          if (s < 1.05) { s = 1; tx = 0; ty = 0; aplica(true); }
          gesto = null;
        }
        return;
      }
      if (resta.length) return;
      var g = gesto;
      gesto = null;
      var dx = ev.clientX - g.x0, dy = ev.clientY - g.y0;
      var dt = Math.max(1, Date.now() - g.t0);
      if (!g.eixo) {
        if (ev.type === "pointercancel" || dt > 500) return;
        /* toque no fundo: quem fecha é o clique; na foto, só o toque duplo faz algo */
        if (g.alvo !== foto || g.tipoPonteiro === "mouse") return;
        var agora = Date.now();
        if (ultimoToque && agora - ultimoToque.t < 320 && Math.hypot(ev.clientX - ultimoToque.x, ev.clientY - ultimoToque.y) < 32) {
          ultimoToque = null;
          var c = centro();
          if (s > 1.01) { s = 1; tx = 0; ty = 0; } else zoomEm(ev.clientX - c.x, ev.clientY - c.y, 2.5);
          aplica(true);
        } else {
          ultimoToque = { t: agora, x: ev.clientX, y: ev.clientY };
        }
        return;
      }
      if (g.eixo === "x") {
        var rapido = Math.abs(dx) / dt > 0.5 && Math.abs(dx) > 30;
        if ((dx < -70 || (rapido && dx < 0)) && atual < total - 1) vai(atual + 1);
        else if ((dx > 70 || (rapido && dx > 0)) && atual > 0) vai(atual - 1);
        else { tx = 0; aplica(true); }
      } else if (g.eixo === "y") {
        if (dy > 120 || (dy > 40 && dy / dt > 0.6)) fechaLuz();
        else { ty = 0; foto.style.opacity = ""; aplica(true); }
      }
    }
    window.addEventListener("pointerup", solta);
    window.addEventListener("pointercancel", solta);
  }
  ampliacao();

  /* ---------------------------------------------------------- menu do celular e atalho de busca */
  (function menu() {
    var nav = $(".nav");
    var bm = $(".nav .bm");
    if (!nav || !bm) return;
    function poe(aberto) {
      nav.classList.toggle("aberto", aberto);
      bm.setAttribute("aria-expanded", aberto ? "true" : "false");
      bm.setAttribute("aria-label", aberto ? "Fechar menu" : "Menu");
    }
    bm.addEventListener("click", function () { poe(!nav.classList.contains("aberto")); });
    $$(".links a", nav).forEach(function (a) { a.addEventListener("click", function () { poe(false); }); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && nav.classList.contains("aberto")) { poe(false); bm.focus(); }
    });
    var aoMudar = function () { if (!celular.matches) poe(false); };
    if (celular.addEventListener) celular.addEventListener("change", aoMudar);
  })();
  (function atalho() {
    var campo = document.getElementById("busca");
    if (!campo) return;
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
    $$("[data-tecla]").forEach(function (k) { if (mac) k.textContent = "⌘"; });
    document.addEventListener("keydown", function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === "k" || ev.key === "K")) {
        ev.preventDefault();
        var r = campo.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) rola(r.top + window.pageYOffset - 120);
        campo.focus({ preventScroll: true });
        campo.select();
      }
    });
  })();

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

  var porSlug = {};
  D.itens.forEach(function (it) { porSlug[it.s] = it; });
  function relevancia(it, est) {
    if (!it || !it.t) return 0;
    var n = 0;
    est.alts.forEach(function (alts) { if (alts.some(function (a) { return it.t.indexOf(a) >= 0; })) n++; });
    return n;
  }

  function conta(est) {
    var n = 0;
    D.itens.forEach(function (it) { if (casa(it, est, null)) n++; });
    return n;
  }

  /* ---------------------------------------------------------- elementos */
  var secao = document.getElementById("projetos");
  var cards = {};
  $$("[data-slug]", secao || document).forEach(function (c) { cards[c.getAttribute("data-slug")] = c; });
  var grades = $$(".grade", secao || document).map(function (el) {
    return { el: el, ordem: $$(".pc[data-slug]", el) };
  });
  var todosLink = $("[data-todos]");
  var seg = $(".seg");
  var palRes = $("[data-pal-res]");
  var palNada = $("[data-pal-nada]");
  var palLista = document.getElementById("pal-lista");
  var palGl = $(".pal .gl");
  var noIndiceGeral = !!(secao && secao.classList.contains("indice-projetos"));
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
  var linhas = $$(".tipo-link[data-grupo]");
  var chips = $$(".chip[data-grupo]");
  var form = $("[data-busca]");
  var campo = document.getElementById("busca");
  var limpaBusca = $("[data-limpa-busca]");

  /* ---------------------------------------------------------- frase da faixa, em trechos com tom próprio */
  function letras(segmentos) {
    var html = "";
    segmentos.forEach(function (seg, k) {
      var dentro = esc(String(seg.t));
      if (k > 0) html += seg.cola ? "\u00a0" : " ";
      html += seg.c ? '<span class="' + seg.c + '">' + dentro + "</span>" : dentro;
    });
    return html;
  }

  /* a frase da faixa se lê como pedido: "8 trabalhos de sites e lojas virtuais em WordPress" */
  var LIGA = { area: "de", tipo: "do tipo", ferramenta: "em", setor: "do setor", formato: "no formato" };
  function segmentosDaFrase(n) {
    var segs = [{ t: String(n), c: "fn" }, { t: n === 1 ? "trabalho" : "trabalhos" }];
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
    if (noIndiceGeral && segs.length === 2 && D.areas) segs.push({ t: "neste portfólio, em " + D.areas + " áreas", c: "fsep" });
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
    /* com busca, o que casa no título e no tipo vem primeiro; sem busca, volta a ordem do build */
    grades.forEach(function (g) {
      var ordem = g.ordem.slice();
      if (est.alts.length) {
        var pos = new Map();
        ordem.forEach(function (c, i) { pos.set(c, i); });
        ordem.sort(function (x, y) {
          return relevancia(porSlug[y.getAttribute("data-slug")], est) - relevancia(porSlug[x.getAttribute("data-slug")], est) || pos.get(x) - pos.get(y);
        });
      }
      var atual = $$(".pc[data-slug]", g.el);
      if (ordem.some(function (c, i) { return atual[i] !== c; })) ordem.forEach(function (c) { g.el.appendChild(c); });
      g.el.hidden = !ordem.some(function (c) { return !c.hidden; });
    });
    if (seg) seg.classList.toggle("com-tipo", !!(E.sel.tipo && E.sel.tipo.length));
    if (todosLink) {
      var semTipo = !(E.sel.tipo && E.sel.tipo.length);
      todosLink.classList.toggle("on", semTipo);
      if (semTipo) todosLink.setAttribute("aria-current", "true"); else todosLink.removeAttribute("aria-current");
    }

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
      var nEl = $(".num", ln);
      if (nEl) nEl.textContent = String(n);
    });


    $$("[data-total]").forEach(function (el) { el.textContent = String(total); });
    $$("[data-total-rot]").forEach(function (el) { el.textContent = total === 1 ? "trabalho" : "trabalhos"; });

    var nAtivos = ativos();
    if (qtd) { qtd.textContent = String(nAtivos); qtd.hidden = nAtivos === 0; }
    /* no índice, com busca ou filtro, os resultados entram no lugar da prancha de áreas */
    if (secao) secao.classList.toggle("filtrando", nAtivos > 0 || !!E.q);
    if (botaoFiltros) botaoFiltros.setAttribute("aria-label", nAtivos ? "Filtros, " + nAtivos + " marcado" + (nAtivos > 1 ? "s" : "") : "Filtros");

    desenhaAtivos();
    desenhaVazio(total);
    mostraFrase(total, anima);
    desenhaPaleta(est, total);
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
    if (total === 0) grades.forEach(function (g) { g.el.hidden = true; });
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

  /* lista da página inicial: abre os trabalhos que ficaram depois dos 12 primeiros */
  $$("[data-dobra-btn]").forEach(function (b) {
    b.addEventListener("click", function () {
      var lista = b.closest(".lista");
      if (!lista) return;
      lista.classList.add("aberta");
      var prox = $$(".pc:not([hidden]) a", lista)[12];
      if (prox) prox.focus();
    });
  });

  if (todosLink) {
    todosLink.addEventListener("click", function (ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button > 0) return;
      ev.preventDefault();
      E.sel.tipo = [];
      atualiza(true);
    });
  }

  /* ---------------------------------------------------------- resultados na paleta da página inicial */
  var SETA = '<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5l7-7M6 4.5h5.5V10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  var prefixo = (form && form.getAttribute("data-prefixo")) || "";
  function desenhaPaleta(est, total) {
    if (!palRes) return;
    var q = campo ? campo.value.trim() : "";
    var digitando = !!q;
    if (palLista) palLista.hidden = digitando;
    if (palGl) palGl.hidden = digitando;
    if (!digitando) { palRes.hidden = true; if (palNada) palNada.hidden = true; palRes.innerHTML = ""; return; }
    var achados = D.itens.filter(function (it) { return casa(it, est, null); });
    if (est.alts.length) {
      var pos = new Map();
      achados.forEach(function (it, i) { pos.set(it, i); });
      achados.sort(function (x, y) { return relevancia(y, est) - relevancia(x, est) || pos.get(x) - pos.get(y); });
    }
    var html = achados.slice(0, 6).map(function (it) {
      var img = it.h ? '<img src="' + esc(prefixo + it.h) + '" alt="" width="50" height="50" loading="lazy">' : '<span class="tk"></span>';
      return '<a class="it" href="' + esc(prefixo + "projeto/" + it.s + "/") + '">' + img + "<div><b>" + esc(it.n) + "</b><span>" + esc(it.a) + "</span></div>" +
        '<span class="r ic">' + SETA + "</span></a>";
    }).join("");
    if (total > 0) {
      html += '<a class="it vertudo" href="#projetos"><b>Ver ' + (total === 1 ? "o resultado" : "os " + total + " resultados") + "</b>" +
        '<span class="seta">' + SETA + "</span></a>";
    }
    palRes.innerHTML = html;
    palRes.hidden = total === 0;
    if (palNada) {
      palNada.hidden = total > 0;
      if (total === 0) palNada.textContent = "Nenhum trabalho com “" + q + "”. Tente outra palavra ou escolha uma área.";
    }
  }
  if (palRes) {
    palRes.addEventListener("click", function (ev) {
      var vt = ev.target.closest && ev.target.closest(".vertudo");
      if (!vt) return;
      ev.preventDefault();
      vaiParaProjetos();
    });
  }
  /* setas e Enter percorrem a paleta como numa paleta de comandos */
  if (campo && $(".pal")) {
    $(".pal").addEventListener("keydown", function (ev) {
      if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
      var caixa = palRes && !palRes.hidden ? palRes : palLista;
      if (!caixa || caixa.hidden) return;
      var itens = $$("a.it", caixa);
      if (!itens.length) return;
      var i = itens.indexOf(document.activeElement);
      ev.preventDefault();
      if (ev.key === "ArrowDown") (i < 0 ? itens[0] : itens[Math.min(itens.length - 1, i + 1)]).focus();
      else if (i <= 0) campo.focus();
      else itens[i - 1].focus();
    });
  }

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
        var primeiro = $(".pc:not([hidden]) a", secao);
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
