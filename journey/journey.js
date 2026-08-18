(() => {
  const root = document.documentElement;
  root.classList.add("js-enabled");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const siteNav = document.querySelector("[data-site-nav]");
  const backToTop = document.querySelector("#back-to-top");
  const chapters = [...document.querySelectorAll(".journey-chapter")];
  const tocLinks = new Map(
    [...document.querySelectorAll('.article-toc a[href^="#"]')]
      .map((link) => [link.getAttribute("href").slice(1), link]),
  );

  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  if (backToTop) {
    const updateBackToTop = () => backToTop.classList.toggle("is-visible", window.scrollY > 420);
    updateBackToTop();
    window.addEventListener("scroll", updateBackToTop, { passive: true });
  }

  if ("IntersectionObserver" in window && tocLinks.size) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      for (const link of tocLinks.values()) link.removeAttribute("aria-current");
      tocLinks.get(visible.target.id)?.setAttribute("aria-current", "location");
    }, { rootMargin: "-18% 0px -64% 0px", threshold: [0, 0.25, 0.75] });
    chapters.forEach((chapter) => observer.observe(chapter));
  }
})();
