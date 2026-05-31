// Theme toggle (called from the header button's onclick)
function toggleTheme() {
    const html = document.documentElement;
    const toggle = document.querySelector('.theme-toggle');
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncToggle(toggle, next);
}

// Reflect the active theme on the toggle button (icon + aria-label)
function syncToggle(toggle, theme) {
    if (!toggle) return;
    const icon = toggle.querySelector('.icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

document.addEventListener('DOMContentLoaded', function () {
    // The no-FOUC inline script in <head> has already set data-theme.
    // Sync the toggle button to match it now that the DOM exists.
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    syncToggle(document.querySelector('.theme-toggle'), theme);

    // Scroll-in animations via Intersection Observer
    const animated = document.querySelectorAll('.inspiration-item, .project-card');
    if (animated.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { root: null, rootMargin: '0px', threshold: 0.1 });

        animated.forEach((item, index) => {
            item.style.transitionDelay = `${index * 0.08}s`;
            observer.observe(item);
        });
    }

    // Subtle parallax on the hero avatar (homepage only)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const avatar = document.querySelector('.avatar');
    if (avatar && !prefersReducedMotion) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrolled = window.pageYOffset;
                    if (scrolled < 100) {
                        avatar.style.transform = `translateY(${scrolled * 0.1}px)`;
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }
});
