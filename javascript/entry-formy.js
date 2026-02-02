// ============================================================
// FILE: js/entry_form.js
// DESCRIZIONE: Gestione Entry Form, Integrazione Stripe Elements, Prefissi Telefoni
// ============================================================

// 1. INIZIALIZZAZIONE STRIPE (Chiave Pubblica)
const stripe = Stripe('pk_test_51SwLbDAZHekT7i4Kt6n5yXtOS3TBl07kt02a3LaE2x3nqwR3AjpN2mD7H6twZ8ZcrPZvIHDwSVCxB1usn33wcFIv008mW8mUpT');

document.addEventListener('DOMContentLoaded', async () => {

    // --- 2. SETUP STRIPE ELEMENTS (Visualizzazione Carta) ---
    // Questo crea il campo di input sicuro per la carta
    const elements = stripe.elements();
    
    const style = {
        base: {
            color: "#ffffff",
            fontFamily: '"Outfit", sans-serif',
            fontSmoothing: "antialiased",
            fontSize: "16px",
            "::placeholder": {
                color: "#aab7c4"
            }
        },
        invalid: {
            color: "#ff4d4d",
            iconColor: "#ff4d4d"
        }
    };

    // Crea l'elemento carta
    const card = elements.create("card", { style: style });
    
    // Montalo nel DIV #card-element presente nel tuo nuovo HTML
    // Nota: Se il modale è nascosto, Stripe si carica comunque ma potrebbe non essere a fuoco.
    const cardElementDiv = document.getElementById('card-element');
    if (cardElementDiv) {
        card.mount("#card-element");
        
        // Gestione errori in tempo reale (validazione numero, scadenza, etc.)
        card.on('change', ({error}) => {
            const displayError = document.getElementById('card-errors');
            if (displayError) {
                if (error) {
                    displayError.textContent = error.message;
                } else {
                    displayError.textContent = '';
                }
            }
        });
    }


    // --- 3. RIFERIMENTI DOM ---
    const entryForm = document.getElementById('entryForm');
    const paymentModal = document.getElementById('paymentModal');
    const paymentForm = document.getElementById('paymentForm');
    const closeModalBtn = document.querySelector('.close-modal');
    const mainBtn = document.getElementById('btnProceed');

    // Riferimenti Modale Successo
    const successModal = document.getElementById('successModal');
    const closeSuccessBtn = document.getElementById('btn-close-success');

    // Input per i calcoli
    const radioPackages = document.querySelectorAll('input[name="package"]');
    const extraNightsInput = document.getElementById('extraNights');

    // Elementi del Riepilogo
    const summaryPkgName = document.getElementById('summary-pkg-name');
    const summaryPkgPrice = document.getElementById('summary-pkg-price');
    const summaryNightCount = document.getElementById('summary-night-count');
    const summaryNightTotal = document.getElementById('summary-night-total');
    const summaryTotal = document.getElementById('summary-total');
    const modalTotal = document.getElementById('modalTotal');
    const modalPkgName = document.getElementById('modalPkgName');

    // Variabili di Stato
    let currentBasePrice = 160; 
    let currentPkgName = "Silver";
    const NIGHT_PRICE = 70;
    let currentGrandTotal = 0;
    
    // STATO: MODALITÀ MODIFICA
    let isEditMode = false;
    let existingRecordId = null;
    let currentUser = null;
    
    let onSuccessClose = null;

    // --- 4. CHECK INIZIALE: L'UTENTE HA GIÀ COMPILATO? ---
    async function checkExistingRegistration() {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) return; 

        currentUser = session.user;

        const { data: reg, error } = await window.supabase
            .from('registrations')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (reg) {
            enableEditMode(reg);
        }
    }

    // --- 5. ATTIVA MODALITÀ MODIFICA ---
    function enableEditMode(data) {
        console.log("Edit Mode Active. Data:", data);
        isEditMode = true;
        existingRecordId = data.id;

        // A. UI AGGIORNAMENTI (Verde + Timbro)
        const summaryCard = document.querySelector('.summary-card');
        const totalLabel = document.querySelector('.line.total span:first-child');
        const summaryLines = document.querySelector('.summary-lines');

        if(summaryCard && !summaryCard.classList.contains('is-paid')) {
            summaryCard.classList.add('is-paid'); 
            if(totalLabel) totalLabel.innerText = "ALREADY PAID";

            const stamp = document.createElement('div');
            stamp.className = 'paid-stamp';
            stamp.innerHTML = '<i class="fas fa-check-circle"></i> PAYMENT COMPLETE';
            if(summaryLines && !document.querySelector('.paid-stamp')) {
                 summaryLines.insertBefore(stamp, summaryLines.firstChild);
            }

            if (summaryCard.contains(mainBtn)) {
                summaryCard.insertAdjacentElement('afterend', mainBtn);
                mainBtn.classList.add('update-btn-style');
                mainBtn.innerText = "UPDATE INFORMATION";
                mainBtn.style.backgroundColor = "#2ecc71";
                mainBtn.style.borderColor = "#2ecc71";
                mainBtn.style.color = "#fff";
                mainBtn.style.fontWeight = "bold";
            }
        }

        // B. POPOLA I CAMPI
        setVal('manName', data.man_name);
        setVal('manSurname', data.man_surname);
        setVal('femaleName', data.woman_name);
        setVal('femaleSurname', data.woman_surname);
        setVal('country', data.country);
        setVal('teacherName', data.teacher);
        setVal('ageGroup', data.age_group);
        setVal('email', data.user_email);
        
        setVal('arrivalDate', data.arrival_date);
        setVal('arrivalTime', data.arrival_time);
        setVal('departureDate', data.departure_date);
        setVal('departureTime', data.departure_time);
        
        // --- LOGICA INTELLIGENTE PER IL TELEFONO (Prefisso + Numero) ---
        const savedPhone = data.phone || "";
        const prefixSelect = document.getElementById('phonePrefix');
        const phoneInput = document.getElementById('phone');

        if (prefixSelect && phoneInput) {
            let found = false;
            // 1. Controlla se il numero salvato inizia con uno dei prefissi della lista
            for (let i = 0; i < prefixSelect.options.length; i++) {
                const p = prefixSelect.options[i].value;
                // Se il prefisso non è vuoto e il numero inizia con quel prefisso
                if (p && savedPhone.startsWith(p)) {
                    prefixSelect.value = p; // Seleziona il prefisso nel menu
                    // Pulisce il numero togliendo il prefisso e gli spazi
                    phoneInput.value = savedPhone.replace(p, '').trim(); 
                    found = true;
                    break;
                }
            }
            // 2. Se non abbiamo trovato un prefisso noto (o era "Other")
            if (!found) {
                prefixSelect.value = ""; // Seleziona "Other"
                phoneInput.value = savedPhone; // Mette tutto il numero nella casella
            }
        }

        // C. BLOCCA CAMPI PREZZO
        const savedPkg = data.package;
        const targetRadio = document.querySelector(`input[name="package"][value="${savedPkg}"]`);
        if (targetRadio) targetRadio.checked = true;

        radioPackages.forEach(r => {
            r.disabled = true;
            r.parentElement.style.opacity = "0.6";
            r.parentElement.style.cursor = "not-allowed";
        });

        setVal('extraNights', data.extra_nights);
        if(extraNightsInput) {
            extraNightsInput.disabled = true;
            extraNightsInput.style.opacity = "0.6"; 
            extraNightsInput.style.cursor = "not-allowed";
            extraNightsInput.title = "Cannot change extra nights after payment.";
        }

        calculateTotal();
    }   

    function setVal(id, val) {
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        if (el && val !== null && val !== undefined) el.value = val;
    }

    // --- 6. FUNZIONE CALCOLO TOTALE ---
    function calculateTotal() {
        const selectedRadio = document.querySelector('input[name="package"]:checked');
        if (selectedRadio) {
            currentBasePrice = parseInt(selectedRadio.dataset.price) || parseFloat(selectedRadio.value); 
            // CORRETTO: Usa value se data-name non c'è
            currentPkgName = selectedRadio.value || selectedRadio.getAttribute('data-name'); 
        }

        const nights = parseInt(extraNightsInput.value) || 0;
        const nightsCost = nights * NIGHT_PRICE;
        currentGrandTotal = currentBasePrice + nightsCost;

        if(summaryPkgName) summaryPkgName.innerText = currentPkgName.toUpperCase();
        if(summaryPkgPrice) summaryPkgPrice.innerText = "€ " + currentBasePrice;
        if(summaryNightCount) summaryNightCount.innerText = nights;
        if(summaryNightTotal) summaryNightTotal.innerText = "€ " + nightsCost;
        if(summaryTotal) summaryTotal.innerText = "€ " + currentGrandTotal;
        if(modalTotal) modalTotal.innerText = "€ " + currentGrandTotal;
        if(modalPkgName) modalPkgName.innerText = currentPkgName.toUpperCase();
    }

    radioPackages.forEach(radio => radio.addEventListener('change', calculateTotal));
    if(extraNightsInput) extraNightsInput.addEventListener('input', calculateTotal);
    
    calculateTotal();
    checkExistingRegistration();


    // --- 7. GESTIONE SUBMIT FORM ---
    if (entryForm) {
        entryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!entryForm.checkValidity()) {
                entryForm.reportValidity();
                return;
            }

            if (isEditMode) {
                await updateExistingData();
            } else {
                if(paymentModal) paymentModal.style.display = 'flex';
            }
        });
    }

    // --- 8. AGGIORNAMENTO DATI (EDIT MODE) ---
    async function updateExistingData() {
        const btn = mainBtn;
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Updating...";

        try {
            const updates = {
                man_name: getValue('manName'),
                man_surname: getValue('manSurname'),
                woman_name: getValue('femaleName'),
                woman_surname: getValue('femaleSurname'),
                country: getValue('country'),
                teacher: getValue('teacherName'),
                age_group: getValue('ageGroup'),
                phone: getValue('phone'), // Usa la logica getValue col prefisso
                arrival_date: getValue('arrivalDate'),
                arrival_time: getValue('arrivalTime'),
                departure_date: getValue('departureDate'),
                departure_time: getValue('departureTime')
            };

            const { error } = await window.supabase
                .from('registrations')
                .update(updates)
                .eq('id', existingRecordId);

            if (error) throw error;
            showSuccess("Success!", "Your information has been updated successfully.");
            
        } catch (err) {
            console.error("Update Error:", err);
            alert("Error updating info: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }

    // Helper per leggere valori (Con logica Prefisso Telefono)
    function getValue(id) {
        // CASO SPECIALE: TELEFONO
        if (id === 'phone') {
            const prefix = document.getElementById('phonePrefix').value;
            const number = document.getElementById('phone').value;
            // Se c'è un prefisso, lo uniamo. Se l'utente ha scelto "Other" (vuoto), salviamo solo il numero.
            return prefix ? `${prefix} ${number}` : number;
        }

        // CASO NORMALE
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        return el ? el.value : null;
    }


    // --- 9. PAGAMENTO E CREAZIONE REGISTRAZIONE (CREATE MODE) ---
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payBtn = paymentForm.querySelector('button');
            const originalText = payBtn.innerText;
            payBtn.disabled = true;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                // A. Sessione Supabase
                const { data: { session } } = await window.supabase.auth.getSession();
                const userId = session ? session.user.id : null;
                
                // B. Preparazione Dati
                const manName = getValue('manName');
                const manSurname = getValue('manSurname');
                const womanName = getValue('femaleName');
                const womanSurname = getValue('femaleSurname');
                const fullNameString = `${manName} ${manSurname} & ${womanName} ${womanSurname}`;

                const supabaseData = {
                    user_id: userId,
                    user_email: getValue('email'),
                    full_name: fullNameString, 
                    man_name: manName,
                    man_surname: manSurname,
                    woman_name: womanName,
                    woman_surname: womanSurname,
                    country: getValue('country'),
                    teacher: getValue('teacherName'),
                    age_group: getValue('ageGroup'),
                    phone: getValue('phone'), // Prende prefisso + numero
                    package: currentPkgName,
                    extra_nights: parseInt(document.getElementById('extraNights').value) || 0,
                    arrival_date: getValue('arrivalDate'),
                    arrival_time: getValue('arrivalTime'),
                    departure_date: getValue('departureDate'),
                    departure_time: getValue('departureTime'),
                    total_amount: currentGrandTotal,
                    
                    payment_status: 'paid', // Simulazione (diventerà 'pending' con backend reale)
                    payment_method: 'stripe_mock', 
                    created_at: new Date().toISOString()
                };

                // C. Simulazione Attesa (Backend mock)
                // Qui in futuro useremo: const { token } = await stripe.createToken(card);
                await new Promise(r => setTimeout(r, 1500));

                // D. Salva su Supabase
                const { data: newReg, error } = await window.supabase
                    .from('registrations')
                    .insert([supabaseData])
                    .select()
                    .single();

                if (error) throw error;

                // E. Invio Email
                await sendConfirmationEmail(supabaseData);

                // F. Chiusura e Successo
                paymentModal.style.display = 'none';
                
                showSuccess("Payment Successful!", "Registration Completed. Check your email.", () => {
                    window.location.reload(); 
                });

            } catch (err) {
                console.error("Error:", err);
                alert('Errore: ' + err.message);
                payBtn.disabled = false;
                payBtn.innerText = originalText;
            }
        });
    }

    // --- 10. EMAIL HELPER ---
    async function sendConfirmationEmail(data) {
        const SERVICE_ID = "service_fik9j1g"; 
        const TEMPLATE_ID = "template_2je1tdk"; 
        const templateParams = {
            to_email: data.user_email,
            man_name: data.man_name,
            man_surname: data.man_surname,
            woman_name: data.woman_name,
            woman_surname: data.woman_surname,
            country: data.country,
            teacher: data.teacher,
            age_group: data.age_group,
            phone: data.phone,
            email: data.user_email,
            package_name: data.package,
            extra_nights: data.extra_nights,
            arrival_date: data.arrival_date || "N/A",
            arrival_time: data.arrival_time || "--:--",
            departure_date: data.departure_date || "N/A",
            departure_time: data.departure_time || "--:--"
        };
        try {
            if (typeof emailjs !== 'undefined') await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
        } catch (e) { console.error("Email Error", e); }
    }

    // --- 11. HELPER MODALE SUCCESSO ---
    function showSuccess(title, msg, callback = null) {
        if (!successModal) { alert(msg); if(callback) callback(); return; }
        const h3 = successModal.querySelector('h3');
        const p = successModal.querySelector('p');
        if(h3) h3.innerText = title;
        if(p) p.innerText = msg;
        onSuccessClose = callback;
        successModal.style.display = 'flex';
    }

    // --- 12. CHIUSURA MODALI ---
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { paymentModal.style.display = 'none'; });
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', () => { 
        successModal.style.display = 'none';
        if (onSuccessClose) { onSuccessClose(); onSuccessClose = null; }
    });
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) paymentModal.style.display = 'none';
    });

});