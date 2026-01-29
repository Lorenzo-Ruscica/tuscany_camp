// ============================================================
// FILE: auth.js
// DESCRIZIONE: Login, Signup, Switch Tabs
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const formLogin = document.getElementById('loginForm');
    const formSignup = document.getElementById('signupForm');
    const authMessage = document.getElementById('authMessage');

    // 1. Switch Tabs
    if (btnLogin && btnSignup) {
        const switchTab = (showLogin) => {
            btnLogin.classList.toggle('active', showLogin);
            btnSignup.classList.toggle('active', !showLogin);
            formLogin.classList.toggle('active', showLogin);
            formSignup.classList.toggle('active', !showLogin);
            if(authMessage) authMessage.style.display = 'none';
        };

        btnLogin.addEventListener('click', () => switchTab(true));
        btnSignup.addEventListener('click', () => switchTab(false));
    }

    // 2. Redirect se già loggato
    if (window.supabase) {
        window.supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) window.location.href = 'index.html';
        });
    }

    // 3. Registrazione
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
                if (!window.supabase) throw new Error("Supabase non connesso.");
                const { error } = await window.supabase.auth.signUp({
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

    // 4. Login
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
                if (!window.supabase) throw new Error("Supabase non connesso.");
                const { error } = await window.supabase.auth.signInWithPassword({ email, password });
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
});
