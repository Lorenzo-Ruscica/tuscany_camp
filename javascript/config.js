// ============================================================
// FILE: config.js
// DESCRIZIONE: Configurazione Supabase, Navbar state, Logout
// ============================================================

// ⚠️ INSERISCI QUI I TUOI DATI VERI
const SUPABASE_URL = 'https://gehqxdzlqcfxmhlaseeb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlaHF4ZHpscWNmeG1obGFzZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTUyMzgsImV4cCI6MjA4NTA5MTIzOH0.qKfxPMOFakbCuOSmFkPAlR6LovVRT-IO2cRk5bR3tUY';

// Controllo se la libreria è stata caricata dal CDN
if (window.supabase && window.supabase.createClient) {
    
    // Inizializza il client usando la libreria caricata
    // NOTA: Salviamo il client in una variabile globale 'window.supabase' sovrascrivendo la libreria
    // Questo va bene perché d'ora in poi useremo solo il client.
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabase = client;
    
    console.log("✅ Config: Supabase collegato correttamente!");

} else {
    console.error("❌ ERRORE CRITICO: La libreria Supabase non è stata caricata prima di config.js.");
    console.error("Verifica l'ordine degli script nel file HTML.");
}

// --- FUNZIONE LOGOUT GLOBALE ---
window.handleLogout = async function() {
    if(confirm("Sei sicuro di voler uscire?")) {
        // Verifica che il client sia pronto
        if (window.supabase && window.supabase.auth) {
            const { error } = await window.supabase.auth.signOut();
            if (!error) {
                window.location.reload(); 
            } else {
                alert("Errore logout: " + error.message);
            }
        } else {
            console.error("Supabase non trovato durante il logout");
        }
    }
}

// --- GESTIONE NAVBAR (Aggiornata per Account Page) ---
document.addEventListener('DOMContentLoaded', () => {
    function updateNavbar(session) {
        // Seleziona l'elemento della lista (LI) che contiene il link Account
        // Nel tuo HTML hai: <li><a href="login.html" ...> Account</a></li>
        // Per farlo funzionare bene, nell'HTML di tutte le pagine, dai un ID a quel <li>
        // Esempio HTML: <li id="nav-auth-item"><a href="login.html" id="nav-auth-link"><i class="fas fa-user"></i> Account</a></li>
        
        const navAuthLink = document.querySelector('.nav-links a[href*="login.html"], .nav-links a[href*="account.html"]');
        const navBooking = document.getElementById('nav-booking');

        if (session) {
            // --- UTENTE LOGGATO ---
            
            // 1. Cambia il link "Account" -> "My Profile"
            if (navAuthLink) {
                navAuthLink.href = "account.html";
                navAuthLink.innerHTML = '<i class="fas fa-user-circle"></i> My Profile';
            }

            // 2. Sblocca Booking
            if(navBooking) navBooking.onclick = null; 

        } else {
            // --- UTENTE NON LOGGATO ---
            
            // 1. Ripristina link "Login"
            if (navAuthLink) {
                navAuthLink.href = "login.html";
                navAuthLink.innerHTML = '<i class="fas fa-user"></i> Account / Login';
            }

            // 2. Blocca Booking
            if(navBooking) {
                navBooking.onclick = (e) => {
                    e.preventDefault();
                    alert("Effettua il Login per prenotare.");
                    window.location.href = 'login.html';
                };
            }
        }
    }

    // Ascolta i cambiamenti
    if (window.supabase && window.supabase.auth) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            updateNavbar(session);
        });
        
        // Controllo iniziale veloce
        window.supabase.auth.getSession().then(({ data: { session } }) => {
            updateNavbar(session);
        });
    }
});