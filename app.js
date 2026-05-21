function whenDocumentReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

/**
 * Wires Vimeo iframes for every reel. All embeds load paused (autoplay off).
 * muted=0 so sound plays when the visitor presses play (no autoplay).
 */
function initVimeoEmbeds() {
  const cards = [...document.querySelectorAll(".ig-card")];
  /** Same order as embeds-config.js — used when that file fails to load (e.g. some file:// setups). First five carousel slots only; Instagram slot is omitted. */
  const FALLBACK_VIMEO = [
    "https://vimeo.com/1188936026",
    "https://vimeo.com/1188935992",
    "https://vimeo.com/1188936095",
    "https://vimeo.com/1188936123",
    "https://vimeo.com/1188936144",
  ];

  const custom = Array.isArray(window.PORTFOLIO_VIMEO) ? window.PORTFOLIO_VIMEO : [];
  const links = cards.map((_, i) => {
    const row = typeof custom[i] === "string" ? custom[i].trim() : "";
    return row || (typeof FALLBACK_VIMEO[i] === "string" ? FALLBACK_VIMEO[i] : "");
  });

  function parseVimeoUrl(raw) {
    const t = String(raw).trim();
    if (!t) return null;
    let u;
    try {
      u = new URL(t.includes("://") ? t : `https://${t}`);
    } catch {
      return null;
    }
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;

    const playerMatch = u.pathname.match(/\/video\/(\d+)/);
    if (playerMatch) {
      return {
        id: playerMatch[1],
        h: u.searchParams.get("h") || "",
      };
    }

    const pageMatch = u.pathname.match(/^\/(\d+)(?:\/([a-fA-F0-9]+))?/);
    if (pageMatch) {
      return { id: pageMatch[1], h: pageMatch[2] || "" };
    }
    return null;
  }

  function buildEmbedSrc(raw) {
    const p = parseVimeoUrl(raw);
    if (!p) return null;
    const q = new URLSearchParams();
    if (p.h) q.set("h", p.h);
    q.set("muted", "0");
    q.set("autoplay", "0");
    q.set("loop", "1");
    q.set("title", "0");
    q.set("byline", "0");
    /* Player chrome: hides author portrait strip (not the video’s orientation). */
    q.set("portrait", "0");
    q.set("badge", "0");
    q.set("dnt", "1");
    q.set("controls", "1");
    q.set("playsinline", "1");
    q.set("autopause", "1");
    q.set("transparent", "1");

    const query = q.toString();
    return `https://player.vimeo.com/video/${p.id}${query ? `?${query}` : ""}`;
  }

  cards.forEach((card, i) => {
    const iframe = card.querySelector(".ig-card__iframe");
    const fallback = card.querySelector(".ig-card__placeholder");
    const media = card.querySelector(".ig-card__media--vimeo");
    const raw =
      typeof links[i] === "string" ? links[i] : links[String(i)];
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    const embedUrl = trimmed ? buildEmbedSrc(trimmed) : null;

    if (!embedUrl || !iframe) {
      media?.classList.remove("ig-card__media--vimeo--has-video");
      iframe?.removeAttribute("src");
      if (iframe) iframe.hidden = true;
      if (fallback) fallback.hidden = false;
      return;
    }

    iframe.src = embedUrl;
    iframe.removeAttribute("hidden");
    if (fallback) fallback.hidden = true;
    media?.classList.add("ig-card__media--vimeo--has-video");
  });
}

function initFeedCarousel() {
  const vp = document.querySelector(".feed-carousel__viewport");
  const slides = [...document.querySelectorAll(".feed-carousel__slide")];
  const dotsHost = document.getElementById("carousel-dots");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");

  if (!vp || slides.length === 0 || !dotsHost) return;

  const carouselRoot = vp.closest(".feed-carousel");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let scrollScheduled = false;

  slides.forEach((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "feed-carousel__dot";
    dot.dataset.slideIndex = String(index);
    dot.setAttribute(
      "aria-label",
      `Go to reel ${index + 1} of ${slides.length}`,
    );
    dot.addEventListener("click", () => goToIndex(index));
    dotsHost.appendChild(dot);
  });

  const dots = () => [...dotsHost.querySelectorAll(".feed-carousel__dot")];

  function activeIndexFromScroll() {
    const r = vp.getBoundingClientRect();
    const cx = r.left + r.width * 0.5;
    let best = 0;
    let closest = Infinity;
    slides.forEach((slide, i) => {
      const b = slide.getBoundingClientRect();
      const mx = (b.left + b.right) * 0.5;
      const d = Math.abs(mx - cx);
      if (d < closest) {
        closest = d;
        best = i;
      }
    });
    return best;
  }

  function goToIndex(i) {
    if (i < 0 || i >= slides.length) return;
    const slide = slides[i];
    slide.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      inline: "center",
      block: "nearest",
    });
  }

  function syncChrome() {
    const i = activeIndexFromScroll();
    slides.forEach((slide, idx) => {
      slide.classList.toggle("feed-carousel__slide--active", idx === i);
    });
    dots().forEach((dot, idx) => {
      const active = idx === i;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === slides.length - 1;
  }

  function scheduleSync() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => {
      syncChrome();
      scrollScheduled = false;
    });
  }

  vp.addEventListener(
    "scroll",
    () => {
      scheduleSync();
    },
    { passive: true },
  );

  prevBtn?.addEventListener("click", () =>
    goToIndex(activeIndexFromScroll() - 1),
  );
  nextBtn?.addEventListener("click", () =>
    goToIndex(activeIndexFromScroll() + 1),
  );

  vp.addEventListener("keydown", (e) => {
    if (e.target !== vp) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToIndex(activeIndexFromScroll() - 1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goToIndex(activeIndexFromScroll() + 1);
    }
    if (e.key === "Home") {
      e.preventDefault();
      goToIndex(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      goToIndex(slides.length - 1);
    }
  });

  window.addEventListener("resize", () => scheduleSync());
  requestAnimationFrame(() => {
    syncChrome();
    carouselRoot?.classList.add("feed-carousel--hydrated");
    requestAnimationFrame(syncChrome);
  });
}

/** Instagram serves embed.js async; process static blockquotes once it’s ready (and once on load). */
function initInstagramEmbeds() {
  function process() {
    if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
    }
  }

  process();
  window.addEventListener("load", process);

  let tries = 0;
  const timer = window.setInterval(() => {
    process();
    tries += 1;
    if (window.instgrm?.Embeds || tries > 50) {
      window.clearInterval(timer);
    }
  }, 120);
}

whenDocumentReady(() => {
  initVimeoEmbeds();
  initFeedCarousel();
  initInstagramEmbeds();
});
