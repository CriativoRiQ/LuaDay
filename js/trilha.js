/* =========================================================
   Lua Fitwear · Trilha esportiva gerada no navegador (Web Audio)
   - Sem arquivo, sem YouTube e sem direitos autorais de terceiros
   - Cada carregamento sorteia tom, andamento, sequência de acordes
     e o ponto em que a música começa
   - Se existir audio/trilha.mp3, o site toca o MP3 no lugar
   ========================================================= */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- Sintetizador ---------- */
  function Synth() {
    this.ctx = null;
    this.bpm = 124 + Math.floor(Math.random() * 7);          // 124–130 BPM
    this.root = pick([33, 35, 36, 38, 40]);                    // Lá, Si, Dó, Ré, Mi (oitava grave)
    // progressões em menor natural: [grau em semitons, menor?]
    this.prog = pick([
      [[0, 1], [8, 0], [3, 0], [10, 0]],    // i – VI – III – VII
      [[0, 1], [10, 0], [8, 0], [10, 0]],   // i – VII – VI – VII
      [[0, 1], [5, 1], [8, 0], [10, 0]],    // i – iv – VI – VII
      [[0, 1], [8, 0], [10, 0], [7, 1]]     // i – VI – VII – v
    ]);
    this.arpShape = pick([[0, 7, 12, 7], [0, 12, 7, 15], [0, 3, 7, 12], [12, 7, 3, 0]]);
    this.bar = Math.floor(Math.random() * 32);                 // começa num ponto aleatório da música
    this.step = 0;
  }

  Synth.prototype.init = function () {
    var c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0.55;
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(c.destination);

    // "sidechain": tudo que não é bateria abaixa a cada bumbo
    this.duck = c.createGain(); this.duck.connect(this.master);

    // eco para o arpejo
    this.delay = c.createDelay(1); this.delay.delayTime.value = (60 / this.bpm) * 0.75;
    var fb = c.createGain(); fb.gain.value = 0.32;
    var dl = c.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 2400;
    this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay); dl.connect(this.duck);

    // filtro geral para a subida da virada
    this.sweep = c.createBiquadFilter(); this.sweep.type = "lowpass"; this.sweep.frequency.value = 18000; this.sweep.Q.value = 0.7;
    this.sweep.connect(this.duck);

    // ruído branco reutilizável
    var len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  };

  Synth.prototype.noiseSrc = function () { var s = this.ctx.createBufferSource(); s.buffer = this.noise; return s; };

  Synth.prototype.kick = function (t) {
    var c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(1.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.45);
    // abaixa o resto (efeito de "respiração" típico de música de treino)
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(0.25, t); this.duck.gain.linearRampToValueAtTime(1, t + 0.22);
  };

  Synth.prototype.hat = function (t, open, vol) {
    var c = this.ctx, s = this.noiseSrc(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "highpass"; f.frequency.value = 7500;
    var dur = open ? 0.22 : 0.045;
    g.gain.setValueAtTime(vol || 0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  };

  Synth.prototype.clap = function (t, vol) {
    var c = this.ctx, s = this.noiseSrc(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "bandpass"; f.frequency.value = 1600; f.Q.value = 0.9;
    var v = vol || 0.5;
    g.gain.setValueAtTime(0, t);
    [0, 0.011, 0.022].forEach(function (o) { g.gain.setValueAtTime(v, t + o); g.gain.exponentialRampToValueAtTime(v * 0.3, t + o + 0.009); });
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + 0.22);
  };

  Synth.prototype.bass = function (t, midi, dur) {
    var c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "sawtooth"; o2.type = "square";
    o.frequency.value = mtof(midi); o2.frequency.value = mtof(midi - 12);
    f.type = "lowpass"; f.Q.value = 7;
    f.frequency.setValueAtTime(1100, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.sweep);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  };

  Synth.prototype.pad = function (t, notes, dur) {
    var c = this.ctx, f = c.createBiquadFilter(), g = c.createGain();
    f.type = "lowpass"; f.frequency.value = 1500; f.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.25); g.gain.setValueAtTime(0.05, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g); g.connect(this.sweep);
    notes.forEach(function (n) {
      [-7, 7].forEach(function (det) {
        var o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(n); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur + 0.05);
      });
    });
  };

  Synth.prototype.arp = function (t, midi, vol) {
    var c = this.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = "square"; o.frequency.value = mtof(midi);
    f.type = "lowpass"; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.16);
    g.gain.setValueAtTime(vol || 0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(f); f.connect(g); g.connect(this.sweep); g.connect(this.delay);
    o.start(t); o.stop(t + 0.2);
  };

  /* Estrutura de 32 compassos: intro, parte cheia, pausa, virada e "drop" */
  Synth.prototype.section = function (bar) {
    bar = bar % 32;
    if (bar < 8) return "intro";
    if (bar < 16) return "full";
    if (bar < 20) return "break";
    if (bar < 24) return "build";
    return "drop";
  };

  Synth.prototype.schedule = function (t) {
    var s = this.step % 16, bar = this.bar, sec = this.section(bar), beat = 60 / this.bpm, six = beat / 4;
    var ch = this.prog[bar % 4], chordRoot = this.root + ch[0], minor = ch[1];
    var triad = [chordRoot + 24, chordRoot + 24 + (minor ? 3 : 4), chordRoot + 24 + 7];

    var drums = sec !== "break";
    var kickOn = drums && sec !== "build";
    if (kickOn && s % 4 === 0) this.kick(t);
    if (sec === "build" && s % 4 === 0 && (bar % 4) < 3) this.kick(t);

    if (drums) {
      if (s % 4 === 2) this.hat(t, sec === "drop" || sec === "full", 0.14);
      else if (sec !== "intro" && s % 2 === 1) this.hat(t, false, 0.07);
      if ((sec === "full" || sec === "drop") && (s === 4 || s === 12)) this.clap(t);
    }
    // virada: palmas cada vez mais rápidas e filtro abrindo
    if (sec === "build") {
      var k = bar % 4, every = [4, 4, 2, 1][k];
      if (s % every === 0) this.clap(t, 0.18 + 0.1 * k + (s / 16) * 0.12);
      if (s === 0 && k === 0) {
        this.sweep.frequency.cancelScheduledValues(t);
        this.sweep.frequency.setValueAtTime(400, t);
        this.sweep.frequency.exponentialRampToValueAtTime(16000, t + beat * 16);
      }
    }
    if (sec === "break" && s === 0 && bar % 4 === 0) {
      this.sweep.frequency.cancelScheduledValues(t);
      this.sweep.frequency.setValueAtTime(900, t);
    }
    if (sec === "drop" && s === 0 && bar % 8 === 0) {
      this.sweep.frequency.cancelScheduledValues(t);
      this.sweep.frequency.setValueAtTime(18000, t);
    }

    // baixo no contratempo (estilo "running bass")
    if (sec !== "break" && (s % 4 === 2 || (sec === "drop" && s % 4 === 3))) this.bass(t, chordRoot + 12, six * 1.6);
    if (sec === "break" && s === 0) this.bass(t, chordRoot + 12, beat * 3.5);

    // acordes
    if (s === 0 && sec !== "intro") this.pad(t, triad, beat * 4);

    // arpejo
    if (sec !== "intro" && s % 2 === 0) {
      var a = this.arpShape[(s / 2) % 4];
      this.arp(t, chordRoot + 36 + a, sec === "drop" ? 0.08 : 0.06);
    }

    this.step++;
    if (this.step % 16 === 0) this.bar++;
  };

  Synth.prototype.start = function () {
    var self = this;
    if (!this.ctx) this.init();
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (this.timer) return;
    this.next = this.ctx.currentTime + 0.08;
    this.timer = setInterval(function () {
      var six = 60 / self.bpm / 4;
      while (self.next < self.ctx.currentTime + 0.15) { self.schedule(self.next); self.next += six; }
    }, 25);
  };

  Synth.prototype.stop = function () {
    clearInterval(this.timer); this.timer = null;
    if (this.ctx) this.ctx.suspend();
  };

  /* ---------- Botão ---------- */
  var box = document.getElementById("music"), btn = document.getElementById("musicBtn");
  if (!box || !btn) return;
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function track(n, p) { try { window.dataLayer && window.dataLayer.push(Object.assign({ event: n }, p || {})); } catch (e) {} }

  var engine = null, playing = false, paused = ss("lua_music_paused") === "1";

  function ui(on) {
    playing = on; box.classList.toggle("playing", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Pausar trilha esportiva" : "Tocar trilha esportiva");
  }
  function play() {
    if (!engine) return;
    if (engine.mp3) {
      engine.mp3.play().then(function () { ui(true); }).catch(function () { ui(false); });
    } else { engine.start(); ui(true); }
    track("music_play", { source: engine.mp3 ? "mp3" : "synth" });
  }
  function pause() {
    if (!engine) return;
    if (engine.mp3) engine.mp3.pause(); else engine.stop();
    ui(false);
  }

  btn.addEventListener("click", function () {
    if (playing) { pause(); paused = true; ss("lua_music_paused", "1"); }
    else { paused = false; ss("lua_music_paused", "0"); play(); }
  });

  // navegadores só liberam som depois de uma interação: começa no primeiro clique/toque/tecla
  function first(e) {
    if (e && e.target && e.target.closest && e.target.closest("#music")) return;
    document.removeEventListener("pointerdown", first, true);
    document.removeEventListener("keydown", first, true);
    if (!paused) play();
  }

  function useSynth() {
    if (!AC) return;
    engine = new Synth();
    box.hidden = false;
    document.addEventListener("pointerdown", first, true);
    document.addEventListener("keydown", first, true);
  }

  function useMp3(src) {
    var a = new Audio(src); a.loop = true; a.preload = "metadata";
    a.addEventListener("loadedmetadata", function () {
      var d = a.duration; if (d > 150) { try { a.currentTime = Math.floor(Math.random() * (d - 90)); } catch (e) {} }
    }, { once: true });
    a.addEventListener("error", function () { engine = null; useSynth(); }, { once: true });
    engine = { mp3: a };
    box.hidden = false;
    document.addEventListener("pointerdown", first, true);
    document.addEventListener("keydown", first, true);
  }

  if (window.fetch && location.protocol !== "file:") {
    fetch("audio/trilha.mp3", { method: "HEAD", cache: "no-store" })
      .then(function (r) { var t = r.headers.get("content-type") || ""; (r.ok && /audio|octet|mpeg/.test(t)) ? useMp3("audio/trilha.mp3") : useSynth(); })
      .catch(useSynth);
  } else useSynth();
})();
