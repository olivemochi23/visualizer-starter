(function () {
  if (document.getElementById("pdfExportRail")) {
    return;
  }

  const primarySlides = Array.from(document.querySelectorAll(".slide[id]"));
  const slides = primarySlides.length
    ? primarySlides
    : Array.from(document.querySelectorAll("section[id]"));

  if (!slides.length) {
    return;
  }

  slides.forEach((slide) => {
    slide.setAttribute("data-pdf-slide", "true");
  });

  const rail = document.createElement("div");
  rail.className = "pdf-export-rail";
  rail.id = "pdfExportRail";
  rail.setAttribute("aria-label", "PDF export controls");

  const toggle = document.createElement("button");
  toggle.className = "pdf-export-toggle";
  toggle.id = "pdfExportToggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Open PDF export controls");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "pdfExportPanel");
  toggle.textContent = "PDF";

  const panel = document.createElement("div");
  panel.className = "pdf-export-panel";
  panel.id = "pdfExportPanel";

  const copy = document.createElement("div");
  copy.className = "pdf-export-copy";

  const label = document.createElement("span");
  label.className = "pdf-export-label";
  label.textContent = "PDF Export";

  const status = document.createElement("strong");
  status.className = "pdf-export-status";
  status.id = "pdfExportStatus";

  const hint = document.createElement("span");
  hint.className = "pdf-export-hint";
  hint.textContent = "保存先はブラウザの印刷ダイアログで PDF を選択。";

  const actions = document.createElement("div");
  actions.className = "pdf-export-actions";

  const currentButton = document.createElement("button");
  currentButton.className = "pdf-export-button primary";
  currentButton.id = "pdfExportCurrent";
  currentButton.type = "button";
  currentButton.textContent = "この1枚をPDF";

  const allButton = document.createElement("button");
  allButton.className = "pdf-export-button";
  allButton.id = "pdfExportAll";
  allButton.type = "button";

  copy.append(label, status, hint);
  actions.append(currentButton, allButton);
  panel.append(copy, actions);
  rail.append(toggle, panel);
  document.body.append(rail);

  const canHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  ).matches;
  let activeIndex = 0;

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function getMeta(slide, index) {
    const title =
      cleanText(slide.dataset.slideTitle) ||
      cleanText(
        slide.querySelector(
          ".slide-title, .section-title, .section-label, .logo-big, h1, h2, h3",
        )?.textContent,
      ) ||
      cleanText(slide.id) ||
      `Slide ${index + 1}`;

    return {
      title,
    };
  }

  function setOpen(isOpen) {
    rail.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  function clearPrintMode() {
    delete document.documentElement.dataset.printMode;
    slides.forEach((slide) => {
      slide.removeAttribute("data-print-active");
    });
  }

  function printSlides(mode) {
    document.documentElement.dataset.printMode = mode;
    slides.forEach((slide, index) => {
      const isActive = mode === "current" && index === activeIndex;
      if (isActive) {
        slide.setAttribute("data-print-active", "true");
      } else {
        slide.removeAttribute("data-print-active");
      }
    });

    requestAnimationFrame(() => {
      window.print();
    });
  }

  function updateActive(index) {
    activeIndex = index;
    const current = String(index + 1).padStart(2, "0");
    const total = String(slides.length).padStart(2, "0");
    const meta = getMeta(slides[index], index);
    status.textContent = `現在のスライド: ${current} / ${total}`;
    currentButton.setAttribute(
      "aria-label",
      `現在のスライド「${meta.title}」を PDF 出力`,
    );
  }

  allButton.textContent = `全${slides.length}枚をPDF`;
  allButton.setAttribute("aria-label", `全${slides.length}枚を PDF 出力`);
  updateActive(0);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) {
        return;
      }

      const index = slides.indexOf(visible.target);
      if (index >= 0) {
        updateActive(index);
      }
    },
    {
      threshold: [0.4, 0.55, 0.7],
    },
  );

  slides.forEach((slide) => observer.observe(slide));

  currentButton.addEventListener("click", () => {
    setOpen(false);
    printSlides("current");
  });

  allButton.addEventListener("click", () => {
    setOpen(false);
    printSlides("all");
  });

  if (canHover) {
    rail.addEventListener("pointerenter", () => setOpen(true));
    rail.addEventListener("pointerleave", () => setOpen(false));
  }

  rail.addEventListener("focusin", () => setOpen(true));
  rail.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!rail.contains(document.activeElement)) {
        setOpen(false);
      }
    });
  });

  toggle.addEventListener("click", () => {
    setOpen(!rail.classList.contains("is-open"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  window.addEventListener("afterprint", clearPrintMode);
})();
