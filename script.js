document.addEventListener('DOMContentLoaded', () => {
    
// 1. COUNTDOWN LOGIC (Data: 23 Maggio alle 09:00)
const eventDate = new Date("May 23, 2026 09:00:00").getTime();

    const timer = setInterval(() => {
        const now = new Date().getTime();
        const diff = eventDate - now;

        if (diff < 0) {
            clearInterval(timer);
            return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        // Controllo esistenza elementi prima di scrivere per evitare errori in altre pagine
        if(document.getElementById('days')) document.getElementById('days').innerText = d < 10 ? "0" + d : d;
        if(document.getElementById('hours')) document.getElementById('hours').innerText = h < 10 ? "0" + h : h;
        if(document.getElementById('minutes')) document.getElementById('minutes').innerText = m < 10 ? "0" + m : m;
        if(document.getElementById('seconds')) document.getElementById('seconds').innerText = s < 10 ? "0" + s : s;
    }, 1000);

    // 2. Intersection Observer per animazioni allo scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Anima solo una volta
            }
        });
    }, observerOptions);

    const scrollElements = document.querySelectorAll('.scroll-animate');
    scrollElements.forEach(el => observer.observe(el));

    // 3. Navbar effect on scroll
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // 4. Smooth Scroll per i link interni
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // Solo se è un link interno (inizia con #)
            if(this.getAttribute('href').startsWith('#')){
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // 5. Parallax Effect semplice per le forme sullo sfondo
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const shapes = document.querySelectorAll('.shape');
        
        if (shapes.length > 0) {
            shapes[0].style.transform = `translateY(${scrolled * 0.2}px)`;
            shapes[1].style.transform = `translateY(-${scrolled * 0.1}px)`;
        }
    });

    // 6. Gestione Menu Mobile (Aggiunta per completezza)
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            if (mobileMenu.style.display === 'block') {
                mobileMenu.style.display = 'none';
            } else {
                mobileMenu.style.display = 'block';
                mobileMenu.style.background = 'rgba(0,0,0,0.95)';
                mobileMenu.style.position = 'fixed';
                mobileMenu.style.top = '70px';
                mobileMenu.style.width = '100%';
                mobileMenu.style.padding = '20px';
                mobileMenu.style.textAlign = 'center';
            }
        });
    }
});