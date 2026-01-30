// ============================================================
// FILE: config.js
// DESCRIZIONE: Configurazione Supabase, Navbar, Protezione Pagine, Modali Globali
// ============================================================

// ⚠️ INSERISCI QUI I TUOI DATI VERI
const SUPABASE_URL = 'https://gehqxdzlqcfxmhlaseeb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHF4ZHpscWNmeG1obGFzZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTUyMzgsImV4cCI6MjA4NTA5MTIzOH0.qKfxPMOFakbCuOSmFkPAlR6LovVRT-IO2cRk5bR3tUY';

// 1. Inizializzazione Supabase
if (window.supabase && window.supabase.createClient) {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabase = client;
    console.log("✅ Config: Supabase collegato!");
} else {
    console.error("❌ ERRORE: Libreria Supabase non trovata.");
}

// ============================================================
// --- 2. GESTIONE MODALI GLOBALI (Alert & Confirm) ---
// ============================================================

// Funzione: Alert Personalizzato (Sostituisce alert standard)
window.showCustomAlert = (title, message) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        if (!modal) {
            alert(message); // Fallback se manca l'HTML
            resolve();
            return;
        }
        
        // Elementi
        const mTitle = document.getElementById('modal-title');
        const mMsg = document.getElementById('modal-message');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancel');

        // Setup
        mTitle.innerText = title;
        mMsg.innerText = message;
        btnCancel.style.display = 'none'; // Nascondi Annulla
        btnOk.innerText = "OK";
        
        modal.style.display = 'flex';

        btnOk.onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
};

// Funzione: Confirm Personalizzato (Sostituisce confirm standard)
window.showCustomConfirm = (title, message, isDanger = false) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        if (!modal) {
            resolve(confirm(message)); // Fallback
            return;
        }

        const mTitle = document.getElementById('modal-title');
        const mMsg = document.getElementById('modal-message');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancel');

        mTitle.innerText = title;
        mMsg.innerText = message;
        btnCancel.style.display = 'block';
        
        // Stile pericolo
        if (isDanger) {
            btnOk.classList.add('btn-danger');
            mTitle.style.color = '#dc3545';
        } else {
            btnOk.classList.remove('btn-danger');
            mTitle.style.color = '#F55394';
        }

        modal.style.display = 'flex';

        btnOk.onclick = () => { modal.style.display = 'none'; resolve(true); };
        btnCancel.onclick = () => { modal.style.display = 'none'; resolve(false); };
    });
};

// ============================================================
// --- 3. PROTEZIONE PAGINE E NAVBAR ---
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- A. PROTEZIONE PAGINE (Entry Form & Booking) ---
 // --- A. PROTEZIONE PAGINE (Versione Fixata per Modale) ---
    async function checkPageProtection() {
        const protectedPages = ['booking.html', 'entry-form.html'];
        const currentPage = window.location.pathname;

        // Verifica se siamo in una pagina protetta
        const isProtected = protectedPages.some(page => currentPage.includes(page));

        if (isProtected) {
            // Controlla sessione
            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (!session) {
                // UTENTE NON LOGGATO
                
                // 1. Nascondiamo tutto tranne il modale per evitare spoiler
                const elementsToHide = document.querySelectorAll('header, section, footer, .bg-shapes');
                elementsToHide.forEach(el => el.style.display = 'none');
                
                // 2. Mostriamo l'avviso elegante
                // Nota: showCustomAlert è asincrono, aspettiamo che l'utente clicchi OK
                if (window.showCustomAlert) {
                    await window.showCustomAlert("Area Riservata", "Devi effettuare il Login per accedere a questa pagina.");
                } else {
                    alert("Devi effettuare il Login per accedere a questa pagina.");
                }
                
                // 3. Redirect al login
                window.location.href = 'login.html';
            }
        }
    }
    
    // Esegui controllo protezione
    if (window.supabase) await checkPageProtection();


    // --- B. AGGIORNAMENTO NAVBAR ---
    function updateNavbar(session) {
        const deskAuthLink = document.getElementById('nav-auth-link');
        const mobAuthLink = document.getElementById('mobile-auth-link');
        const deskBooking = document.getElementById('nav-booking');
        const mobBooking = document.getElementById('mobile-booking');

        if (session) {
            // --- LOGGATO ---
            let initial = "U";
            if (session.user?.user_metadata?.first_name) {
                initial = session.user.user_metadata.first_name.charAt(0);
            }
            
            const avatarHTML = `<div class="user-avatar">${initial}</div>`;
            const avatarMobile = `<div class="user-avatar">${initial}</div> <span>My Profile</span>`;

            if (deskAuthLink) { deskAuthLink.href = "account.html"; deskAuthLink.innerHTML = avatarHTML; }
            if (mobAuthLink) { mobAuthLink.href = "account.html"; mobAuthLink.innerHTML = avatarMobile; }

            // Sblocca Booking
            if(deskBooking) deskBooking.onclick = null;
            if(mobBooking) mobBooking.onclick = null;

        } else {
            // --- NON LOGGATO ---
            if (deskAuthLink) { deskAuthLink.href = "login.html"; deskAuthLink.innerHTML = '<i class="fas fa-user" style="font-size: 1.2rem;"></i>'; }
            if (mobAuthLink) { mobAuthLink.href = "login.html"; mobAuthLink.innerHTML = '<i class="fas fa-user"></i> <span>Account / Login</span>'; }

            // Azione di Blocco con MODALE INTERNO
            const lockAction = async (e) => {
                e.preventDefault();
                await window.showCustomAlert("Accesso Riservato", "Effettua il Login per prenotare.");
                window.location.href = 'login.html';
            };

            if(deskBooking) deskBooking.onclick = lockAction;
            if(mobBooking && !mobBooking.classList.contains('hamburger')) mobBooking.onclick = lockAction;
        }
    }

    // Monitora stato
    if (window.supabase) {
        window.supabase.auth.onAuthStateChange((event, session) => updateNavbar(session));
        window.supabase.auth.getSession().then(({ data: { session } }) => updateNavbar(session));
    }
});

// --- C. LOGOUT GLOBALE ---
window.handleLogout = async function() {
    const confirmLogout = await window.showCustomConfirm("Logout", "Sei sicuro di voler uscire?");
    if(confirmLogout && window.supabase) {
        await window.supabase.auth.signOut();
        window.location.reload();
    }
}