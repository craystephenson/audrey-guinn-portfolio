(function () {
  const cards = document.querySelectorAll(".ig-card");

  function syncSoundUi(card, video) {
    const unmuted = !video.muted;
    card.classList.toggle("is-unmuted", unmuted);
    const btn = card.querySelector(".ig-card__sound");
    const icon = btn?.querySelector("span");
    if (btn) {
      btn.setAttribute("aria-pressed", unmuted ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        unmuted ? "Sound on" : "Muted — tap for sound",
      );
    }
    if (icon) icon.textContent = unmuted ? "🔊" : "🔇";
  }

  function pauseOthers(current) {
    cards.forEach((c) => {
      if (c === current) return;
      const v = c.querySelector("video");
      if (!v) return;
      v.pause();
      try {
        v.currentTime = 0;
      } catch (_) {
        /* noop */
      }
      v.muted = true;
      syncSoundUi(c, v);
    });
  }

  function wireVideo(video, card) {
    const soundBtn = card.querySelector(".ig-card__sound");

    card.addEventListener("mouseenter", () => {
      video.play().catch(() => {});
    });

    card.addEventListener("mouseleave", () => {
      video.muted = true;
      syncSoundUi(card, video);
    });

    if (soundBtn) {
      soundBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        video.muted = !video.muted;
        if (!video.muted) pauseOthers(card);
        syncSoundUi(card, video);
        video.play().catch(() => {});
      });
    }

    const hint = card.querySelector(".ig-card__muted-hint");
    if (hint) {
      hint.addEventListener("click", () => soundBtn?.click());
    }

    video.addEventListener("click", () => {
      if (video.muted) soundBtn?.click();
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const card = entry.target;
        const video = card.querySelector("video");
        if (!video) return;

        const prefersReduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        if (entry.isIntersecting && !prefersReduced) {
          video.play().catch(() => {});
        } else if (!entry.isIntersecting) {
          video.pause();
        }
      });
    },
    { root: null, rootMargin: "-10% 0px -15% 0px", threshold: 0.25 },
  );

  cards.forEach((card) => {
    const video = card.querySelector("video");
    if (video) wireVideo(video, card);
    observer.observe(card);
  });
})();
