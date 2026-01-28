document.addEventListener('DOMContentLoaded', () => {

    // --- 1. COUNTDOWN LOGIC (May 23, 2026 09:00:00) ---
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

        // Controllo esistenza elementi
        if(document.getElementById('days')) document.getElementById('days').innerText = d < 10 ? "0" + d : d;
        if(document.getElementById('hours')) document.getElementById('hours').innerText = h < 10 ? "0" + h : h;
        if(document.getElementById('minutes')) document.getElementById('minutes').innerText = m < 10 ? "0" + m : m;
        if(document.getElementById('seconds')) document.getElementById('seconds').innerText = s < 10 ? "0" + s : s;
    }, 1000);

    // --- 2. ANIMAZIONI SCROLL (Intersection Observer) ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    // Osserva sia .scroll-animate che .fade-in-up
    const scrollElements = document.querySelectorAll('.scroll-animate, .fade-in-up');
    scrollElements.forEach(el => observer.observe(el));

    // --- 3. NAVBAR SCROLL EFFECT ---
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

    // --- 4. SMOOTH SCROLL ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            // Esegue solo se è un vero link interno
            if(href.startsWith('#') && href.length > 1){
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // --- 5. PARALLAX EFFECT ---
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const shapes = document.querySelectorAll('.shape');
        
        if (shapes.length > 0) {
            shapes[0].style.transform = `translateY(${scrolled * 0.2}px)`;
            shapes[1].style.transform = `translateY(-${scrolled * 0.1}px)`;
        }
    });

    // --- 6. GESTIONE MENU MOBILE (Logica Side Drawer Corretta) ---
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const body = document.body;

    function toggleMenu() {
        if(hamburger && mobileMenu && overlay) {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            overlay.classList.toggle('active');
            
            // Blocca lo scroll del sito quando il menu è aperto
            if (mobileMenu.classList.contains('active')) {
                body.style.overflow = 'hidden';
            } else {
                body.style.overflow = '';
            }
        }
    }

    if (hamburger) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation(); // Importante: previene problemi di click
            toggleMenu();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', toggleMenu);
    }

    // Chiude il menu quando clicchi su un link interno al menu
    const mobileLinks = document.querySelectorAll('.mobile-links-container a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', toggleMenu);
    });

    // --- 7. COPIA TELEFONO ---
    const phoneLink = document.getElementById('phone-copy');
    if (phoneLink) {
        phoneLink.addEventListener('click', function(e) {
            e.preventDefault(); 
            
            const numberToCopy = this.getAttribute('data-number');
            const originalText = this.innerHTML;

            navigator.clipboard.writeText(numberToCopy).then(() => {
                // Feedback in Inglese
                this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                this.style.color = '#00ff00'; 
                
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.color = ''; 
                }, 2000);
                
            }).catch(err => {
                console.error('Error copying: ', err);
            });
        });
    }

    // --- 8. COPIA EMAIL ---
    const emailLink = document.getElementById('email-copy');
    if (emailLink) {
        emailLink.addEventListener('click', function(e) {
            e.preventDefault(); 
            
            const emailToCopy = this.getAttribute('data-email');
            const originalText = this.innerHTML; 

            navigator.clipboard.writeText(emailToCopy).then(() => {
                // Feedback in Inglese
                this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                this.style.color = '#00ff00'; 
                
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.color = ''; 
                }, 2000);
                
            }).catch(err => {
                console.error('Error copying: ', err);
            });
        });
    }

});