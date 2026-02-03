// ============================================================
// FILE: js/entry_form.js
// DESCRIZIONE: Wizard 2 Steps + Logic
// ============================================================

// --- FUNZIONE GLOBALE PER LO STEP 1 ---
// Questa funzione viene chiamata dai bottoni grandi nell'HTML
window.selectRegistrationStep = function(type) {
    const step1 = document.getElementById('step-1-selection');
    const entryForm = document.getElementById('entryForm');
    const hiddenTypeInput = document.getElementById('registrationType');

    // 1. Salva il tipo
    if (hiddenTypeInput) hiddenTypeInput.value = type;

    // 2. Nascondi Step 1 e Mostra Step 2
    if (step1) step1.style.display = 'none';
    if (entryForm) entryForm.style.display = 'block'; // Appare il form

    // 3. Triggera la logica di visibilità campi interna
    // (Dobbiamo dispatchare un evento custom o chiamare una funzione esposta)
    document.dispatchEvent(new CustomEvent('registrationTypeSelected', { detail: type }));
};


document.addEventListener('DOMContentLoaded', async () => {
    

    // --- 0. ASCOLTATORE EVENTO CUSTOM (Per collegare la funzione globale al modulo locale) ---
    document.addEventListener('registrationTypeSelected', (e) => {
        const type = e.detail;
        updateFormVisibility(type);
        calculateTotal();
        
        // Scroll leggero verso il form
        document.getElementById('entryForm').scrollIntoView({ behavior: 'smooth' });
    });

    // --- 0.1 GESTIONE NOTTI EXTRA ---
    const nightButtons = document.querySelectorAll('.btn-night');
    const hiddenNightsInput = document.getElementById('extraNights');
    const hiddenTypeInput = document.getElementById('registrationType');

    if (nightButtons.length > 0) {
        nightButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                nightButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (hiddenNightsInput) hiddenNightsInput.value = btn.dataset.value;
                calculateTotal();
            });
        });
    }

    // Funzione Helper: Mostra/Nascondi e gestisce 'required'
    function updateFormVisibility(type) {
        const manSection = document.getElementById('man-fields');
        const womanSection = document.getElementById('woman-fields');
        const manInputs = manSection.querySelectorAll('input');
        const womanInputs = womanSection.querySelectorAll('input');

        // Reset
        manSection.classList.remove('hidden-section');
        womanSection.classList.remove('hidden-section');

        const setRequired = (inputs, isRequired) => {
            inputs.forEach(input => {
                if(isRequired) input.setAttribute('required', 'true');
                else {
                    input.removeAttribute('required');
                    input.value = ''; 
                }
            });
        };

        if (type === 'couple') {
            setRequired(manInputs, true);
            setRequired(womanInputs, true);
        } 
        else if (type === 'man') {
            womanSection.classList.add('hidden-section');
            setRequired(manInputs, true);
            setRequired(womanInputs, false); 
        } 
        else if (type === 'woman') {
            manSection.classList.add('hidden-section');
            setRequired(manInputs, false);
            setRequired(womanInputs, true);
        }
    }

    // --- 1. STRIPE RETURN ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('session_id')) {
        window.history.replaceState({}, document.title, window.location.pathname);
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session) await window.supabase.from('registrations').update({ payment_status: 'paid' }).eq('user_id', session.user.id);
        setTimeout(() => showSuccess("Payment Successful!", "Registration confirmed."), 500);
        
        // Se torna dal pagamento, mostra subito il form (salta step 1)
        document.getElementById('step-1-selection').style.display = 'none';
        document.getElementById('entryForm').style.display = 'block';
    }

    // --- RIFERIMENTI DOM ---
    const entryForm = document.getElementById('entryForm');
    const paymentModal = document.getElementById('paymentModal');
    const paymentForm = document.getElementById('paymentForm');
    const closeModalBtn = document.querySelector('.close-modal');
    const mainBtn = document.getElementById('btnProceed');
    const successModal = document.getElementById('successModal');
    const closeSuccessBtn = document.getElementById('btn-close-success');

    const radioPackages = document.querySelectorAll('input[name="package"]');
    const extraNightsInput = document.getElementById('extraNights');
    
    // Summary DOM
    const summaryPkgName = document.getElementById('summary-pkg-name');
    const summaryPkgPrice = document.getElementById('summary-pkg-price');
    const summaryNightCount = document.getElementById('summary-night-count');
    const summaryNightTotal = document.getElementById('summary-night-total');
    const summaryTotal = document.getElementById('summary-total');
    const modalTotal = document.getElementById('modalTotal');
    const modalPkgName = document.getElementById('modalPkgName');

    let currentBasePrice = 160; 
    let currentPkgName = "Silver";
    const NIGHT_PRICE = 70;
    let currentGrandTotal = 0;
    let existingRecordId = null; 
    let isPaid = false;          

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

        if (reg) loadUserData(reg);
    }

    // --- CARICAMENTO DATI (EDIT MODE) ---
function loadUserData(data) {
        // IMPORTANTE: Se l'utente ha già dati, SALTA lo Step 1 e mostra il form
        const step1 = document.getElementById('step-1-selection');
        const entryForm = document.getElementById('entryForm');
        
        if (step1) step1.style.display = 'none';
        if (entryForm) entryForm.style.display = 'block';

        existingRecordId = data.id;
        isPaid = (data.payment_status === 'paid'); 

        // 1. Determina il TIPO DI ISCRIZIONE dai dati
        let detectedType = 'couple';
        if (!data.woman_name && data.man_name) detectedType = 'man';
        else if (!data.man_name && data.woman_name) detectedType = 'woman';
        
        if(hiddenTypeInput) hiddenTypeInput.value = detectedType;
        updateFormVisibility(detectedType);
        
        // 2. Popola i campi
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
        
        const savedPhone = data.phone || "";
        const phoneInput = document.getElementById('phone');
        if(phoneInput) phoneInput.value = savedPhone;

        // 3. Pacchetto
        const savedPkg = data.package;
        const targetRadio = document.querySelector(`input[name="package"][value="${savedPkg}"]`);
        if (targetRadio) targetRadio.checked = true;

        // 4. Notti Extra
        const savedNights = data.extra_nights || 0;
        setVal('extraNights', savedNights);
        const nightBtns = document.querySelectorAll('.btn-night');
        nightBtns.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.value) == savedNights) btn.classList.add('active');
            
            // Se pagato, disabilita modifica notti
            if (isPaid) {
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
            }
        });

        // 5. GESTIONE STATO PAGAMENTO
        if (isPaid) {
            applyPaidVisuals();
            
            // NUOVO: Nascondi il riquadro "Change Registration Type" se ha già pagato
            const changeBox = document.getElementById('change-type-box');
            if(changeBox) changeBox.style.display = 'none';

        } else if(mainBtn) {
             mainBtn.innerText = "COMPLETE PAYMENT"; 
             mainBtn.classList.remove('btn-success');
        }

        calculateTotal();
    }  

    function applyPaidVisuals() {
        const summaryCard = document.querySelector('.summary-card');
        if(summaryCard && !summaryCard.classList.contains('is-paid')) {
            summaryCard.classList.add('is-paid'); 
            const totalLabel = document.querySelector('.line.total span:first-child');
            if(totalLabel) totalLabel.innerText = "ALREADY PAID";
            radioPackages.forEach(r => {
                r.disabled = true;
                r.parentElement.style.opacity = "0.5";
            });
            
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

    function calculateTotal() {
        const selectedRadio = document.querySelector('input[name="package"]:checked');
        if (selectedRadio) {
            currentBasePrice = parseInt(selectedRadio.dataset.price) || parseFloat(selectedRadio.value); 
            currentPkgName = selectedRadio.value || selectedRadio.getAttribute('data-name'); 
        }
        
        const nights = parseInt(extraNightsInput.value) || 0;
        const nightsCost = nights * NIGHT_PRICE;
        
        let subTotal = currentBasePrice + nightsCost;
        const currentType = hiddenTypeInput ? hiddenTypeInput.value : 'couple';
        let multiplier = 1;
        
        if (currentType === 'couple') multiplier = 2;

        currentGrandTotal = subTotal * multiplier;

        if(summaryPkgName) summaryPkgName.innerText = currentPkgName.toUpperCase() + (multiplier === 2 ? " (x2 Persons)" : "");
        if(summaryPkgPrice) summaryPkgPrice.innerText = "€ " + (currentBasePrice * multiplier);
        if(summaryNightCount) summaryNightCount.innerText = nights;
        if(summaryNightTotal) summaryNightTotal.innerText = "€ " + (nightsCost * multiplier);
        if(summaryTotal) summaryTotal.innerText = "€ " + currentGrandTotal;
        if(modalTotal) modalTotal.innerText = "€ " + currentGrandTotal;
        if(modalPkgName) modalPkgName.innerText = currentPkgName.toUpperCase() + (multiplier === 2 ? " (Couple)" : " (Single)");
    }

    radioPackages.forEach(radio => radio.addEventListener('change', calculateTotal));
    
    // Inizializza calcolo
    calculateTotal();
    // Controlla se utente ha già dati (e se sì, nasconde step 1)
    checkExistingRegistration();

    // --- SUBMIT ---
    if (entryForm) {
        entryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!entryForm.checkValidity()) { entryForm.reportValidity(); return; }
            if (isPaid) await updateOnlyInfo();
            else if(paymentModal) paymentModal.style.display = 'flex';
        });
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

    async function updateOnlyInfo() {
        const btn = mainBtn;
        const originalText = btn.innerText;
        btn.disabled = true; btn.innerText = "Updating...";
        try {
            const type = hiddenTypeInput.value;
            let manN = getValue('manName');
            let manS = getValue('manSurname');
            let womN = getValue('femaleName');
            let womS = getValue('femaleSurname');

            if (type === 'man') { womN = ''; womS = ''; }
            if (type === 'woman') { manN = ''; manS = ''; }

            const updates = {
                man_name: manN, man_surname: manS,
                woman_name: womN, woman_surname: womS,
                country: getValue('country'), teacher: getValue('teacherName'),
                age_group: getValue('ageGroup'), phone: getValue('phone'),
                arrival_date: getValue('arrivalDate'), arrival_time: getValue('arrivalTime'),
                departure_date: getValue('departureDate'), departure_time: getValue('departureTime')
            };
            const { error } = await window.supabase.from('registrations').update(updates).eq('id', existingRecordId);
            if (error) throw error;
            showSuccess("Success!", "Updated successfully.");
        } catch (err) { alert("Error: " + err.message); } 
        finally { btn.disabled = false; btn.innerText = originalText; }
    }

    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payBtn = paymentForm.querySelector('button');
            const originalText = payBtn.innerText;
            payBtn.disabled = true; payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                const userId = session ? session.user.id : null;
                
                const type = hiddenTypeInput.value;
                let manN = getValue('manName');
                let manS = getValue('manSurname');
                let womN = getValue('femaleName');
                let womS = getValue('femaleSurname');
                
                let fullNameString = "";
                if (type === 'couple') fullNameString = `${manN} ${manS} & ${womN} ${womS}`;
                else if (type === 'man') { fullNameString = `${manN} ${manS}`; womN=''; womS=''; }
                else if (type === 'woman') { fullNameString = `${womN} ${womS}`; manN=''; manS=''; }

                const supabaseData = {
                    user_id: userId,
                    user_email: getValue('email'),
                    full_name: fullNameString, 
                    man_name: manN, man_surname: manS,
                    woman_name: womN, woman_surname: womS,
                    country: getValue('country'), teacher: getValue('teacherName'),
                    age_group: getValue('ageGroup'), phone: getValue('phone'),
                    package: currentPkgName,
                    extra_nights: parseInt(document.getElementById('extraNights').value) || 0,
                    arrival_date: getValue('arrivalDate'), arrival_time: getValue('arrivalTime'),
                    departure_date: getValue('departureDate'), departure_time: getValue('departureTime'),
                    total_amount: currentGrandTotal,
                    payment_status: 'pending',
                    created_at: new Date().toISOString()
                };

                if (existingRecordId) await window.supabase.from('registrations').update(supabaseData).eq('id', existingRecordId);
                else await window.supabase.from('registrations').insert([supabaseData]);

                await sendConfirmationEmail(supabaseData);

                const currentUrl = window.location.href.split('?')[0]; 
                const { data: responseData, error: funcError } = await window.supabase.functions.invoke('stripe-charge', {
                    body: {
                        amount: currentGrandTotal * 100, 
                        email: getValue('email'),
                        description: `Tuscany Camp - ${currentPkgName} (${type.toUpperCase()})`,
                        returnUrl: currentUrl
                    }
                });

                if (funcError || responseData.error) throw new Error("Payment Init Failed: " + (funcError?.message || responseData?.error));
                window.location.href = responseData.url;

            } catch (err) {
                console.error(err);
                alert('Error: ' + err.message);
                payBtn.disabled = false; payBtn.innerText = originalText;
            }
        });
    }

    async function sendConfirmationEmail(data) {
        console.log("Sending email...");
        const SERVICE_ID = "service_fik9j1g"; 
        const TEMPLATE_ID = "template_2je1tdk"; // ID Corretto

        const templateParams = {
            to_email: data.user_email,
            full_name: data.full_name,
            // Usa 'N/A' se i campi sono vuoti per evitare spazi bianchi nell'email
            man_name: data.man_name || "N/A", 
            man_surname: data.man_surname || "",
            woman_name: data.woman_name || "N/A", 
            woman_surname: data.woman_surname || "",
            country: data.country,
            teacher: data.teacher,
            age_group: data.age_group,
            phone: data.phone,
            package_name: data.package,
            extra_nights: data.extra_nights,
            arrival_date: data.arrival_date || "Not Set", 
            arrival_time: data.arrival_time || "--:--",
            departure_date: data.departure_date || "Not Set", 
            departure_time: data.departure_time || "--:--",
            total_amount: data.total_amount
        };

        try { 
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
                console.log("Email sent successfully!");
            } else {
                console.warn("EmailJS not loaded");
            }
        } catch (e) { 
            console.error("Email Error:", e); 
        }
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
    window.addEventListener('click', (e) => { if (e.target === paymentModal) paymentModal.style.display = 'none'; });
    // --- GESTIONE TASTO "TORNA INDIETRO" (Change Type) ---
    const backBtn = document.getElementById('btnBackToStep1');
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Se l'utente ha già pagato, non permettere di tornare indietro
            if (isPaid) return;

            const step1 = document.getElementById('step-1-selection');
            const formSection = document.getElementById('entryForm');

            // 1. Nascondi il Form
            if (formSection) formSection.style.display = 'none';
            
            // 2. Mostra la Selezione Iniziale
            if (step1) {
                step1.style.display = 'block';
                // Animazione di entrata
                step1.classList.remove('fade-in-up');
                void step1.offsetWidth; // Trigger reflow
                step1.classList.add('fade-in-up');
            }

            // 3. Scrolla in alto
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    // ==========================================
    // FUNZIONE MANCANTE: getFormData
    // ==========================================
    function getFormData() {
        // 1. Recupera il tipo (salvato nell'input nascosto o default a couple)
        const typeInput = document.getElementById('registrationType');
        const type = typeInput ? typeInput.value : 'couple';

        // 2. Recupera i valori dei nomi
        // Usa una logica sicura: se l'elemento non esiste (raro), restituisce stringa vuota
        const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

        let manN = getVal('manName');
        let manS = getVal('manSurname');
        let womN = getVal('femaleName');
        let womS = getVal('femaleSurname');

        // 3. Logica Nomi e Full Name in base al tipo scelto
        let fullNameString = "";

        if (type === 'man') {
            // Se è Single Leader, svuota i campi donna e crea il nome singolo
            womN = ""; womS = ""; 
            fullNameString = `${manN} ${manS}`;
        } 
        else if (type === 'woman') {
            // Se è Single Follower, svuota i campi uomo
            manN = ""; manS = ""; 
            fullNameString = `${womN} ${womS}`;
        } 
        else {
            // Se è Coppia (o default)
            fullNameString = `${manN} ${manS} & ${womN} ${womS}`;
        }

        // 4. Gestione Telefono (unisce prefisso e numero)
        const prefix = document.getElementById('phonePrefix') ? document.getElementById('phonePrefix').value : '';
        const phoneNum = document.getElementById('phone') ? document.getElementById('phone').value : '';
        const fullPhone = prefix + " " + phoneNum;

        // 5. Recupera Pacchetto selezionato
        const pkgInput = document.querySelector('input[name="package"]:checked');
        const pkgValue = pkgInput ? pkgInput.value : 'Silver'; // Default fallback

        // 6. Recupera Notti Extra
        const nightsVal = document.getElementById('extraNights') ? document.getElementById('extraNights').value : 0;

        // 7. Ritorna l'oggetto completo
        return {
            full_name: fullNameString,
            man_name: manN,
            man_surname: manS,
            woman_name: womN,
            woman_surname: womS,
            country: getVal('country'),
            teacher: getVal('teacherName'),
            age_group: getVal('ageGroup'),
            phone: fullPhone,
            email: getVal('email'),
            user_email: getVal('email'), // Chiave doppia per sicurezza DB
            package: pkgValue,
            extra_nights: parseInt(nightsVal) || 0,
            arrival_date: getVal('arrivalDate') || null,
            arrival_time: getVal('arrivalTime') || null,
            departure_date: getVal('departureDate') || null,
            departure_time: getVal('departureTime') || null,
            // Usa la variabile globale currentGrandTotal definita all'inizio del file
            total_amount: currentGrandTotal 
        };
    }
    // --- FUNZIONE INVIO EMAIL (EmailJS) ---
    
});