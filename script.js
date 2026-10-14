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
let onTypingComplete = () => {};

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
    if (typingStarted) return;
    typingStarted = true;
    if (
      prefersReducedMotion ||
      !userInteracted ||
      loader.classList.contains("hidden")
    ) {
      onTypingComplete();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      onTypingComplete();
      return;
    }
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
        () => {
          context.close().catch(() => {});
          onTypingComplete();
        },
        finalKeyAt + 100,
      );
    } catch (error) {
      // Audio is optional and may be unavailable or blocked by the browser.
      onTypingComplete();
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
    t: "Resident Evil 5 Gold Edition",
    k: "game",
    g: "Survival Horror / Co-op",
    h: 310,
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
   LOOPING BACKGROUND MUSIC
   ========================================================= */
const backgroundMusic = new Audio("background_music1.mp3");
backgroundMusic.loop = true;
backgroundMusic.preload = "auto";

const musicButton = $("#musicBtn");
let musicEnabled = true;
let typingSequenceComplete = false;
try {
  musicEnabled = localStorage.getItem("ci-music") !== "off";
} catch (error) {}

function paintMusicButton() {
  musicButton.classList.toggle("on", musicEnabled);
  musicButton.setAttribute("aria-pressed", String(musicEnabled));
  const label = `Turn background music ${musicEnabled ? "off" : "on"}`;
  musicButton.setAttribute("aria-label", label);
  musicButton.title = label;
}

function startBackgroundMusic() {
  if (!musicEnabled || !backgroundMusic.paused) return;
  backgroundMusic.muted = !typingSequenceComplete;
  backgroundMusic.play().catch(() => {
    backgroundMusic.muted = false;
  });
}

onTypingComplete = () => {
  typingSequenceComplete = true;
  if (!musicEnabled) return;
  backgroundMusic.muted = false;
  startBackgroundMusic();
};

function setMusicEnabled(enabled) {
  musicEnabled = enabled;
  paintMusicButton();
  try {
    localStorage.setItem("ci-music", musicEnabled ? "on" : "off");
  } catch (error) {}

  if (musicEnabled) {
    startBackgroundMusic();
    toast("Background music on");
  } else {
    backgroundMusic.pause();
    backgroundMusic.muted = false;
    toast("Background music off");
  }
}

paintMusicButton();
["pointerdown", "keydown"].forEach((eventName) =>
  window.addEventListener(eventName, startBackgroundMusic, {
    passive: true,
  }),
);
musicButton.addEventListener("click", () =>
  setMusicEnabled(!musicEnabled),
);

render();
