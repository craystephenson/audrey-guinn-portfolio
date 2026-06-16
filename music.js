function whenDocumentReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

function parseCloudflareStreamWatchUrl(raw) {
  const t = String(raw).trim();
  if (!t) return null;
  let u;
  try {
    u = new URL(t.includes("://") ? t : `https://${t}`);
  } catch {
    return null;
  }
  const hostname = u.hostname.toLowerCase();
  let idMatch = u.pathname.match(/^\/([a-f0-9]{32})(?:\/watch)?\/?$/i);
  if (!idMatch) {
    idMatch = u.pathname.match(/\/stream\/videos\/([a-f0-9]{32})\/?$/i);
  }
  if (!idMatch) return null;
  const id = idMatch[1];

  if (hostname.endsWith(".cloudflarestream.com")) {
    const base = `https://${hostname}/${id}`;
    return { id, watchUrl: `${base}/watch`, iframeUrl: `${base}/iframe` };
  }
  if (hostname === "watch.videodelivery.net") {
    return {
      id,
      watchUrl: `https://watch.videodelivery.net/${id}`,
      iframeUrl: `https://iframe.videodelivery.net/${id}`,
    };
  }
  if (hostname === "dash.cloudflare.com") {
    const customerHost =
      typeof window.PORTFOLIO_STREAM_CUSTOMER_HOST === "string" &&
      window.PORTFOLIO_STREAM_CUSTOMER_HOST.trim()
        ? window.PORTFOLIO_STREAM_CUSTOMER_HOST.trim()
        : "customer-v4d9cghueyt0skvm.cloudflarestream.com";
    const base = `https://${customerHost}/${id}`;
    return { id, watchUrl: `${base}/watch`, iframeUrl: `${base}/iframe` };
  }
  return null;
}

function initStreamPlayer({ hostId, videosProp, heading }) {
  const host = document.getElementById(hostId);
  if (!host) return;

  const rows = Array.isArray(window[videosProp]) ? window[videosProp] : [];

  const tracks = rows
    .map((row, index) => {
      const title =
        typeof row?.title === "string" && row.title.trim()
          ? row.title.trim()
          : `Video ${index + 1}`;
      const parsed = parseCloudflareStreamWatchUrl(row?.watchUrl);
      if (!parsed) return null;
      return { title, ...parsed };
    })
    .filter(Boolean);

  if (tracks.length === 0) return;

  let activeIndex = 0;

  const shell = document.createElement("div");
  shell.className = "stream-player";

  const headingEl = document.createElement("h3");
  headingEl.className = "stream-player__heading";
  if (typeof heading === "string" && heading.trim()) {
    headingEl.textContent = heading.trim();
  } else {
    headingEl.hidden = true;
  }

  const stage = document.createElement("div");
  stage.className = "stream-player__stage";

  const iframe = document.createElement("iframe");
  iframe.className = "stream-player__iframe";
  iframe.allow =
    "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;";
  iframe.allowFullscreen = true;
  stage.appendChild(iframe);

  const trackList = document.createElement("ol");
  trackList.className = "stream-player__tracks";
  trackList.setAttribute("role", "listbox");
  trackList.setAttribute("aria-label", "Video playlist");

  const foot = document.createElement("p");
  foot.className = "stream-player__foot";
  const footLink = document.createElement("a");
  footLink.target = "_blank";
  footLink.rel = "noopener noreferrer";
  footLink.textContent = "Open current video in new tab";
  foot.appendChild(footLink);

  const trackButtons = tracks.map((track, index) => {
    const item = document.createElement("li");
    item.className = "stream-player__track";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "stream-player__track-btn";
    btn.setAttribute("role", "option");
    btn.dataset.trackIndex = String(index);

    const icon = document.createElement("span");
    icon.className = "stream-player__track-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "▶";

    const label = document.createElement("span");
    label.className = "stream-player__track-label";
    label.textContent = track.title;

    btn.append(icon, label);
    btn.addEventListener("click", () => selectTrack(index));
    item.appendChild(btn);
    trackList.appendChild(item);
    return btn;
  });

  function selectTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    activeIndex = index;
    const track = tracks[index];

    iframe.title = track.title;
    iframe.src = track.iframeUrl;
    footLink.href = track.watchUrl;
    footLink.textContent = `Open “${track.title}” in new tab`;

    trackButtons.forEach((btn, i) => {
      const on = i === index;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  shell.append(headingEl, stage, trackList, foot);
  host.replaceChildren(shell);
  selectTrack(0);
}

whenDocumentReady(() => {
  initStreamPlayer({
    hostId: "stream-video-player",
    videosProp: "PORTFOLIO_STREAM_VIDEOS",
    heading: "Performances and MVs",
  });
  initStreamPlayer({
    hostId: "classical-stream-video-player",
    videosProp: "PORTFOLIO_CLASSICAL_STREAM_VIDEOS",
  });
});
