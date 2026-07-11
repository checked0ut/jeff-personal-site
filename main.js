(function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------
       Theme toggle
       ------------------------------------------------------------ */
    function syncToggle(toggle) {
        if (!toggle) return;
        var dark = document.documentElement.getAttribute('data-theme') === 'dark';
        toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }

    function initTheme() {
        var toggle = document.querySelector('.theme-toggle');
        if (!toggle) return;
        syncToggle(toggle);
        toggle.addEventListener('click', function () {
            var html = document.documentElement;
            var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
            syncToggle(toggle);
        });

        // Follow live OS theme changes unless the user chose manually
        var media = window.matchMedia('(prefers-color-scheme: dark)');
        var onSchemeChange = function (e) {
            var stored = null;
            try { stored = localStorage.getItem('theme'); } catch (err) { /* private mode */ }
            if (stored) return;
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            syncToggle(toggle);
        };
        if (media.addEventListener) {
            media.addEventListener('change', onSchemeChange);
        }
    }

    /* ------------------------------------------------------------
       Sticky header state + mobile navigation
       ------------------------------------------------------------ */
    function initHeader() {
        var header = document.querySelector('.site-header');
        if (!header) return;

        var setScrolled = function () {
            header.classList.toggle('scrolled', window.scrollY > 8);
        };
        setScrolled();
        window.addEventListener('scroll', setScrolled, { passive: true });

        var toggle = header.querySelector('.nav-toggle');
        var nav = header.querySelector('.site-nav');
        if (!toggle || !nav) return;

        function setOpen(open) {
            header.classList.toggle('nav-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        }

        toggle.addEventListener('click', function () {
            setOpen(!header.classList.contains('nav-open'));
        });

        // Close on link tap, Escape, or clicking outside the header
        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) setOpen(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && header.classList.contains('nav-open')) {
                setOpen(false);
                toggle.focus();
            }
        });
        document.addEventListener('click', function (e) {
            if (header.classList.contains('nav-open') && !header.contains(e.target)) {
                setOpen(false);
            }
        });
    }

    /* ------------------------------------------------------------
       Scroll-spy: highlight the section currently in view
       ------------------------------------------------------------ */
    function initScrollSpy() {
        var links = Array.prototype.slice.call(
            document.querySelectorAll('.site-nav a[href^="#"]')
        );
        if (!links.length || !('IntersectionObserver' in window)) return;

        var byId = {};
        var sections = [];
        links.forEach(function (link) {
            var section = document.querySelector(link.getAttribute('href'));
            if (section) {
                byId[section.id] = link;
                sections.push(section);
            }
        });
        if (!sections.length) return;

        var current = null;
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) current = entry.target.id;
            });
            links.forEach(function (link) {
                var active = byId[current] === link;
                link.classList.toggle('active', active);
                if (active) {
                    link.setAttribute('aria-current', 'true');
                } else {
                    link.removeAttribute('aria-current');
                }
            });
        }, { rootMargin: '-35% 0px -55% 0px' });

        sections.forEach(function (s) { observer.observe(s); });
    }

    /* ------------------------------------------------------------
       Scroll-reveal animations
       ------------------------------------------------------------ */
    function initReveal() {
        var items = document.querySelectorAll('.reveal');
        if (!items.length) return;
        if (prefersReducedMotion || !('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

        // Stagger siblings that share a parent (cards in a grid)
        var groups = new Map();
        items.forEach(function (el) {
            var parent = el.parentElement;
            var index = groups.get(parent) || 0;
            el.style.transitionDelay = (index * 0.07) + 's';
            groups.set(parent, index + 1);
            observer.observe(el);
        });
    }

    /* ------------------------------------------------------------
       Cursor spotlight on project cards
       ------------------------------------------------------------ */
    function initSpotlight() {
        if (prefersReducedMotion) return;
        var cards = document.querySelectorAll('.project-card');
        cards.forEach(function (card) {
            card.addEventListener('pointermove', function (e) {
                var rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
                card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
            });
        });
    }

    /* ------------------------------------------------------------
       Subtle parallax on the hero avatar (homepage only)
       ------------------------------------------------------------ */
    function initParallax() {
        var avatar = document.querySelector('.avatar');
        if (!avatar || prefersReducedMotion) return;
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var scrolled = window.pageYOffset;
                    avatar.style.transform = scrolled < 160
                        ? 'translateY(' + (scrolled * 0.12) + 'px)'
                        : '';
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    /* ------------------------------------------------------------
       Accessible tabs for "Content I'm consuming"
       (progressive enhancement: without JS all groups stay visible)
       ------------------------------------------------------------ */
    function initContentTabs() {
        var container = document.querySelector('[data-tabs]');
        if (!container) return;
        var panels = Array.prototype.slice.call(
            container.querySelectorAll('.content-section')
        );
        if (panels.length < 2) return;

        var tabList = document.createElement('div');
        tabList.className = 'tab-list';
        tabList.setAttribute('role', 'tablist');
        tabList.setAttribute('aria-label', 'Content sources');

        var tabs = panels.map(function (panel, i) {
            var heading = panel.querySelector('h4');
            var tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'tab';
            tab.id = 'content-tab-' + i;
            tab.setAttribute('role', 'tab');

            // Reuse the heading's icon + label inside the tab button,
            // keep the heading itself for screen readers.
            if (heading) {
                Array.prototype.slice.call(heading.childNodes).forEach(function (node) {
                    tab.appendChild(node.cloneNode(true));
                });
                heading.classList.add('visually-hidden');
            } else {
                tab.textContent = 'Group ' + (i + 1);
            }

            panel.id = panel.id || 'content-panel-' + i;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', tab.id);
            tab.setAttribute('aria-controls', panel.id);
            tabList.appendChild(tab);
            return tab;
        });

        function select(index, focus) {
            tabs.forEach(function (tab, i) {
                var active = i === index;
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
                tab.tabIndex = active ? 0 : -1;
                if (active) {
                    panels[i].removeAttribute('hidden');
                    if (focus) tab.focus();
                } else {
                    panels[i].setAttribute('hidden', '');
                }
            });
        }

        tabs.forEach(function (tab, i) {
            tab.addEventListener('click', function () { select(i, false); });
            tab.addEventListener('keydown', function (e) {
                var next = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % tabs.length;
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
                if (e.key === 'Home') next = 0;
                if (e.key === 'End') next = tabs.length - 1;
                if (next !== null) {
                    e.preventDefault();
                    select(next, true);
                }
            });
        });

        container.insertBefore(tabList, panels[0]);
        container.classList.add('tabs-ready');
        select(0, false);
    }

    /* ------------------------------------------------------------
       "Right now" freshness stamp (data-updated is injected by the
       deploy workflow from git history; absent in local dev)
       ------------------------------------------------------------ */
    function initFreshness() {
        var el = document.querySelector('.right-now[data-updated]');
        if (!el) return;
        var note = el.querySelector('.update-note');
        var parts = (el.getAttribute('data-updated') || '').split('-');
        if (!note || parts.length !== 3) return;
        var months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        var month = months[parseInt(parts[1], 10) - 1];
        if (!month) return;
        var span = document.createElement('span');
        span.className = 'updated-stamp';
        span.textContent = 'Last updated ' + month + ' ' + parts[0];
        note.insertAdjacentElement('beforebegin', span);
    }

    /* ------------------------------------------------------------
       Reading time on article pages
       ------------------------------------------------------------ */
    function initReadingTime() {
        var article = document.querySelector('article.prose');
        var dek = document.querySelector('.article-dek');
        if (!article || !dek) return;
        var words = article.textContent.trim().split(/\s+/).length;
        var minutes = Math.max(1, Math.round(words / 200));
        var el = document.createElement('p');
        el.className = 'reading-time';
        el.textContent = minutes + ' min read';
        dek.insertAdjacentElement('afterend', el);
    }

    /* ------------------------------------------------------------
       Reading progress bar on article pages
       ------------------------------------------------------------ */
    function initProgressBar() {
        if (!document.querySelector('article.prose')) return;
        var bar = document.createElement('div');
        bar.className = 'progress-bar';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);

        var ticking = false;
        function update() {
            var doc = document.documentElement;
            var max = doc.scrollHeight - window.innerHeight;
            var progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
            bar.style.transform = 'scaleX(' + progress + ')';
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });
        update();
    }

    /* ------------------------------------------------------------
       Back to top
       ------------------------------------------------------------ */
    function initBackToTop() {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'back-to-top';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        });
        document.body.appendChild(btn);

        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    btn.classList.toggle('show', window.scrollY > 600);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    /* ------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initHeader();
        initScrollSpy();
        initReveal();
        initSpotlight();
        initParallax();
        initContentTabs();
        initFreshness();
        initReadingTime();
        initProgressBar();
        initBackToTop();
    });
})();
