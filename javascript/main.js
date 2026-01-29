// ============================================================
// FILE: main.js
// DESCRIZIONE: UI, Menu Mobile, Animazioni, Scroll
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. HEADER SCROLL ---
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 50);
    });

    // --- 2. MOBILE MENU ---
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');

    function toggleMenu() {
        if(hamburger) hamburger.classList.toggle('active');
        if(mobileMenu) mobileMenu.classList.toggle('active');
        if(overlay) overlay.classList.toggle('active');
        document.body.classList.toggle(mobileMenu && mobileMenu.classList.contains('active') ? 'no-scroll' : '');
    }

    if (hamburger) {
        hamburger.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
        if(overlay) overlay.addEventListener('click', toggleMenu);
        // Chiude menu al click sui link
        document.querySelectorAll('.mobile-links-container a').forEach(link => {
            link.addEventListener('click', toggleMenu);
        });
    }

    // --- 3. ANIMAZIONI SCROLL ---
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate, .fade-in-up').forEach(el => observer.observe(el));

    // --- 4. COPY TO CLIPBOARD ---
    const copyToClipboard = (elementId, attribute) => {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                const text = this.getAttribute(attribute);
                const original = this.innerHTML;
                navigator.clipboard.writeText(text).then(() => {
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    this.style.color = '#00ff00';
                    setTimeout(() => { this.innerHTML = original; this.style.color = ''; }, 2000);
                });
            });
        }
    };
    copyToClipboard('phone-copy', 'data-number');
    copyToClipboard('email-copy', 'data-email');
});