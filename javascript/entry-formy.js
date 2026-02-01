// ============================================================
// FILE: entry-form.js
// DESCRIZIONE: Logica Entry Form, Calcolo Prezzi, Pagamento
// ============================================================

// Funzione globale per aprire il modale (chiamata dall'HTML)
window.openPaymentModal = function() {
    const form = document.getElementById('bookingForm');
    if (form.checkValidity()) {
        document.getElementById('paymentModal').style.display = 'flex';
    } else {
        form.reportValidity();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const entryForm = document.getElementById('bookingForm');
    if (!entryForm) return;

    const pkgRadios = document.querySelectorAll('input[name="package"]');
    const extraNightsInput = document.getElementById('extraNights');
    const displayPkgName = document.getElementById('selectedPkgName');
    const displayPkgPrice = document.getElementById('selectedPkgPrice');
    const displayNightCount = document.getElementById('nightCount');
    const displayNightTotal = document.getElementById('nightTotal');
    const displayGrandTotal = document.getElementById('grandTotal');
    const modalTotal = document.getElementById('modalTotal');
    const NIGHT_PRICE = 70;

    // 1. Calcolo Totale
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

    // 2. Auto-selezione da URL (es. ?pkg=220)
    const urlParams = new URLSearchParams(window.location.search);
    const pkgParam = urlParams.get('pkg');
    if (pkgParam) {
        const targetRadio = document.querySelector(`input[name="package"][value="${pkgParam}"]`);
        if (targetRadio) {
            setTimeout(() => targetRadio.click(), 100); 
        }
    } else {
        calculateTotal();
    }

    // 3. Pagamento e Invio a Supabase
    const paymentForm = document.querySelector('.payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if(!entryForm.checkValidity()) {
                alert("Compila tutti i campi prima di pagare.");
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
                if (window.supabase) {
                    const { error } = await window.supabase.from('orders').insert([formData]);
                    if (error) throw error;
                } else {
                    console.warn("Simulazione: Supabase non configurato.");
                    await new Promise(r => setTimeout(r, 1500));
                }
                
                alert('Payment Successful!');
                document.getElementById('paymentModal').style.display = 'none';
                window.location.href = 'index.html';

            } catch (err) {
                alert('Error: ' + err.message);
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // Chiudi modale
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('paymentModal').style.display = 'none';
        });
    }
});// ============================================================
// FILE: js/entry_form.js
// DESCRIZIONE: Gestione Entry Form, Calcolo Prezzi e Mock Stripe
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. RIFERIMENTI DOM (Allineati al nuovo HTML) ---
    const entryForm = document.getElementById('entryForm');
    const paymentModal = document.getElementById('paymentModal');
    const paymentForm = document.getElementById('paymentForm');
    const closeModalBtn = document.querySelector('.close-modal');

    // Input per i calcoli
    const radioPackages = document.querySelectorAll('input[name="package"]');
    const extraNightsInput = document.getElementById('extraNights');

    // Elementi del Riepilogo (Summary Card)
    const summaryPkgName = document.getElementById('summary-pkg-name');
    const summaryPkgPrice = document.getElementById('summary-pkg-price');
    const summaryNightCount = document.getElementById('summary-night-count');
    const summaryNightTotal = document.getElementById('summary-night-total');
    const summaryTotal = document.getElementById('summary-total');
    const modalTotal = document.getElementById('modalTotal'); // Totale nel modale

    // Variabili di Stato
    let currentBasePrice = 160; // Default Silver
    let currentPkgName = "Silver";
    const NIGHT_PRICE = 70;
    let currentGrandTotal = 0;

    // --- 2. FUNZIONE CALCOLO TOTALE ---
    function calculateTotal() {
        // A. Trova il pacchetto selezionato
        const selectedRadio = document.querySelector('input[name="package"]:checked');
        if (selectedRadio) {
            currentBasePrice = parseInt(selectedRadio.dataset.price); // Usa data-price
            currentPkgName = selectedRadio.value; // Usa value (Basic, Silver, etc.)
        }

        // B. Calcola notti extra
        const nights = parseInt(extraNightsInput.value) || 0;
        const nightsCost = nights * NIGHT_PRICE;

        // C. Calcola Totale Finale
        currentGrandTotal = currentBasePrice + nightsCost;

        // D. Aggiorna l'interfaccia (UI)
        if(summaryPkgName) summaryPkgName.innerText = currentPkgName.toUpperCase() + " Package";
        if(summaryPkgPrice) summaryPkgPrice.innerText = "€ " + currentBasePrice;
        
        if(summaryNightCount) summaryNightCount.innerText = nights;
        if(summaryNightTotal) summaryNightTotal.innerText = "€ " + nightsCost;

        if(summaryTotal) summaryTotal.innerText = "€ " + currentGrandTotal;
        if(modalTotal) modalTotal.innerText = "€ " + currentGrandTotal;
    }

    // --- 3. EVENT LISTENERS PER I CALCOLI ---
    // Ricalcola ogni volta che cambi pacchetto o numero notti
    radioPackages.forEach(radio => radio.addEventListener('change', calculateTotal));
    if(extraNightsInput) extraNightsInput.addEventListener('input', calculateTotal);

    // Esegui calcolo iniziale (per i valori di default)
    calculateTotal();


    // --- 4. STEP 1: APERTURA MODALE (Submit del form principale) ---
    if (entryForm) {
        entryForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Blocca il refresh della pagina
            
            // Se siamo qui, il browser ha già validato i campi 'required' (nomi, email, ecc.)
            // Possiamo aprire il modale di pagamento
            if(paymentModal) paymentModal.style.display = 'flex';
        });
    }


    // --- 5. STEP 2: GESTIONE PAGAMENTO E INVIO DATI (Submit del modale) ---
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // UI: Mostra caricamento sul pulsante
            const payBtn = paymentForm.querySelector('button');
            const originalText = payBtn.innerText;
            payBtn.disabled = true;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                // A. Recupera Sessione Utente da Supabase
                // (Se l'utente non è loggato, useremo l'email inserita nel form)
                const { data: { session } } = await window.supabase.auth.getSession();
                const userId = session ? session.user.id : null;
                const formEmail = document.getElementById('email').value;
                const userEmail = session ? session.user.email : formEmail;

                // B. Simulazione Stripe (Attesa di 2 secondi)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // C. Preparazione Dati per il Database
                // Uniamo Nome e Cognome per il campo 'full_name' della tabella
                const manName = document.getElementById('manName').value;
                const manSurname = document.getElementById('manSurname').value;
                const femaleName = document.getElementById('femaleName').value;
                const femaleSurname = document.getElementById('femaleSurname').value;
                
                const fullNameString = `${manName} ${manSurname} & ${femaleName} ${femaleSurname}`;
                const ageGroup = document.getElementById('ageGroup').value;

                // D. Inserimento in Supabase (Tabella 'registrations')
                const { error } = await window.supabase
                    .from('registrations')
                    .insert({
                        user_id: userId,          // Può essere null se ospite
                        user_email: userEmail,
                        full_name: fullNameString, // Esempio: "Mario Rossi & Lucia Bianchi"
                        role: ageGroup,            // Salviamo l'Age Group nella colonna role (o crea colonna dedicata)
                        package: currentPkgName,
                        total_amount: currentGrandTotal,
                        payment_status: 'paid_simulated',
                        payment_method: 'stripe_mock'
                    });

                if (error) throw error;

                // E. Successo!
                paymentModal.style.display = 'none';
                
                // Usa il custom alert se esiste, altrimenti alert standard
                if(window.showCustomAlert) {
                    await window.showCustomAlert("Payment Successful!", "See you in Tuscany!");
                } else {
                    alert("Payment Successful! Registration Completed.");
                }

                // Redirect alla home o pagina profilo
                window.location.href = 'index.html';

            } catch (err) {
                console.error("Errore Pagamento:", err);
                alert("Payment Error: " + err.message);
                
                // Ripristina pulsante
                payBtn.disabled = false;
                payBtn.innerText = originalText;
            }
        });
    }

    // --- 6. CHIUSURA MODALE ---
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            paymentModal.style.display = 'none';
        });
    }
    
    // Chiudi se clicchi fuori dal box bianco
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            paymentModal.style.display = 'none';
        }
    });

});