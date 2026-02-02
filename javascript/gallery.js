// ============================================================
// FILE: gallery.js
// DESCRIZIONE: Countdown e Lightbox Gallery
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. COUNTDOWN ---
    const eventDate = new Date("May 23, 2026 09:00:00").getTime();
    if(document.getElementById('days')) {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const diff = eventDate - now;

            if (diff < 0) { clearInterval(timer); return; }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            if(document.getElementById('days')) document.getElementById('days').innerText = d < 10 ? "0" + d : d;
            if(document.getElementById('hours')) document.getElementById('hours').innerText = h < 10 ? "0" + h : h;
            if(document.getElementById('minutes')) document.getElementById('minutes').innerText = m < 10 ? "0" + m : m;
            if(document.getElementById('seconds')) document.getElementById('seconds').innerText = s < 10 ? "0" + s : s;
        }, 1000);
    }

    // --- 2. LIGHTBOX GALLERY ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-lightbox');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (lightbox && lightboxImg) {
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                if (img) {
                    lightbox.style.display = "flex"; 
                    lightbox.style.alignItems = "center";
                    lightbox.style.justifyContent = "center";
                    lightboxImg.src = img.src;
                    document.body.style.overflow = "hidden";
                }
            });
        });

        const closeL = () => { lightbox.style.display = "none"; document.body.style.overflow = ""; };
        if (closeBtn) closeBtn.addEventListener('click', closeL);
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeL(); });
    }
}); 