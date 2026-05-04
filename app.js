(function () {
  const cards = [...document.querySelectorAll(".ig-card")];
  const links = Array.isArray(window.PORTFOLIO_VIMEO) ? window.PORTFOLIO_VIMEO : [];

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
    q.set("muted", "1");
    q.set("autoplay", "1");
    q.set("loop", "1");
    q.set("title", "0");
    q.set("byline", "0");
    q.set("portrait", "0");
    q.set("badge", "0");
    q.set("dnt", "1");
    q.set("controls", "1");
    q.set("playsinline", "1");
    q.set("autopause", "0");
    q.set("transparent", "1");

    const query = q.toString();
    return `https://player.vimeo.com/video/${p.id}${query ? `?${query}` : ""}`;
  }

  function wireCard(card, index) {
    const iframe = card.querySelector(".ig-card__iframe");
    const fallback = card.querySelector(".ig-card__placeholder");
    const raw =
      typeof links[index] === "string" ? links[index] : links[String(index)];
    const src = raw ? buildEmbedSrc(raw) : null;

    if (src && iframe) {
      iframe.src = src;
      iframe.removeAttribute("hidden");
      if (fallback) fallback.hidden = true;
    } else {
      if (iframe) iframe.hidden = true;
      if (fallback) fallback.hidden = false;
    }
  }

  cards.forEach((card, i) => wireCard(card, i));
})();
