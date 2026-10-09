const $ = (s) => document.querySelector(s);

const typeSelect = $("#req-type");
const typePicker = $("#typePicker");
const typePickerButton = $("#typePickerButton");
const typePickerValue = $("#typePickerValue");
const typePickerList = $("#typePickerList");
const typeOptions = [...typePickerList.querySelectorAll('[role="option"]')];
let activeTypeIndex = typeOptions.findIndex(
  (option) => option.dataset.value === typeSelect.value,
);
let typeahead = "";
let typeaheadTimer;

function setActiveType(index) {
  activeTypeIndex = (index + typeOptions.length) % typeOptions.length;
  typeOptions.forEach((option, optionIndex) => {
    option.classList.toggle("active", optionIndex === activeTypeIndex);
  });
  typePickerButton.setAttribute(
    "aria-activedescendant",
    typeOptions[activeTypeIndex].id,
  );
}

function setTypePickerOpen(open) {
  typePicker.classList.toggle("open", open);
  typePickerButton.setAttribute("aria-expanded", String(open));
  typePickerList.setAttribute("aria-hidden", String(!open));
  if (open) {
    setActiveType(
      typeOptions.findIndex(
        (option) => option.dataset.value === typeSelect.value,
      ),
    );
  } else {
    typePickerButton.removeAttribute("aria-activedescendant");
  }
}

function chooseType(index) {
  const selectedOption = typeOptions[index];
  typeSelect.value = selectedOption.dataset.value;
  typePickerValue.textContent = selectedOption.textContent;
  typeOptions.forEach((option) => {
    option.setAttribute(
      "aria-selected",
      String(option === selectedOption),
    );
  });
  typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
  setTypePickerOpen(false);
}

typePickerButton.addEventListener("click", () => {
  setTypePickerOpen(!typePicker.classList.contains("open"));
});
typePickerButton.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    if (!typePicker.classList.contains("open")) {
      setTypePickerOpen(true);
    } else {
      setActiveType(activeTypeIndex + direction);
    }
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    if (!typePicker.classList.contains("open")) setTypePickerOpen(true);
    setActiveType(event.key === "Home" ? 0 : typeOptions.length - 1);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (typePicker.classList.contains("open")) {
      chooseType(activeTypeIndex);
    } else {
      setTypePickerOpen(true);
    }
  } else if (event.key === "Escape") {
    setTypePickerOpen(false);
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    typeahead += event.key.toLowerCase();
    clearTimeout(typeaheadTimer);
    typeaheadTimer = setTimeout(() => (typeahead = ""), 650);
    const matchIndex = typeOptions.findIndex((option) =>
      option.textContent.toLowerCase().startsWith(typeahead),
    );
    if (matchIndex >= 0) {
      if (!typePicker.classList.contains("open")) setTypePickerOpen(true);
      setActiveType(matchIndex);
    }
  }
});
typeOptions.forEach((option, index) => {
  option.addEventListener("pointermove", () => setActiveType(index));
  option.addEventListener("click", () => chooseType(index));
});
document.addEventListener("pointerdown", (event) => {
  if (!typePicker.contains(event.target)) setTypePickerOpen(false);
});

// Interactive ambient field
const ambientCanvas = $("#ambientCanvas");
const ambientContext = ambientCanvas?.getContext("2d");
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if (ambientCanvas && ambientContext && !reducedMotion) {
  const ambientRoot = getComputedStyle(document.documentElement);
  const toRgb = (value) => {
    const hex = value.trim().replace("#", "");
    return [0, 2, 4].map((index) =>
      parseInt(hex.slice(index, index + 2), 16),
    );
  };
  const particleColor = toRgb(ambientRoot.getPropertyValue("--b"));
  const accentColor = toRgb(ambientRoot.getPropertyValue("--a"));
  const particles = [];
  const ripples = [];
  const pointer = { x: -1000, y: -1000, active: false };
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastTime = 0;

  function resizeAmbientCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    ambientCanvas.width = width * ratio;
    ambientCanvas.height = height * ratio;
    ambientContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(
      100,
      Math.max(34, Math.round((width * height) / 18000)),
    );
    particles.length = 0;
    for (let index = 0; index < count; index++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: 0.8 + Math.random() * 1.5,
      });
    }
  }

  function drawAmbientField(time) {
    frame = requestAnimationFrame(drawAmbientField);
    const delta = Math.min((time - (lastTime || time)) / 16.67, 2);
    lastTime = time;
    ambientContext.clearRect(0, 0, width, height);

    particles.forEach((particle, index) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;

      if (pointer.active) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0 && distance < 150) {
          const push = ((150 - distance) / 150) * 0.65 * delta;
          particle.x += (dx / distance) * push;
          particle.y += (dy / distance) * push;
        }
      }

      ambientContext.beginPath();
      ambientContext.arc(
        particle.x,
        particle.y,
        particle.radius,
        0,
        Math.PI * 2,
      );
      ambientContext.fillStyle = `rgba(${particleColor.join(",")}, 0.55)`;
      ambientContext.fill();

      for (let next = index + 1; next < particles.length; next++) {
        const other = particles[next];
        const distance = Math.hypot(
          particle.x - other.x,
          particle.y - other.y,
        );
        if (distance < 115) {
          ambientContext.beginPath();
          ambientContext.moveTo(particle.x, particle.y);
          ambientContext.lineTo(other.x, other.y);
          ambientContext.strokeStyle = `rgba(${accentColor.join(",")}, ${(1 - distance / 115) * 0.14})`;
          ambientContext.lineWidth = 1;
          ambientContext.stroke();
        }
      }
    });

    ripples.forEach((ripple) => {
      const progress = Math.min(
        1,
        Math.max(0, (time - ripple.startedAt) / 850),
      );
      const radius = progress * 110;
      ambientContext.beginPath();
      ambientContext.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ambientContext.strokeStyle = `rgba(${particleColor.join(",")}, ${(1 - progress) * 0.5})`;
      ambientContext.lineWidth = 2;
      ambientContext.stroke();
    });
    while (ripples.length && time - ripples[0].startedAt > 850)
      ripples.shift();
  }

  window.addEventListener("resize", resizeAmbientCanvas);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  });
  window.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  window.addEventListener("click", (event) => {
    ripples.push({
      x: event.clientX,
      y: event.clientY,
      startedAt: performance.now(),
    });
    if (ripples.length > 8) ripples.shift();
  });
  resizeAmbientCanvas();
  frame = requestAnimationFrame(drawAmbientField);
  window.addEventListener("pagehide", () => cancelAnimationFrame(frame), {
    once: true,
  });
}

// Neat Loading Screen Sequence
window.addEventListener("DOMContentLoaded", () => {
  const loader = $("#loader");
  const appContent = $("#appContent");
  const loaderText = $("#loaderText");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let userInteracted = false;
  let typingStarted = false;
  const loaderStartedAt = performance.now();

  function startKeyboardTyping() {
    if (
      typingStarted ||
      prefersReducedMotion ||
      !userInteracted ||
      loader.classList.contains("hidden")
    )
      return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    typingStarted = true;
    try {
      const context = new AudioContext();
      const master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);

      const clickBuffer = context.createBuffer(
        1,
        Math.floor(context.sampleRate * 0.035),
        context.sampleRate,
      );
      const noise = clickBuffer.getChannelData(0);
      for (let index = 0; index < noise.length; index++) {
        const decay = Math.exp(-(index / context.sampleRate) * 95);
        noise[index] = (Math.random() * 2 - 1) * decay;
      }

      context.resume().catch(() => {});
      const elapsed = performance.now() - loaderStartedAt;
      const keyInterval = 20;
      let finalKeyAt = 0;

      document.querySelectorAll(".tw-02__line").forEach((line) => {
        const length = Number(line.style.getPropertyValue("--len"));
        const delay =
          Number.parseFloat(line.style.getPropertyValue("--delay")) * 1000;

        for (let index = 0; index < length; index++) {
          if (index % 2 !== 0) continue;
          const keyDelay = delay + index * keyInterval - elapsed;
          if (keyDelay < 0) continue;
          finalKeyAt = Math.max(finalKeyAt, keyDelay);
          setTimeout(() => {
            const startedAt = context.currentTime;
            const key = context.createBufferSource();
            const filter = context.createBiquadFilter();
            const clickGain = context.createGain();
            key.buffer = clickBuffer;
            filter.type = "bandpass";
            filter.frequency.value = 1900 + Math.random() * 1300;
            filter.Q.value = 1.1;
            clickGain.gain.setValueAtTime(0.0001, startedAt);
            clickGain.gain.linearRampToValueAtTime(
              0.16 + Math.random() * 0.08,
              startedAt + 0.001,
            );
            clickGain.gain.exponentialRampToValueAtTime(
              0.0001,
              startedAt + 0.028,
            );
            key.connect(filter);
            filter.connect(clickGain);
            clickGain.connect(master);
            key.start(startedAt);
            key.stop(startedAt + 0.035);
          }, keyDelay);
        }
      });

      setTimeout(
        () => context.close().catch(() => {}),
        finalKeyAt + 100,
      );
    } catch (error) {
      // Audio is optional and may be unavailable or blocked by the browser.
    }
  }

  ["pointerdown", "keydown"].forEach((eventName) =>
    window.addEventListener(
      eventName,
      () => {
        userInteracted = true;
        startKeyboardTyping();
      },
      { once: true, passive: true },
    ),
  );

  function releaseIris() {
    if (loaderText) loaderText.textContent = "ACCESS GRANTED.";

    setTimeout(
      () => {
        appContent.classList.add("visible");
        loader.classList.add("hidden");
      },
      prefersReducedMotion ? 0 : 850,
    );
  }

  // Let the terminal sequence briefly play before unlocking
  setTimeout(() => {
    if (prefersReducedMotion) {
      releaseIris();
      return;
    }

    if (loaderText) loaderText.textContent = "VAULT OPEN";
    setTimeout(releaseIris, 520);
  }, 1200);
});

// Email Contact Target
const TORRENT_EMAIL = "cracked.iris0992@gmail.com";
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

function openGmailCompose(subject, body) {
  const composeUrl = new URL("https://mail.google.com/mail/");
  composeUrl.searchParams.set("view", "cm");
  composeUrl.searchParams.set("fs", "1");
  composeUrl.searchParams.set("to", TORRENT_EMAIL);
  composeUrl.searchParams.set("su", subject);
  composeUrl.searchParams.set("body", body);
  window.open(composeUrl.href, "_blank", "noopener,noreferrer");
}

function isYouTubeShareLink(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.port &&
      YOUTUBE_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

// Stock Item Catalog
const items = [
  {
    t: "Ravenfield Build 26",
    k: "game",
    g: "Tactical FPS / Mods",
    h: 265,
  },
  { t: "Ravenfield Build 7", k: "game", g: "Classic Build", h: 210 },
  { t: "Ravenfield Beta 5", k: "game", g: "Rare Beta & Mods", h: 290 },
  { t: "Garry's Mod", k: "game", g: "Sandbox Classic", h: 180 },
  { t: "Half Life 1", k: "game", g: "Sci-Fi FPS", h: 45 },
  { t: "Half Life 2", k: "game", g: "Action FPS", h: 120 },
  { t: "Iron Nest", k: "game", g: "Indie Action", h: 330 },
  { t: "Resident Evil (2026)", k: "film", g: "Horror / Action", h: 350 },
  {
    t: "Resident Evil Welcome to Raccoon City",
    k: "film",
    g: "Horror",
    h: 340,
  },
  {
    t: "Welcome to the Jungle (2026)",
    k: "film",
    g: "Action / Adventure",
    h: 30,
  },
  { t: "Awarapan 2 (2026)", k: "film", g: "Drama / Action", h: 150 },
  { t: "Storks", k: "film", g: "Animated Comedy", h: 60 },
  { t: "Toy Story 5", k: "film", g: "Animation / Family", h: 80 },
  { t: "Zathura", k: "film", g: "Sci-Fi / Adventure", h: 200 },
  { t: "The Goat Life", k: "film", g: "Drama / Survival", h: 240 },
  {
    t: "All YouTube Content",
    k: "media",
    g: "MP3 / MP4 Converter",
    h: 170,
  },
  {
    t: "YouTube Music Library",
    k: "media",
    g: "High Quality Audio",
    h: 280,
  },
];

let f = "all",
  q = "";
const dlI = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>`;

function render() {
  const l = items
    .map((x, i) => ({ ...x, i }))
    .filter(
      (x) => (f === "all" || x.k === f) && x.t.toLowerCase().includes(q),
    );

  $("#grid").innerHTML = l.length
    ? l
        .map(
          (x) => `
    <article class="card" data-i="${x.i}" style="--h:${x.h}" tabindex="0" role="button" aria-label="${x.k === "media" ? "Open YouTube link request for" : "Request Gmail draft for"} ${x.t}">
      <i>${x.t[0]}</i>
      <span class="tag">${x.k === "game" ? "Game" : x.k === "film" ? "Movie" : "Media"}</span>
      <button class="dl" aria-label="${x.k === "media" ? "Enter YouTube link for" : "Open Gmail draft for"} ${x.t}">${dlI}</button>
      <span class="pl">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </span>
      <div class="meta">
        <b>${x.t}</b>
        <small>${x.g}</small>
      </div>
    </article>
  `,
        )
        .join("")
    : '<p class="empty">No matching torrent stock found. Send your request to cracked.iris0992@gmail.com!</p>';
}

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("on");
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove("on"), 3000);
}

function act(e) {
  const c = e.target.closest(".card");
  if (!c) return;
  const x = items[c.dataset.i];

  if (x.k === "media") {
    $("#mediaItemName").value = x.t;
    $("#mediaLink").value = "";
    $("#mediaLinkStatus").textContent = "";
    $("#mediaRequestDialog").showModal();
    $("#mediaLink").focus();
    return;
  }

  openGmailCompose(
    `Torrent Request: ${x.t}`,
    `Hello Cracked Iris Team,\n\nI would like to request the torrent file / magnet link for:\nTitle: ${x.t}\nCategory: ${x.g}\n\nThank you!`,
  );
  toast(`Opening a Gmail draft to request "${x.t}"...`);
}

const mediaRequestDialog = $("#mediaRequestDialog");
$("#closeMediaRequest").addEventListener("click", () =>
  mediaRequestDialog.close(),
);
$("#cancelMediaRequest").addEventListener("click", () =>
  mediaRequestDialog.close(),
);
$("#mediaRequestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const link = $("#mediaLink").value.trim();

  if (!isYouTubeShareLink(link)) {
    $("#mediaLinkStatus").textContent =
      "Enter a valid HTTPS share link from YouTube or youtu.be.";
    $("#mediaLink").setAttribute("aria-invalid", "true");
    return;
  }

  $("#mediaLink").removeAttribute("aria-invalid");
  const title = $("#mediaItemName").value;
  const body = `Hello Cracked Iris Team,\n\nI would like to request media for:\nTitle: ${title}\nYouTube link: ${link}\n\nThank you!`;
  openGmailCompose(`YouTube Media Request: ${title}`, body);
  mediaRequestDialog.close();
  toast("Opened a Gmail draft in a new tab. Review it and press Send.");
});

$("#requestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const body = [...formData.entries()]
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join("\n");
  openGmailCompose("Out of Stock Request", body);
  toast("Opened a Gmail draft in a new tab. Review it and press Send.");
});

$("#grid").addEventListener("click", act);
$("#grid").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList.contains("card")) act(e);
});

$("#copyEmailBtn").addEventListener("click", () => {
  navigator.clipboard
    .writeText(TORRENT_EMAIL)
    .then(() => {
      toast(`Copied ${TORRENT_EMAIL} to clipboard!`);
    })
    .catch(() => {
      toast(`Email address: ${TORRENT_EMAIL}`);
    });
});

document.querySelectorAll("[data-f]").forEach((b) =>
  b.addEventListener("click", () => {
    f = b.dataset.f;
    document
      .querySelectorAll(".pill")
      .forEach((p) => p.setAttribute("aria-pressed", p.dataset.f === f));
    render();
  }),
);

$("#q").addEventListener("input", (e) => {
  q = e.target.value.trim().toLowerCase();
  render();
});

$("#daySelect").addEventListener("change", (e) => {
  $("#cooldownResult").textContent =
    `Request logged for ${e.target.value}. Your 3-day cooldown will end 3 days later.`;
});

$("#themeBtn").addEventListener("click", () => {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "light" : "dark",
  );
  toast(`Switched to ${isDark ? "Light" : "Dark"} Mode`);
});

const navToggle = $("#navToggle");
const navLinks = $("#navLinks");
const heroIris = $(".hero-logo-img");
let heroIrisResetTimer;

heroIris.addEventListener("click", () => {
  heroIris.classList.remove("is-reacting");
  void heroIris.offsetWidth;
  heroIris.classList.add("is-reacting");
  clearTimeout(heroIrisResetTimer);
  heroIrisResetTimer = setTimeout(
    () => heroIris.classList.remove("is-reacting"),
    650,
  );

  try {
    navigator.vibrate?.([12, 20, 12]);
  } catch (error) {}
});

function closeMobileNav() {
  if (!navLinks || !navToggle) return;
  navLinks.classList.remove("open");
  navToggle.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) closeMobileNav();
  });

  document.addEventListener("click", (event) => {
    if (
      !navLinks.contains(event.target) &&
      !navToggle.contains(event.target)
    ) {
      closeMobileNav();
    }
  });
}

const dlg = $("#game"),
  stage = $("#stage"),
  go = $("#go");
let score = 0,
  left = 20,
  tk,
  sp;

function stop() {
  clearInterval(tk);
  clearInterval(sp);
  stage.querySelectorAll(".orb").forEach((o) => o.remove());
}
function drop() {
  const b = document.createElement("button");
  b.className = "orb";
  b.setAttribute("aria-label", "Iris");
  b.style.left = 6 + Math.random() * 80 + "%";
  b.style.top = 6 + Math.random() * 76 + "%";
  b.onclick = () => {
    score++;
    $("#score").textContent = score;
    b.classList.add("pop");
    setTimeout(() => b.remove(), 200);
  };
  stage.append(b);
  setTimeout(() => b.remove(), 1100);
}

function end() {
  stop();
  let best = score;
  try {
    best = Math.max(score, +localStorage.getItem("ci-best") || 0);
    localStorage.setItem("ci-best", best);
  } catch (e) {}
  $("#res").textContent = `Game Over! Score: ${score}. Best: ${best}.`;
  $("#st").textContent = "Play Again";
  go.hidden = false;
}

$("#st").onclick = () => {
  stop();
  score = 0;
  left = 20;
  $("#score").textContent = 0;
  $("#time").textContent = 20;
  go.hidden = true;
  tk = setInterval(() => {
    $("#time").textContent = --left;
    if (left <= 0) end();
  }, 1000);
  sp = setInterval(drop, 520);
  drop();
};

$("#x").onclick = () => dlg.close();
dlg.addEventListener("close", () => {
  stop();
  $("#res").textContent =
    "20 seconds. Tap every glowing iris before it shrinks away.";
  $("#st").textContent = "Start Game";
});
$("#hp").onclick = () => dlg.showModal();

/* =========================================================
   BACKGROUND MUSIC (generated in the browser, no audio files)
   ========================================================= */
const Music = (() => {
  let ac,
    out,
    dly,
    bus,
    wetIn,
    noiseBuf,
    timer,
    cur = 0,
    bar = 0,
    nextT = 0,
    gen = 0,
    live = false;
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const P = [
    [48, 55, 59, 64],
    [45, 52, 55, 60],
    [41, 48, 52, 57],
    [43, 50, 52, 59],
  ];
  const PENT = [60, 62, 64, 67, 69, 72, 74, 76, 79];

  function init() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      toast("Background audio is not supported in this browser.");
      return false;
    }
    ac = new AudioContext();
    out = ac.createGain();
    out.gain.value = 0.55;
    out.connect(ac.destination);
    dly = ac.createDelay(1);
    dly.delayTime.value = 0.34;
    const fb = ac.createGain();
    const lp = ac.createBiquadFilter();
    fb.gain.value = 0.4;
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    dly.connect(lp);
    lp.connect(fb);
    fb.connect(dly);
    lp.connect(out);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(m, t, dur, o = {}) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const v = o.v ?? 0.12;
    const a = o.a ?? 0.01;
    osc.type = o.type || "sine";
    osc.frequency.value = hz(m);
    osc.detune.value = o.d || 0;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.f) {
      const filter = ac.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = o.f;
      osc.connect(filter);
      node = filter;
    }
    node.connect(g);
    g.connect(bus);
    if (o.s) {
      const send = ac.createGain();
      send.gain.value = o.s;
      g.connect(send);
      send.connect(wetIn);
    }
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function hit(t, dur, v, type, freq) {
    const source = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const g = ac.createGain();
    source.buffer = noiseBuf;
    filter.type = type;
    filter.frequency.value = freq;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(filter);
    filter.connect(g);
    g.connect(bus);
    source.start(t);
    source.stop(t + dur + 0.02);
  }

  function kick(t) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  const TR = [
    (b, t) => {
      const c = P[b % 4];
      tone(c[0] - 12, t, 5.5, { v: 0.13, a: 0.03, s: 0.3 });
      for (let i = 0; i < 4; i++)
        if (Math.random() < 0.75)
          tone(pick(PENT), t + i * 1.5 + Math.random() * 0.25, 3.4, {
            type: "triangle",
            v: 0.13,
            a: 0.008,
            f: 2400,
            s: 0.6,
          });
      if (b % 2 === 0)
        c.slice(1).forEach((m, i) =>
          tone(m + 12, t + 0.1 + i * 0.12, 4, {
            type: "triangle",
            v: 0.06,
            f: 1800,
            s: 0.5,
          }),
        );
      return 6;
    },
    (b, t) => {
      P[b % 4].forEach((m) =>
        [-7, 7].forEach((d) =>
          tone(m + 12, t, 9, {
            type: "sawtooth",
            v: 0.022,
            a: 2.4,
            d,
            f: 700,
            s: 0.5,
          }),
        ),
      );
      tone(pick(PENT) + 12, t + 3 + Math.random() * 3, 4, {
        v: 0.05,
        a: 0.5,
        s: 0.7,
      });
      return 8;
    },
    (b, t) => {
      const c = P[b % 4];
      const q = 60 / 74 / 4;
      for (let s = 0; s < 16; s++) {
        const x = t + s * q + (s % 2 ? 0.035 : 0);
        if (s === 0 || s === 6 || s === 10) kick(x);
        if (s === 4 || s === 12) hit(x, 0.18, 0.3, "bandpass", 1800);
        if (s % 2 === 0)
          hit(x, 0.04, s % 4 ? 0.05 : 0.09, "highpass", 7000);
        if (s === 0 || s === 8)
          c.forEach((m) =>
            tone(m + 12, x, 1.6, {
              type: "triangle",
              v: 0.06,
              a: 0.015,
              f: 1300,
              s: 0.35,
              d: Math.random() * 10 - 5,
            }),
          );
        if (s === 0 || s === 10)
          tone(c[0] - 12, x, 0.7, { v: 0.2, a: 0.01 });
        if (s % 2 && Math.random() < 0.18)
          tone(pick(PENT), x, 0.9, {
            type: "triangle",
            v: 0.07,
            f: 1800,
            s: 0.5,
          });
      }
      return q * 16;
    },
    (b, t) => {
      const c = P[b % 4];
      c.forEach((m) => tone(m + 12, t, 9, { v: 0.04, a: 3, s: 0.6 }));
      for (let i = 0; i < 8; i++)
        tone(pick(c) + 24 + (Math.random() < 0.4 ? 12 : 0), t + i, 2.6, {
          v: 0.06,
          a: 0.01,
          s: 0.9,
        });
      return 8;
    },
  ];

  function fadeOld() {
    if (!bus) return;
    const t = ac.currentTime;
    [bus, wetIn].forEach((node) => {
      node.gain.cancelScheduledValues(t);
      node.gain.setTargetAtTime(0, t, 0.25);
    });
    bus = wetIn = null;
  }

  function sched(generation) {
    if (generation !== gen) return;
    while (nextT < ac.currentTime + 1.5) nextT += TR[cur](bar++, nextT);
    timer = setTimeout(() => sched(generation), 400);
  }

  function play(index) {
    if (!ac && !init()) return;
    ac.resume();
    gen++;
    clearTimeout(timer);
    fadeOld();
    live = index >= 0;
    if (index < 0) return;
    cur = index;
    bar = 0;
    nextT = ac.currentTime + 0.1;
    bus = ac.createGain();
    bus.connect(out);
    wetIn = ac.createGain();
    wetIn.connect(dly);
    sched(gen);
  }

  document.addEventListener("visibilitychange", () => {
    if (!ac) return;
    if (document.hidden) ac.suspend();
    else if (live) ac.resume();
  });
  return { play };
})();

const TRACKS = [
  ["Blocky Calm", "Soft, sparse piano"],
  ["Calm Pad", "Warm floating ambience"],
  ["Lo-fi Chill", "Mellow beat"],
  ["Night Sky", "Dreamy and shimmering"],
];
const mBox = $("#music");
const mBtn = $("#musicBtn");
const mMenu = $("#musicMenu");
let song = 0;
let started = false;
try {
  const savedSong = localStorage.getItem("ci-music");
  if (savedSong !== null) song = +savedSong;
} catch (e) {}

mMenu.innerHTML =
  TRACKS.map(
    (track, index) =>
      `<button role="menuitemradio" data-s="${index}"><span>${track[0]}<small>${track[1]}</small></span></button>`,
  ).join("") +
  '<button role="menuitemradio" data-s="-1"><span>Music off</span></button>';

function paintMusic() {
  mBtn.classList.toggle("on", song >= 0);
  mMenu
    .querySelectorAll("button")
    .forEach((button) =>
      button.setAttribute("aria-checked", +button.dataset.s === song),
    );
}

function setSong(index) {
  song = index;
  started = true;
  Music.play(index);
  paintMusic();
  try {
    localStorage.setItem("ci-music", index);
  } catch (e) {}
  toast(index < 0 ? "Music off" : `Now playing: ${TRACKS[index][0]}`);
}

paintMusic();
const armMusic = () => {
  if (started) return;
  started = true;
  if (song >= 0) {
    Music.play(song);
    toast(
      `Now playing: ${TRACKS[song][0]} (tap the note button to change)`,
    );
  }
};
["pointerdown", "keydown"].forEach((eventName) =>
  addEventListener(eventName, armMusic, { once: true, passive: true }),
);

mBtn.addEventListener("click", () => {
  const open = mBox.classList.toggle("open");
  mBtn.setAttribute("aria-expanded", String(open));
});
mMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  setSong(+button.dataset.s);
  mBox.classList.remove("open");
  mBtn.setAttribute("aria-expanded", "false");
});
document.addEventListener("click", (event) => {
  if (!mBox.contains(event.target)) {
    mBox.classList.remove("open");
    mBtn.setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    mBox.classList.remove("open");
    mBtn.setAttribute("aria-expanded", "false");
  }
});

render();
