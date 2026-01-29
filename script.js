// ============================================================
// --- 1. CONFIGURAZIONE SUPABASE ---
// ============================================================

// ⚠️ INSERISCI QUI I TUOI DATI (Da Supabase -> Settings -> API)
const SUPABASE_URL = 'INSERISCI_QUI_LA_TUA_URL_SUPABASE'; 
const SUPABASE_KEY = 'INSERISCI_QUI_LA_TUA_CHIAVE_ANON_PUBLIC';

// Inizializza il client Supabase
let supabase;
if (SUPABASE_URL.includes('https') && SUPABASE_KEY.length > 20) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase collegato!");
} else {
    console.warn("⚠️ ATTENZIONE: Chiavi Supabase mancanti in script.js");
}

// ============================================================
// --- 2. FUNZIONI GLOBALI (Logout & Modali) ---
// ============================================================

// Funzione Logout (Globale per essere chiamata dall'HTML)
window.handleLogout = async function() {
    if(confirm("Sei sicuro di voler uscire?")) {
        if (supabase) {
            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.reload(); // Ricarica la pagina per aggiornare la navbar
            } else {
                alert("Errore durante il logout: " + error.message);
            }
        }
    }
}

// Funzione Apertura Modale Pagamento
window.openPaymentModal = function() {
    const form = document.getElementById('bookingForm');
    if (form.checkValidity()) {
        document.getElementById('paymentModal').style.display = 'flex';
    } else {
        form.reportValidity();
    }
}


// ============================================================
// --- 3. MAIN EVENT LISTENER (Caricamento Pagina) ---
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- A. COUNTDOWN LOGIC (May 23, 2026) ---
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

    // --- B. UI INTERACTION (Header, Mobile Menu, Scroll) ---
    const header = document.querySelector('header');
    const navbar = document.getElementById('navbar'); // Fallback ID
    const activeHeader = header || navbar;

    window.addEventListener('scroll', () => {
        if (activeHeader) activeHeader.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Mobile Menu
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

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if(href.startsWith('#') && href.length > 1){
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Scroll Animations
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate, .fade-in-up').forEach(el => observer.observe(el));


    // --- C. AUTH LOGIC (LOGIN / SIGNUP / NAVBAR) ---
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const formLogin = document.getElementById('loginForm');
    const formSignup = document.getElementById('signupForm');
    const authMessage = document.getElementById('authMessage');

    // 1. Switch Tabs
    if (btnLogin && btnSignup) {
        btnLogin.addEventListener('click', () => {
            btnLogin.classList.add('active');
            btnSignup.classList.remove('active');
            formLogin.classList.add('active');
            formSignup.classList.remove('active');
            if(authMessage) authMessage.style.display = 'none';
        });

        btnSignup.addEventListener('click', () => {
            btnSignup.classList.add('active');
            btnLogin.classList.remove('active');
            formSignup.classList.add('active');
            formLogin.classList.remove('active');
            if(authMessage) authMessage.style.display = 'none';
        });
    }

    // 2. Registrazione
    if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            const firstName = document.getElementById('regName').value;
            const lastName = document.getElementById('regSurname').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const btn = formSignup.querySelector('button');

            btn.disabled = true;
            btn.innerText = "Creating Account...";
            if(authMessage) authMessage.style.display = 'none';

            try {
                if (!supabase) throw new Error("Supabase non configurato.");
                const { error } = await supabase.auth.signUp({
                    email, password, options: { data: { first_name: firstName, last_name: lastName } }
                });
                if (error) throw error;

                authMessage.className = "auth-message success";
                authMessage.innerText = "Registrazione riuscita! Ora puoi fare il Login.";
                authMessage.style.display = 'block';
                formSignup.reset();
                setTimeout(() => { if(btnLogin) btnLogin.click(); }, 1500);

            } catch (err) {
                authMessage.className = "auth-message error";
                authMessage.innerText = err.message;
                authMessage.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.innerText = "SIGN UP";
            }
        });
    }

    // 3. Login
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = formLogin.querySelector('button');

            btn.disabled = true;
            btn.innerText = "Logging in...";
            if(authMessage) authMessage.style.display = 'none';

            try {
                if (!supabase) throw new Error("Supabase non configurato.");
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = "index.html"; 

            } catch (err) {
                authMessage.className = "auth-message error";
                authMessage.innerText = "Email o Password errati.";
                authMessage.style.display = 'block';
                btn.disabled = false;
                btn.innerText = "LOG IN";
            }
        });
    }

    // 4. Gestione Navbar (Login/Logout State)
    function updateNavbar(session) {
        const navLogin = document.getElementById('nav-login');
        const navLogout = document.getElementById('nav-logout');
        const navBooking = document.getElementById('nav-booking');

        if (session) {
            // Loggato
            if(navLogin) navLogin.style.display = 'none';
            if(navLogout) navLogout.style.display = 'block';
            if(navBooking) navBooking.onclick = null; // Sblocca link
        } else {
            // Non Loggato
            if(navLogin) navLogin.style.display = 'block';
            if(navLogout) navLogout.style.display = 'none';
            if(navBooking) {
                navBooking.onclick = (e) => {
                    e.preventDefault();
                    alert("Effettua il Login per prenotare.");
                    window.location.href = 'login.html';
                };
            }
        }
    }

    if (supabase) {
        supabase.auth.onAuthStateChange((event, session) => updateNavbar(session));
        // Controllo redirect se sono già su login.html
        if (window.location.pathname.includes('login.html')) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) window.location.href = 'index.html';
            });
        }
    }


    // --- D. ENTRY FORM LOGIC (Prezzi & URL Param) ---
    const entryForm = document.getElementById('bookingForm');
    if (entryForm) {
        const pkgRadios = document.querySelectorAll('input[name="package"]');
        const extraNightsInput = document.getElementById('extraNights');
        const displayPkgName = document.getElementById('selectedPkgName');
        const displayPkgPrice = document.getElementById('selectedPkgPrice');
        const displayNightCount = document.getElementById('nightCount');
        const displayNightTotal = document.getElementById('nightTotal');
        const displayGrandTotal = document.getElementById('grandTotal');
        const modalTotal = document.getElementById('modalTotal');
        const NIGHT_PRICE = 70;

        function calculateTotal() {
            let selectedRadio = document.querySelector('input[name="package"]:checked');
            if (!selectedRadio) return; 

            let pkgPrice = parseFloat(selectedRadio.value);
            let pkgName = selectedRadio.getAttribute('data-name');
            let nights = parseInt(extraNightsInput.value) || 0;
            let nightsCost = nights * NIGHT_PRICE;
            let total = pkgPrice + nightsCost;

            if(displayPkgName) displayPkgName.textContent = pkgName;
            if(displayPkgPrice) displayPkgPrice.textContent = '€ ' + pkgPrice;
            if(displayNightCount) displayNightCount.textContent = nights;
            if(displayNightTotal) displayNightTotal.textContent = '€ ' + nightsCost;
            if(displayGrandTotal) displayGrandTotal.textContent = '€ ' + total;
            if(modalTotal) modalTotal.textContent = '€ ' + total;
        }

        pkgRadios.forEach(radio => radio.addEventListener('change', calculateTotal));
        if(extraNightsInput) extraNightsInput.addEventListener('input', calculateTotal);

        // Auto-selezione da URL (es. ?pkg=220)
        const urlParams = new URLSearchParams(window.location.search);
        const pkgParam = urlParams.get('pkg');
        if (pkgParam) {
            const targetRadio = document.querySelector(`input[name="package"][value="${pkgParam}"]`);
            if (targetRadio) {
                setTimeout(() => targetRadio.click(), 100); // Forza il click
            }
        } else {
            calculateTotal();
        }
    }


    // --- E. PAYMENT LOGIC (Supabase Submit) ---
    const paymentForm = document.querySelector('.payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Raccogli dati form principale
            const mainForm = document.getElementById('bookingForm');
            if(!mainForm.checkValidity()) {
                alert("Compila tutti i campi del modulo principale prima di pagare.");
                return;
            }

            const formData = {
                man_name: document.querySelector('input[name="manName"]').value,
                man_surname: document.querySelector('input[name="manSurname"]').value,
                female_name: document.querySelector('input[name="femaleName"]').value,
                female_surname: document.querySelector('input[name="femaleSurname"]').value,
                country: document.querySelector('input[name="country"]').value,
                teacher: document.querySelector('input[name="teacherName"]').value,
                age_group: document.querySelector('select[name="ageGroup"]').value,
                email: document.querySelector('input[name="email"]').value,
                phone: document.querySelector('input[name="phone"]').value,
                package_type: document.querySelector('input[name="package"]:checked')?.getAttribute('data-name'),
                package_price: parseFloat(document.querySelector('input[name="package"]:checked')?.value),
                extra_nights: parseInt(document.getElementById('extraNights').value) || 0,
                arrival_date: document.querySelector('input[name="arrivalDate"]').value,
                arrival_time: document.querySelector('input[name="arrivalTime"]').value,
                departure_date: document.querySelector('input[name="departureDate"]').value,
                departure_time: document.querySelector('input[name="departureTime"]').value,
                total_amount: parseFloat(document.getElementById('modalTotal').textContent.replace('€ ', '')),
                status: 'paid',
                created_at: new Date().toISOString()
            };

            const btn = paymentForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Processing...";
            btn.disabled = true;

            try {
                if (supabase) {
                    const { data, error } = await supabase.from('orders').insert([formData]);
                    if (error) throw error;
                } else {
                    console.warn("Simulazione: Supabase non configurato.");
                    await new Promise(r => setTimeout(r, 1500));
                }
                
                alert('Payment Successful! Confirmation email sent.');
                document.getElementById('paymentModal').style.display = 'none';
                window.location.href = 'index.html';

            } catch (err) {
                alert('Error: ' + err.message);
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // Chiudi modale pagamento
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('paymentModal').style.display = 'none';
        });
    }


    // --- F. GALLERY LIGHTBOX ---
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

    // --- G. COPY UTILS (Phone/Email) ---
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