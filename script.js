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
    // --- CONFIGURAZIONE SUPABASE ---
// Inserisci qui i dati che trovi nella dashboard di Supabase (Settings -> API)
// Se non li hai ancora, il codice funzionerà mostrando un alert di simulazione.
const SUPABASE_URL = 'INSERISCI_LA_TUA_SUPABASE_URL_QUI';
const SUPABASE_KEY = 'INSERISCI_LA_TUA_ANON_KEY_QUI';

// Inizializza il client (se le chiavi sono presenti)
let supabase;
if (typeof supabase !== 'undefined' && SUPABASE_URL.includes('https')) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // ============================================================
    // --- 12. AUTH PAGE LOGIC (Login / Sign Up) ---
    // ============================================================
    
    // Switch Tabs
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const formLogin = document.getElementById('loginForm');
    const formSignup = document.getElementById('signupForm');
    const authMessage = document.getElementById('authMessage');

    if (btnLogin && btnSignup) {
        // Mostra Login
        btnLogin.addEventListener('click', () => {
            btnLogin.classList.add('active');
            btnSignup.classList.remove('active');
            formLogin.classList.add('active');
            formSignup.classList.remove('active');
            authMessage.style.display = 'none'; // Nascondi messaggi vecchi
        });

        // Mostra Sign Up
        btnSignup.addEventListener('click', () => {
            btnSignup.classList.add('active');
            btnLogin.classList.remove('active');
            formSignup.classList.add('active');
            formLogin.classList.remove('active');
            authMessage.style.display = 'none';
        });
    }

    // --- LOGICA SIGN UP (Registrazione) ---
    if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const firstName = document.getElementById('regName').value;
            const lastName = document.getElementById('regSurname').value;
            const btn = formSignup.querySelector('button');

            btn.disabled = true;
            btn.innerText = "Creating Account...";
            authMessage.style.display = 'none';

            if (!supabase) {
                alert("Supabase non configurato nello script.js!");
                btn.disabled = false;
                return;
            }

            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName
                        }
                    }
                });

                if (error) throw error;

                // Successo
                authMessage.className = "auth-message success";
                authMessage.innerText = "Registration successful! Please check your email to confirm your account.";
                formSignup.reset();

            } catch (err) {
                authMessage.className = "auth-message error";
                authMessage.innerText = err.message;
            } finally {
                btn.disabled = false;
                btn.innerText = "SIGN UP";
            }
        });
    }

    // --- LOGICA LOGIN (Accesso) ---
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = formLogin.querySelector('button');

            btn.disabled = true;
            btn.innerText = "Logging in...";
            authMessage.style.display = 'none';

            if (!supabase) {
                alert("Supabase non configurato!");
                return;
            }

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Successo -> Redirect alla pagina riservata o Home
                window.location.href = "booking.html"; // Esempio: manda al booking

            } catch (err) {
                authMessage.className = "auth-message error";
                authMessage.innerText = "Invalid login credentials.";
                btn.disabled = false;
                btn.innerText = "LOG IN";
            }
        });
    }

    // Controllo Stato Utente (Mostra/Nascondi link in base al login)
    async function checkUserStatus() {
        if (!supabase) return;
        
        const { data: { session } } = await supabase.auth.getSession();
        
        // Se sei nella pagina di login ma sei già loggato, vai via
        if (session && window.location.pathname.includes('login.html')) {
            window.location.href = 'booking.html';
        }
    }
    
    // Esegui controllo all'avvio
    checkUserStatus();
}

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. HEADER SCROLL EFFECT ---
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // --- 2. MOBILE MENU ---
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');

    function toggleMenu() {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        overlay.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    }

    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }

    // --- 3. SCROLL ANIMATIONS ---
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-in-up, .scroll-animate');
    animatedElements.forEach(el => observer.observe(el));


    // ============================================================
    // --- 10. ENTRY FORM LOGIC (CALCOLO PREZZI AGGIORNATO) ---
    // ============================================================
    const entryForm = document.getElementById('bookingForm');
    
    if (entryForm) {
        const pkgRadios = document.querySelectorAll('input[name="package"]');
        const extraNightsInput = document.getElementById('extraNights');
        
        // Elementi Riepilogo
        const displayPkgName = document.getElementById('selectedPkgName');
        const displayPkgPrice = document.getElementById('selectedPkgPrice');
        const displayNightCount = document.getElementById('nightCount');
        const displayNightTotal = document.getElementById('nightTotal');
        const displayGrandTotal = document.getElementById('grandTotal');
        const modalTotal = document.getElementById('modalTotal');

        const NIGHT_PRICE = 70;

        function calculateTotal() {
            // 1. Trova pacchetto selezionato
            let selectedRadio = document.querySelector('input[name="package"]:checked');
            if (!selectedRadio) return; // Sicurezza

            let pkgPrice = parseFloat(selectedRadio.value);
            let pkgName = selectedRadio.getAttribute('data-name');

            // 2. Leggi Notti Extra
            let nights = parseInt(extraNightsInput.value) || 0;
            let nightsCost = nights * NIGHT_PRICE;

            // 3. Calcola Totale
            let total = pkgPrice + nightsCost;

            // 4. Aggiorna UI
            if(displayPkgName) displayPkgName.textContent = pkgName;
            if(displayPkgPrice) displayPkgPrice.textContent = '€ ' + pkgPrice;
            
            if(displayNightCount) displayNightCount.textContent = nights;
            if(displayNightTotal) displayNightTotal.textContent = '€ ' + nightsCost;
            
            if(displayGrandTotal) displayGrandTotal.textContent = '€ ' + total;
            
            // Aggiorna anche il totale nel modale di pagamento
            if(modalTotal) modalTotal.textContent = '€ ' + total;
        }

        // Event Listeners per ricalcolo
        pkgRadios.forEach(radio => {
            radio.addEventListener('change', calculateTotal);
        });
        
        if(extraNightsInput) {
            extraNightsInput.addEventListener('input', calculateTotal);
        }

        // Calcolo iniziale
        calculateTotal();
    }

    // --- 11. PAYMENT MODAL LOGIC (CON RACCOLTA DATI PER SUPABASE) ---
    
    // Funzione globale per aprire il modale (chiamata dal bottone HTML)
    window.openPaymentModal = function() {
        const form = document.getElementById('bookingForm');
        // Controlla validità form (HTML5 validation)
        if (form.checkValidity()) {
            document.getElementById('paymentModal').style.display = 'flex';
        } else {
            form.reportValidity(); // Mostra errori se mancano campi obbligatori
        }
    }

    // Gestione Invio Pagamento (Simulazione o Supabase)
    const paymentForm = document.querySelector('.payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. RACCOLTA DATI (Struttura per Database)
            const formData = {
                // Coppia
                man_name: document.querySelector('input[name="manName"]').value,
                man_surname: document.querySelector('input[name="manSurname"]').value,
                female_name: document.querySelector('input[name="femaleName"]').value,
                female_surname: document.querySelector('input[name="femaleSurname"]').value,
                
                // Info
                country: document.querySelector('input[name="country"]').value,
                teacher: document.querySelector('input[name="teacherName"]').value,
                age_group: document.querySelector('select[name="ageGroup"]').value,
                
                // Contatti
                email: document.querySelector('input[name="email"]').value,
                phone: document.querySelector('input[name="phone"]').value,
                
                // Pacchetto
                package_type: document.querySelector('input[name="package"]:checked')?.getAttribute('data-name'),
                package_price: parseFloat(document.querySelector('input[name="package"]:checked')?.value),
                extra_nights: parseInt(document.getElementById('extraNights').value) || 0,
                
                // Logistica
                arrival_date: document.querySelector('input[name="arrivalDate"]').value,
                arrival_time: document.querySelector('input[name="arrivalTime"]').value,
                departure_date: document.querySelector('input[name="departureDate"]').value,
                departure_time: document.querySelector('input[name="departureTime"]').value,

                // Totale e Stato
                total_amount: parseFloat(document.getElementById('modalTotal').textContent.replace('€ ', '')),
                status: 'paid',
                created_at: new Date().toISOString()
            };

            console.log("Dati pronti per invio:", formData);

            const btn = paymentForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Processing...";
            btn.disabled = true;

            try {
                // SE SUPABASE È CONFIGURATO
                if (supabase) {
                    const { data, error } = await supabase
                        .from('orders') // Assicurati di aver creato la tabella 'orders'
                        .insert([formData])
                        .select();

                    if (error) throw error;
                    console.log("Ordine salvato su Supabase:", data);
                } else {
                    // SIMULAZIONE (Se non hai ancora messo le chiavi)
                    console.warn("Supabase non configurato. Simulazione salvataggio.");
                    await new Promise(resolve => setTimeout(resolve, 1500)); // Finta attesa
                }

                // SUCCESSO
                alert('Payment Successful! Confirmation email sent to ' + formData.email);
                document.getElementById('paymentModal').style.display = 'none';
                window.location.href = 'index.html'; // Redirect alla home

            } catch (err) {
                console.error('Errore:', err);
                alert('Error processing booking: ' + err.message);
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // Chiudi Modale
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('paymentModal').style.display = 'none';
        });
    }

    // ============================================================
    // --- 9. GALLERY LIGHTBOX LOGIC ---
    // ============================================================
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

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                lightbox.style.display = "none";
                document.body.style.overflow = ""; 
            });
        }

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.style.display = "none";
                document.body.style.overflow = "";
            }
        });
    }

});

});

// --- 9. GALLERY LIGHTBOX LOGIC (Corretto) ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-lightbox');
    
    // MODIFICA: Selezioniamo il contenitore '.gallery-item' invece dell'immagine diretta
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (lightbox && lightboxImg) {
        
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                // Cerca l'immagine dentro il riquadro cliccato
                const img = item.querySelector('img');
                
                if (img) {
                    lightbox.style.display = "flex"; 
                    lightbox.style.alignItems = "center";
                    lightbox.style.justifyContent = "center";
                    
                    // Prende la sorgente dell'immagine trovata
                    lightboxImg.src = img.src;
                    
                    document.body.style.overflow = "hidden";
                }
            });
        });

        // Chiudi con la X
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                lightbox.style.display = "none";
                document.body.style.overflow = ""; 
            });
        }

        // Chiudi cliccando fuori
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.style.display = "none";
                document.body.style.overflow = "";
            }
        });
    }