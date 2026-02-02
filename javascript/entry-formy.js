// ============================================================
// FILE: js/entry_form.js
// DESCRIZIONE: Entry Form + Stripe Checkout (Gestione Pending vs Paid)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. CONTROLLO RITORNO DA STRIPE (SUCCESS) ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('session_id')) {
        // Pulisci l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Aggiorniamo subito lo stato a PAID nel DB (per sicurezza visiva immediata)
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session) {
             await window.supabase
            .from('registrations')
            .update({ payment_status: 'paid' })
            .eq('user_id', session.user.id);
        }

        setTimeout(() => {
            showSuccess("Payment Successful!", "Your registration is confirmed. Welcome to Tuscany Camp!");
        }, 500);
    }

    // --- RIFERIMENTI DOM ---
    const entryForm = document.getElementById('entryForm');
    const paymentModal = document.getElementById('paymentModal');
    const paymentForm = document.getElementById('paymentForm');
    const closeModalBtn = document.querySelector('.close-modal');
    const mainBtn = document.getElementById('btnProceed');
    const successModal = document.getElementById('successModal');
    const closeSuccessBtn = document.getElementById('btn-close-success');

    // Input & Riepilogo
    const radioPackages = document.querySelectorAll('input[name="package"]');
    const extraNightsInput = document.getElementById('extraNights');
    const summaryPkgName = document.getElementById('summary-pkg-name');
    const summaryPkgPrice = document.getElementById('summary-pkg-price');
    const summaryNightCount = document.getElementById('summary-night-count');
    const summaryNightTotal = document.getElementById('summary-night-total');
    const summaryTotal = document.getElementById('summary-total');
    const modalTotal = document.getElementById('modalTotal');
    const modalPkgName = document.getElementById('modalPkgName');

    // Stato
    let currentBasePrice = 160; 
    let currentPkgName = "Silver";
    const NIGHT_PRICE = 70;
    let currentGrandTotal = 0;
    
    // STATI LOGICI
    let existingRecordId = null; // Se esiste un record (paid o pending)
    let isPaid = false;          // Se è effettivamente pagato

    // --- CHECK UTENTE ---
    async function checkExistingRegistration() {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) return; 
        
        const currentUser = session.user;
        const { data: reg } = await window.supabase
            .from('registrations')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (reg) {
            loadUserData(reg);
        }
    }

    // --- CARICAMENTO DATI (PAID vs PENDING) ---
    function loadUserData(data) {
        existingRecordId = data.id;
        isPaid = (data.payment_status === 'paid'); // VERIFICA FONDAMENTALE

        console.log(`Utente trovato. ID: ${data.id}, Stato: ${data.payment_status}`);

        // 1. Popola i campi (sempre, sia paid che pending)
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
        
        // Telefono
        const savedPhone = data.phone || "";
        const prefixSelect = document.getElementById('phonePrefix');
        const phoneInput = document.getElementById('phone');
        if (prefixSelect && phoneInput) {
            let found = false;
            for (let i = 0; i < prefixSelect.options.length; i++) {
                const p = prefixSelect.options[i].value;
                if (p && savedPhone.startsWith(p)) {
                    prefixSelect.value = p;
                    phoneInput.value = savedPhone.replace(p, '').trim(); found = true; break;
                }
            }
            if (!found) { prefixSelect.value = ""; phoneInput.value = savedPhone; }
        }

        // 2. Gestione Pacchetto e Notti
        const savedPkg = data.package;
        const targetRadio = document.querySelector(`input[name="package"][value="${savedPkg}"]`);
        if (targetRadio) targetRadio.checked = true;
        setVal('extraNights', data.extra_nights);

        // --- BIVIO: PAGATO vs NON PAGATO ---
        
        if (isPaid) {
            // SCENARIO A: TUTTO PAGATO (Blocca tutto, verde)
            applyPaidVisuals();
            
            // Blocca input prezzi
            radioPackages.forEach(r => { r.disabled = true; r.parentElement.style.opacity = "0.6"; r.parentElement.style.cursor = "not-allowed"; });
            if(extraNightsInput) { extraNightsInput.disabled = true; extraNightsInput.style.opacity = "0.6"; extraNightsInput.style.cursor = "not-allowed"; }
        } else {
            // SCENARIO B: PENDING (Lascia modificare i prezzi per riprovare il pagamento)
            // Non blocchiamo i radio buttons o le notti, perché magari vuole cambiare pacchetto prima di riprovare a pagare.
            if(mainBtn) {
                mainBtn.innerText = "COMPLETE PAYMENT"; // Invita a finire
                mainBtn.classList.remove('btn-success'); // Assicuriamoci non sia verde
            }
        }

        calculateTotal();
    }   

    function applyPaidVisuals() {
        const summaryCard = document.querySelector('.summary-card');
        if(summaryCard && !summaryCard.classList.contains('is-paid')) {
            summaryCard.classList.add('is-paid'); 
            const totalLabel = document.querySelector('.line.total span:first-child');
            if(totalLabel) totalLabel.innerText = "ALREADY PAID";
            
            const summaryLines = document.querySelector('.summary-lines');
            if(summaryLines && !document.querySelector('.paid-stamp')) {
                const stamp = document.createElement('div');
                stamp.className = 'paid-stamp';
                stamp.innerHTML = '<i class="fas fa-check-circle"></i> PAYMENT COMPLETE';
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
    }

    function setVal(id, val) {
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        if (el && val !== null && val !== undefined) el.value = val;
    }

    // --- CALCOLI ---
    function calculateTotal() {
        const selectedRadio = document.querySelector('input[name="package"]:checked');
        if (selectedRadio) {
            currentBasePrice = parseInt(selectedRadio.dataset.price) || parseFloat(selectedRadio.value); 
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

    // --- GESTIONE BOTTONE PRINCIPALE ---
    if (entryForm) {
        entryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!entryForm.checkValidity()) { entryForm.reportValidity(); return; }

            // LOGICA INTELLIGENTE:
            if (isPaid) {
                // Caso 1: Già pagato -> Aggiorna solo info testuali
                await updateOnlyInfo();
            } else {
                // Caso 2: Nuovo O Pending -> Apri modale pagamento
                if(paymentModal) paymentModal.style.display = 'flex';
            }
        });
    }

    // --- UPDATE SOLO INFO (Se già pagato) ---
    async function updateOnlyInfo() {
        const btn = mainBtn;
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Updating...";
        try {
            const updates = {
                man_name: getValue('manName'), man_surname: getValue('manSurname'),
                woman_name: getValue('femaleName'), woman_surname: getValue('femaleSurname'),
                country: getValue('country'), teacher: getValue('teacherName'),
                age_group: getValue('ageGroup'), phone: getValue('phone'),
                arrival_date: getValue('arrivalDate'), arrival_time: getValue('arrivalTime'),
                departure_date: getValue('departureDate'), departure_time: getValue('departureTime')
            };
            const { error } = await window.supabase.from('registrations').update(updates).eq('id', existingRecordId);
            if (error) throw error;
            showSuccess("Success!", "Your information has been updated successfully.");
        } catch (err) { alert("Error: " + err.message); } 
        finally { btn.disabled = false; btn.innerText = originalText; }
    }

    function getValue(id) {
        if (id === 'phone') {
            const prefix = document.getElementById('phonePrefix').value;
            const number = document.getElementById('phone').value;
            return prefix ? `${prefix} ${number}` : number;
        }
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        return el ? el.value : null;
    }

    // --- PROCEDURA PAGAMENTO E REDIRECT (Nuovo o Pending) ---
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payBtn = paymentForm.querySelector('button');
            const originalText = payBtn.innerText;
            payBtn.disabled = true;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing Checkout...';

            try {
                // 1. Raccogli i dati
                const { data: { session } } = await window.supabase.auth.getSession();
                const userId = session ? session.user.id : null;
                const fullNameString = `${getValue('manName')} ${getValue('manSurname')} & ${getValue('femaleName')} ${getValue('femaleSurname')}`;
                
                const supabaseData = {
                    user_id: userId,
                    user_email: getValue('email'),
                    full_name: fullNameString, 
                    man_name: getValue('manName'), man_surname: getValue('manSurname'),
                    woman_name: getValue('femaleName'), woman_surname: getValue('femaleSurname'),
                    country: getValue('country'), teacher: getValue('teacherName'),
                    age_group: getValue('ageGroup'), phone: getValue('phone'),
                    package: currentPkgName,
                    extra_nights: parseInt(document.getElementById('extraNights').value) || 0,
                    arrival_date: getValue('arrivalDate'), arrival_time: getValue('arrivalTime'),
                    departure_date: getValue('departureDate'), departure_time: getValue('departureTime'),
                    total_amount: currentGrandTotal,
                    payment_status: 'pending', // Rimane pending finché non torna da Stripe
                    created_at: new Date().toISOString()
                };

                // 2. Insert o Update?
                if (existingRecordId) {
                    // Se era "pending", AGGIORNIAMO il record esistente
                    const { error } = await window.supabase.from('registrations').update(supabaseData).eq('id', existingRecordId);
                    if (error) throw error;
                } else {
                    // Se è nuovo, INSERIAMO
                    const { error } = await window.supabase.from('registrations').insert([supabaseData]);
                    if (error) throw error;
                }

                await sendConfirmationEmail(supabaseData);

                // 3. Chiamata Backend per URL
                const currentUrl = window.location.href.split('?')[0]; 
                const { data: responseData, error: funcError } = await window.supabase.functions.invoke('stripe-charge', {
                    body: {
                        amount: currentGrandTotal * 100, 
                        email: getValue('email'),
                        description: `Tuscany Camp - ${currentPkgName}`,
                        returnUrl: currentUrl
                    }
                });

                if (funcError) throw new Error("Server Error: " + funcError.message);
                if (responseData.error) throw new Error("Stripe Error: " + responseData.error);
                
                window.location.href = responseData.url;

            } catch (err) {
                console.error("Error:", err);
                alert('Errore: ' + err.message);
                payBtn.disabled = false;
                payBtn.innerText = originalText;
            }
        });
    }

    async function sendConfirmationEmail(data) {
        const SERVICE_ID = "service_fik9j1g"; const TEMPLATE_ID = "template_2je1tdk"; 
        const templateParams = {
            to_email: data.user_email, man_name: data.man_name, man_surname: data.man_surname,
            woman_name: data.woman_name, woman_surname: data.woman_surname, country: data.country,
            teacher: data.teacher, age_group: data.age_group, phone: data.phone, email: data.user_email,
            package_name: data.package, extra_nights: data.extra_nights,
            arrival_date: data.arrival_date || "N/A", arrival_time: data.arrival_time || "--:--",
            departure_date: data.departure_date || "N/A", departure_time: data.departure_time || "--:--"
        };
        try { if (typeof emailjs !== 'undefined') await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams); } 
        catch (e) { console.error("Email Error", e); }
    }

    function showSuccess(title, msg, callback = null) {
        if (!successModal) { alert(msg); if(callback) callback(); return; }
        const h3 = successModal.querySelector('h3');
        const p = successModal.querySelector('p');
        if(h3) h3.innerText = title;
        if(p) p.innerText = msg;
        onSuccessClose = callback;
        successModal.style.display = 'flex';
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { paymentModal.style.display = 'none'; });
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', () => { 
        successModal.style.display = 'none';
        if (onSuccessClose) { onSuccessClose(); onSuccessClose = null; }
    });
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) paymentModal.style.display = 'none';
    });
});