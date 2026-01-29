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
});