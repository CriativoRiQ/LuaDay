/* =========================================================
   Lua Fitwear · Motion (GSAP 3 + ScrollTrigger)
   - Abertura com zoom in (timeline com scrubber/mask/icon/text)
   - Raios de luz da lua reagindo à rolagem
   - Reveals, parallax, contadores e marquees
   - gsap.matchMedia() respeitando prefers-reduced-motion
   ========================================================= */
(function () {
  "use strict";

  var intro = document.getElementById("intro");
  function removeIntro() {
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    intro = null;
  }

  // Sem GSAP (CDN bloqueado/offline): página funciona estática.
  if (!window.gsap) { removeIntro(); return; }
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("gsap-on");

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return [].slice.call((ctx || document).querySelectorAll(s)); };

  /* ---------- Utilitário: divide títulos em palavras ---------- */
  function splitWords(el) {
    if (el.getAttribute("data-split")) return $$(".wi", el);
    el.setAttribute("data-split", "1");
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    var texts = [];
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) texts.push(c);
        else if (c.nodeType === 1) walk(c);
      });
    })(el);
    texts.forEach(function (t) {
      var frag = document.createDocumentFragment();
      t.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
        var o = document.createElement("span"); o.className = "w"; o.setAttribute("aria-hidden", "true");
        var i = document.createElement("span"); i.className = "wi"; i.textContent = part;
        o.appendChild(i); frag.appendChild(o);
      });
      t.parentNode.replaceChild(frag, t);
    });
    return $$(".wi", el);
  }

  /* ---------- Contadores ---------- */
  var counters = $$("[data-count]");
  function runCounters(instant) {
    counters.forEach(function (el) {
      var end = +el.getAttribute("data-count"), suf = el.getAttribute("data-suffix") || "", o = { v: 0 };
      if (instant) { el.textContent = end + suf; return; }
      gsap.to(o, { v: end, duration: 1.6, ease: "power3.out", onUpdate: function () { el.textContent = Math.round(o.v) + suf; } });
    });
  }

  /* =========================================================
     ABERTURA — timeline no padrão enviado (scrubber, mask, icon1, text1)
     ========================================================= */
  var heroWords = splitWords($("#hero-title"));

  function sequence2() {
    var s = gsap.timeline();
    s.to(".icon1", { scale: 7, autoAlpha: 0, duration: 0.9, ease: "power3.in" })        // zoom atravessando a logo
     .to(".intro .text1, .intro .track", { autoAlpha: 0, duration: 0.3 }, "<")
     .to("#intro", { autoAlpha: 0, duration: 0.5, onComplete: removeIntro }, "-=0.35")
     .from(".hero .wrap", { scale: 1.22, filter: "blur(14px)", autoAlpha: 0, duration: 1.3, ease: "expo.out", transformOrigin: "50% 40%", clearProps: "filter,transform" }, "<")
     .from(".site-header", { yPercent: -100, autoAlpha: 0, duration: 0.8, ease: "power3.out" }, "<0.2")
     .from(heroWords, { yPercent: 110, duration: 0.9, ease: "power4.out", stagger: 0.045 }, "<0.1")
     .from(".hero .tag", { clipPath: "inset(0 100% 0 0)", clearProps: "clipPath", duration: 0.7, ease: "power2.out" }, "<")
     .from(".arch", { clipPath: "inset(100% 0 0 0 round 999px 999px 0 0)", clearProps: "clipPath", duration: 1.2, ease: "expo.out" }, "<0.1")
     .from(".arch img", { scale: 1.35, duration: 1.6, ease: "expo.out" }, "<")
     .fromTo(".emblem", { scale: 0, rotation: -120 }, { scale: 1, rotation: 0, duration: 1, ease: "back.out(1.7)" }, "<0.3")
     .from(".windmill", { scale: 0.6, autoAlpha: 0, duration: 1.2, ease: "expo.out" }, "<")
     .from(".arch-wrap .pill", { y: 30, autoAlpha: 0, stagger: 0.15, duration: 0.6, ease: "back.out(2)" }, "<0.3")
     .from(".hero .lead, .stats li", { y: 30, autoAlpha: 0, stagger: 0.08, duration: 0.7, ease: "power3.out" }, "<")
     .add(function () { runCounters(false); }, "<0.2");
    return s;
  }

  function startIntro() {
    if (!intro || reduceQuery.matches) {
      removeIntro();
      runCounters(true);
      return;
    }
    var track = $(".intro .track");
    gsap.set(".icon1", { scale: 0.25, autoAlpha: 0 });
    gsap.set(".intro .text1", { scale: 0.9, autoAlpha: 0 });
    counters.forEach(function (el) { el.textContent = "0" + (el.getAttribute("data-suffix") || ""); });

    const tl = gsap.timeline({ paused: true });

    tl.to(".scrubber", { x: function () { return track.offsetWidth; }, duration: 2, ease: "power2.inOut" })
      .to(".mask", { scaleX: 0, duration: 2, ease: "power2.inOut" }, "<")
      .to(".icon1", { scale: 1, autoAlpha: 1, duration: 0.3, ease: "back.out(1.6)" }, 0.5)
      .to(".text1", { autoAlpha: 1, scale: 1 }, "-=0.2")

      .add(sequence2(), "+=0.1").timeScale(0.8);

    // Primeira visita: abertura completa. Visitas seguintes na sessão: pula para 1.2s.
    var seen = false;
    try { seen = sessionStorage.getItem("lua_intro") === "1"; sessionStorage.setItem("lua_intro", "1"); } catch (e) {}
    if (seen) tl.seek(1.2).play(); else tl.play();

    // Clique, toque ou tecla acelera a abertura
    function skip() { tl.timeScale(3.5); window.removeEventListener("keydown", skip); }
    if (intro) intro.addEventListener("click", skip);
    window.addEventListener("keydown", skip);
  }
  startIntro();

  /* =========================================================
     MATCHMEDIA — padrão enviado, com reduceMotion
     ========================================================= */
  let mm = gsap.matchMedia();

  mm.add({
    reduceMotion: "(prefers-reduced-motion: reduce)",
    isDesktop: "(min-width: 960px)"
  }, (context) => {

    let { reduceMotion, isDesktop } = context.conditions;

    // Órbita com pontos dourados ao redor da foto do hero
    gsap.to(".windmill", {
      rotation: 360,
      // ajuste do tempo conforme a preferência de movimento
      duration: reduceMotion ? 72 : 36,
      repeat: -1,
      ease: "none"
    });

    if (reduceMotion || !window.ScrollTrigger) return;

    /* ---------- Raios de luz da lua ---------- */
    var rays = $$(".rays i");
    rays.forEach(function (r, i) {
      gsap.set(r, { rotation: -14 - i * 10, scaleX: 0.85 + (i % 3) * 0.1, opacity: 0.55 + (i % 2) * 0.25 });
      gsap.to(r, { rotation: "+=" + (i % 2 ? 6 : -6), duration: 5 + i, repeat: -1, yoyo: true, ease: "sine.inOut" });
    });
    gsap.to(".rays", {
      rotation: -22, ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1.2 }
    });
    gsap.to(".moon-glow", {
      yPercent: 40, xPercent: -10, ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 1.5 }
    });
    var lightTo = gsap.quickTo(".moonlight", "opacity", { duration: 0.6, ease: "power2.out" });
    var stretch = gsap.quickTo(".rays", "scale", { duration: 0.8, ease: "power2.out" });
    var calm;
    ScrollTrigger.create({
      trigger: document.body, start: "top top", end: "bottom bottom",
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 2200, 1);
        lightTo(0.5 + v * 0.5);
        stretch(1 + v * 0.25);
        clearTimeout(calm);
        calm = setTimeout(function () { lightTo(0.5); stretch(1); }, 180);
      }
    });

    /* ---------- Faixas (marquee) aceleram com a rolagem ---------- */
    $$(".ribbon").forEach(function (rb, i) {
      var track = $(".ribbon-track", rb);
      var loop = i % 2
        ? gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, repeat: -1, duration: 30, ease: "none" })
        : gsap.fromTo(track, { xPercent: 0 }, { xPercent: -50, repeat: -1, duration: 28, ease: "none" });
      ScrollTrigger.create({
        trigger: rb, start: "top bottom", end: "bottom top",
        onUpdate: function (self) {
          var boost = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 5);
          gsap.to(loop, { timeScale: boost, duration: 0.2, overwrite: true, onComplete: function () { gsap.to(loop, { timeScale: 1, duration: 1.2, ease: "power2.out" }); } });
        }
      });
    });

    /* ---------- Títulos e etiquetas ---------- */
    $$("main h2").forEach(function (h) {
      var words = splitWords(h);
      gsap.from(words, {
        yPercent: 115, rotation: 4, duration: 0.9, ease: "power4.out", stagger: 0.05,
        scrollTrigger: { trigger: h, start: "top 85%" }
      });
    });
    $$("main section:not(.hero) .tag").forEach(function (t) {
      gsap.from(t, { clipPath: "inset(0 100% 0 0)", clearProps: "clipPath", duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: t, start: "top 88%" } });
    });
    $$(".sec-head p, .why p.desc, #programacao .sched > div > p").forEach(function (p) {
      gsap.from(p, { y: 24, autoAlpha: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: p, start: "top 88%" } });
    });

    /* ---------- Hero: parallax ---------- */
    gsap.to(".arch", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.fromTo(".arch img", { scale: 1 }, { scale: 1.12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".emblem", { y: -60, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero .orbit", { scale: 1.3, autoAlpha: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

    /* ---------- Cards de participação ---------- */
    gsap.from(".cards .card", {
      y: 70, rotationX: -18, transformPerspective: 900, transformOrigin: "50% 0%", autoAlpha: 0,
      duration: 0.9, ease: "power3.out", stagger: { each: 0.09, grid: "auto", from: "start" },
      scrollTrigger: { trigger: ".cards", start: "top 82%" }
    });
    gsap.from(".cards .ico", {
      scale: 0, rotation: -90, duration: 0.6, ease: "back.out(2)", stagger: 0.09,
      scrollTrigger: { trigger: ".cards", start: "top 78%" }
    });

    /* ---------- Por que apoiar ---------- */
    gsap.from(".checks2 li", { x: -30, autoAlpha: 0, duration: 0.6, ease: "power2.out", stagger: 0.07, scrollTrigger: { trigger: ".checks2", start: "top 85%" } });
    gsap.fromTo(".stack .a", { y: 90 }, { y: -50, ease: "none", scrollTrigger: { trigger: ".stack", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo(".stack .b", { y: 30, x: -20 }, { y: -110, x: 0, ease: "none", scrollTrigger: { trigger: ".stack", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.from(".stack .ph", { clipPath: "inset(0 0 100% 0)", clearProps: "clipPath", duration: 1.1, ease: "expo.out", stagger: 0.2, scrollTrigger: { trigger: ".stack", start: "top 80%" } });
    gsap.from(".stack .pill", { scale: 0.4, autoAlpha: 0, duration: 0.7, ease: "back.out(2.2)", stagger: 0.2, scrollTrigger: { trigger: ".stack", start: "top 70%" } });
    gsap.to(".stack .pill", { y: -10, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.6 });

    /* ---------- Seção dourada: brilho que corre com a rolagem ---------- */
    gsap.fromTo(".bg-gold", { backgroundPosition: "0% 50%" }, { backgroundPosition: "100% 50%", ease: "none", scrollTrigger: { trigger: ".bg-gold", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.from(".people .person", {
      y: 100, clipPath: "inset(100% 0 0 0 round 24px 24px 6px 6px)", clearProps: "clipPath", duration: 1.1, ease: "expo.out", stagger: 0.12,
      scrollTrigger: { trigger: ".people", start: "top 82%" }
    });
    $$(".people .person img").forEach(function (img, i) {
      gsap.fromTo(img, { scale: 1.22, yPercent: -6 }, { scale: 1.22, yPercent: 6, ease: "none", scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* ---------- Faixas: luz do bronze acompanha a rolagem ---------- */
    $$(".bg-bronze").forEach(function (s) {
      gsap.fromTo(s, { "--gx": "10%" }, { "--gx": "90%", ease: "none", scrollTrigger: { trigger: s, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* ---------- Formatos de parceria ---------- */
    gsap.from(".plan:not(.feat)", { y: 80, autoAlpha: 0, rotation: function (i) { return i ? 4 : -4; }, duration: 0.9, ease: "power3.out", stagger: 0.12, scrollTrigger: { trigger: ".plans", start: "top 80%" } });
    gsap.from(".plan.feat", { y: 120, scale: 0.85, autoAlpha: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".plans", start: "top 80%" } });
    gsap.from(".plan li", { x: -16, autoAlpha: 0, duration: 0.45, stagger: 0.04, ease: "power2.out", scrollTrigger: { trigger: ".plans", start: "top 70%" } });
    if (isDesktop) gsap.to(".plan.feat", { y: -12, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2 });

    /* ---------- Programação ---------- */
    gsap.fromTo(".tl-progress", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".tl-wrap", start: "top 70%", end: "bottom 60%", scrub: true } });
    gsap.from(".timeline li", { x: 60, autoAlpha: 0, duration: 0.7, ease: "power3.out", stagger: 0.09, scrollTrigger: { trigger: ".timeline", start: "top 80%" } });
    gsap.from(".timeline .ic", { scale: 0, rotation: 180, duration: 0.6, ease: "back.out(2)", stagger: 0.09, scrollTrigger: { trigger: ".timeline", start: "top 78%" } });

    /* ---------- Local ---------- */
    gsap.from(".place-video", { clipPath: "inset(0 100% 0 0 round 24px 24px 8px 8px)", clearProps: "clipPath", duration: 1.3, ease: "expo.inOut", scrollTrigger: { trigger: ".place", start: "top 78%" } });
    gsap.fromTo(".place-img", { scale: 1.3 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".place", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.from(".info li, .place .btns .btn", { y: 26, autoAlpha: 0, duration: 0.6, ease: "power3.out", stagger: 0.1, scrollTrigger: { trigger: ".info", start: "top 85%" } });

    /* ---------- Álbum ---------- */
    gsap.from(".album-row", { xPercent: function (i) { return i ? -8 : 8; }, autoAlpha: 0, duration: 1.4, ease: "expo.out", stagger: 0.15, scrollTrigger: { trigger: ".album", start: "top 85%" } });
    gsap.fromTo(".album", { rotation: -1.5 }, { rotation: 1.5, ease: "none", scrollTrigger: { trigger: ".album", start: "top bottom", end: "bottom top", scrub: true } });

    /* ---------- Marcas parceiras ---------- */
    gsap.fromTo(".bubble-xl", { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 1.2, ease: "back.out(1.6)", scrollTrigger: { trigger: ".sp-master", start: "top 80%" } });
    gsap.from(".sp-name, .sp-label", { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: ".sp-master", start: "top 75%" } });
    gsap.fromTo(".sp-list li", { scale: 0.3, autoAlpha: 0, y: 40 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.8, ease: "back.out(1.8)", stagger: 0.12, scrollTrigger: { trigger: ".sp-list", start: "top 85%" } });
    gsap.to(".sp-list .bubble", { y: -8, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.4, from: "random" } });

    function animarMarcas() {
      gsap.fromTo(".sp-list li", { scale: 0.3, autoAlpha: 0, y: 40 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.8, ease: "back.out(1.8)", stagger: 0.12, scrollTrigger: { trigger: ".sp-list", start: "top 85%" } });
      gsap.to(".sp-list .bubble", { y: -8, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.4, from: "random" } });
      ScrollTrigger.refresh();
    }
    document.addEventListener("marcas:atualizadas", animarMarcas);

    /* ---------- Dúvidas ---------- */
    gsap.from(".faq details", { y: 40, autoAlpha: 0, duration: 0.6, ease: "power3.out", stagger: 0.07, scrollTrigger: { trigger: ".faq", start: "top 85%" } });

    /* ---------- Seja apoiador ---------- */
    gsap.from(".join-panel", { y: 140, rotation: -2.5, transformOrigin: "0% 100%", autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".join", start: "top 85%" } });
    if (isDesktop) {
      gsap.from(".join-photo", { y: 200, scale: 0.85, autoAlpha: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".join", start: "top 75%" } });
      gsap.fromTo(".join-photo img", { scale: 1.2, yPercent: -6 }, { scale: 1.2, yPercent: 6, ease: "none", scrollTrigger: { trigger: ".join", start: "top bottom", end: "bottom top", scrub: true } });
    }
    gsap.from(".join .field, .join .submit-row", { y: 24, autoAlpha: 0, duration: 0.5, ease: "power2.out", stagger: 0.05, scrollTrigger: { trigger: "#partnerForm", start: "top 85%" } });

    /* ---------- Rodapé ---------- */
    gsap.from(".foot > *", { y: 40, autoAlpha: 0, duration: 0.7, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: "footer", start: "top 92%" } });
    gsap.fromTo(".foot-logos img", { scale: 0.5, rotation: -40 }, { scale: 1, rotation: 0, duration: 1, ease: "back.out(1.8)", stagger: 0.15, scrollTrigger: { trigger: "footer", start: "top 92%" } });

    /* ---------- Botões dourados magnéticos (desktop) ---------- */
    if (isDesktop) {
      $$(".btn-gold, .btn-dark").forEach(function (b) {
        var xTo = gsap.quickTo(b, "x", { duration: 0.4, ease: "power3.out" }),
            yTo = gsap.quickTo(b, "y", { duration: 0.4, ease: "power3.out" });
        b.addEventListener("mousemove", function (e) { var r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.25); yTo((e.clientY - r.top - r.height / 2) * 0.35); });
        b.addEventListener("mouseleave", function () { xTo(0); yTo(0); });
      });
    }

    // Recalcula posições após as imagens carregarem
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });

    return function () { /* matchMedia reverte automaticamente o que foi criado aqui */ };
  });
})();
