// ============================================================
// FILE: js/entry_form.js
// DESCRIZIONE: Gestione Entry Form (Create & Edit Mode), Calcoli, Supabase
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. RIFERIMENTI DOM ---
    const entryForm = document.getElementById('entryForm');
    const paymentModal = document.getElementById('paymentModal');
    const paymentForm = document.getElementById('paymentForm');
    const closeModalBtn = document.querySelector('.close-modal');
    const mainBtn = document.getElementById('btnProceed');

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

    // Variabili di Stato
    let currentBasePrice = 160; 
    let currentPkgName = "Silver";
    const NIGHT_PRICE = 70;
    let currentGrandTotal = 0;
    
    // STATO: MODALITÀ MODIFICA
    let isEditMode = false;
    let existingRecordId = null;
    let currentUser = null;
    
    // Callback modale successo
    let onSuccessClose = null;
    const successModal = document.getElementById('successModal');
    const closeSuccessBtn = document.getElementById('btn-close-success');

    // --- 2. CHECK INIZIALE: L'UTENTE HA GIÀ COMPILATO? ---
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

    // --- 3. ATTIVA MODALITÀ MODIFICA (POPOLA, BLOCCA E SPOSTA BOTTONE) ---
 // --- 3. ATTIVA MODALITÀ MODIFICA (POPOLA, BLOCCA E SPOSTA BOTTONE) ---
    function enableEditMode(data) {
        console.log("Edit Mode Active. Data:", data);
        isEditMode = true;
        existingRecordId = data.id;

        // A. MODIFICHE VISIVE AL RIEPILOGO (Verde + Timbro)
        const summaryCard = document.querySelector('.summary-card');
        const totalLabel = document.querySelector('.line.total span:first-child');
        const summaryLines = document.querySelector('.summary-lines');

        if(summaryCard && !summaryCard.classList.contains('is-paid')) {
            summaryCard.classList.add('is-paid'); // Bordo verde
            
            // 1. Cambia label Totale
            if(totalLabel) totalLabel.innerText = "ALREADY PAID";

            // 2. Aggiungi Timbro
            const stamp = document.createElement('div');
            stamp.className = 'paid-stamp';
            stamp.innerHTML = '<i class="fas fa-check-circle"></i> PAYMENT COMPLETE';
            if(summaryLines) summaryLines.insertBefore(stamp, summaryLines.firstChild);

            // 3. SPOSTA IL BOTTONE FUORI (Subito sotto la card)
            if (summaryCard.contains(mainBtn)) {
                // Lo inserisce immediatamente DOPO la fine del div .summary-card
                summaryCard.insertAdjacentElement('afterend', mainBtn);
                
                // Applica stili specifici al bottone "volante"
                mainBtn.classList.add('update-btn-style');
                mainBtn.innerText = "UPDATE INFORMATION";
                
                // Stili inline per sicurezza
                mainBtn.style.backgroundColor = "#2ecc71"; // Verde
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
        setVal('phone', data.phone);
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

    // --- 4. FUNZIONE CALCOLO TOTALE ---
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
    }

    radioPackages.forEach(radio => radio.addEventListener('change', calculateTotal));
    if(extraNightsInput) extraNightsInput.addEventListener('input', calculateTotal);
    
    calculateTotal();
    checkExistingRegistration();


    // --- 5. GESTIONE SUBMIT FORM ---
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

    // --- 6. FUNZIONE AGGIORNA DATI (EDIT) ---
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
                phone: getValue('phone'),
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

// Helper per leggere valori (MODIFICATO PER IL TELEFONO)
    function getValue(id) {
        // 1. CASO SPECIALE: TELEFONO
        // Se stiamo chiedendo il telefono, uniamo Prefisso + Numero
        if (id === 'phone') {
            const prefix = document.getElementById('phonePrefix').value;
            const number = document.getElementById('phone').value;
            // Se c'è un prefisso, lo uniamo. Se l'utente ha scelto "Other" (vuoto), salviamo solo il numero.
            return prefix ? `${prefix} ${number}` : number;
        }

        // 2. CASO NORMALE
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        return el ? el.value : null;
    }


    // --- 7. FUNZIONE PAGAMENTO E NUOVA ISCRIZIONE ---
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payBtn = paymentForm.querySelector('button');
            const originalText = payBtn.innerText;
            payBtn.disabled = true;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                const userId = session ? session.user.id : null;
                
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
                    phone: getValue('phone'),
                    package: currentPkgName,
                    extra_nights: parseInt(document.getElementById('extraNights').value) || 0,
                    arrival_date: getValue('arrivalDate'),
                    arrival_time: getValue('arrivalTime'),
                    departure_date: getValue('departureDate'),
                    departure_time: getValue('departureTime'),
                    total_amount: currentGrandTotal,
                    payment_status: 'paid',
                    payment_method: 'stripe_mock',
                    created_at: new Date().toISOString()
                };

                await new Promise(r => setTimeout(r, 1500));

                const { error } = await window.supabase.from('registrations').insert([supabaseData]);
                if (error) throw error;

                await sendConfirmationEmail(supabaseData);

                paymentModal.style.display = 'none';
                
                showSuccess("Payment Successful!", "Registration Completed. Check your email.", () => {
                    window.location.reload(); 
                });

            } catch (err) {
                console.error("Error:", err);
                alert('Error: ' + err.message);
                payBtn.disabled = false;
                payBtn.innerText = originalText;
            }
        });
    }

    // --- 8. EMAIL HELPER ---
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
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
            }
        } catch (e) { console.error("Email Error", e); }
    }

    // --- 9. HELPER MODALE SUCCESSO ---
    function showSuccess(title, msg, callback = null) {
        if (!successModal) { alert(msg); if(callback) callback(); return; }
        
        const h3 = successModal.querySelector('h3');
        const p = successModal.querySelector('p');
        if(h3) h3.innerText = title;
        if(p) p.innerText = msg;

        onSuccessClose = callback;
        successModal.style.display = 'flex';
    }

    // --- 10. CHIUSURA MODALI ---
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => { paymentModal.style.display = 'none'; });
    }
    
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', () => { 
            successModal.style.display = 'none';
            if (onSuccessClose) {
                onSuccessClose();
                onSuccessClose = null;
            }
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) paymentModal.style.display = 'none';
        // Success modal si chiude solo col bottone per sicurezza
    });
    

});