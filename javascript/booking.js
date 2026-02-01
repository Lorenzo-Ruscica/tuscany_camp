// ============================================================
// FILE: js/booking.js
// DESCRIZIONE: Gestione prenotazioni (Create, Read, Update, Delete)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // ELEMENTI DOM
    const loader = document.getElementById('access-loader');
    const accessDeniedBox = document.getElementById('access-denied-box');
    const bookingMainContent = document.getElementById('booking-main-content');
    
    // Form Elements
    const bookingFormArea = document.querySelector('.booking-form-area');
    const formTitle = document.querySelector('.booking-form-area h3');
    const teacherSelect = document.getElementById('teacherSelect');
    const datesContainer = document.getElementById('dates-container');
    const dateGroup = document.getElementById('dateGroup');
    const timeGroup = document.getElementById('timeGroup');
    const slotsContainer = document.getElementById('slots-container');
    const confirmBtn = document.getElementById('btn-confirm-booking');
    
    // List Elements
    const myBookingsList = document.getElementById('my-bookings-list');
    const grandTotalDisplay = document.getElementById('grand-total-display');

    // STATE VARIABLES
    let currentUser = null;
    let selectedTeacherId = null;
    let selectedTeacherPrice = 0;
    let selectedDate = null;
    let selectedTime = null;
    
    // Variable to track if we are editing (null = new booking, ID = editing)
    let modifyingBookingId = null; 

    // --- 1. CHECK ISCRIZIONE (IL MURO) ---
    async function checkAccess() {
        const { data: { session } } = await window.supabase.auth.getSession();
        if(loader) loader.style.display = 'none';

        if (!session) {
            window.location.href = 'login.html'; 
            return;
        }

        currentUser = session.user;

        const { data: regData } = await window.supabase
            .from('registrations')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (!regData) {
            if(bookingMainContent) bookingMainContent.style.display = 'none';
            if(accessDeniedBox) accessDeniedBox.style.display = 'block';
            return;
        }

        if(accessDeniedBox) accessDeniedBox.style.display = 'none';
        if(bookingMainContent) bookingMainContent.style.display = 'block';
        
        loadTeachers();
        loadMyBookings();
    }

    // --- 2. CARICA INSEGNANTI ---
    async function loadTeachers() {
        const { data: teachers } = await window.supabase
            .from('teachers')
            .select('*')
            .eq('is_active', true)
            .order('full_name');

        teacherSelect.innerHTML = '<option value="" disabled selected>Select a Teacher...</option>';
        teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.full_name;
            opt.dataset.price = t.base_price;
            teacherSelect.appendChild(opt);
        });
    }

    // --- 3. QUANDO SELEZIONI L'INSEGNANTE -> MOSTRA LE DATE ---
    teacherSelect.addEventListener('change', async (e) => {
        selectedTeacherId = e.target.value;
        selectedTeacherPrice = parseFloat(e.target.selectedOptions[0].dataset.price);
        
        // Reset UI parziale (manteniamo selectedDate se stiamo modificando)
        if (!modifyingBookingId) {
            selectedDate = null;
            selectedTime = null;
        }
        confirmBtn.style.display = 'none';
        
        // Sblocca sezione date
        dateGroup.style.opacity = '1';
        dateGroup.style.pointerEvents = 'all';
        datesContainer.innerHTML = '<div class="slot-placeholder">Loading dates...</div>';
        
        // Nascondi orari per ora
        timeGroup.style.opacity = '0.5';
        timeGroup.style.pointerEvents = 'none';
        slotsContainer.innerHTML = '<div class="slot-placeholder">Select a date first</div>';

        // SCARICA DATE DISPONIBILI DAL DB
        const { data: availabilities } = await window.supabase
            .from('teacher_availability')
            .select('available_date')
            .eq('teacher_id', selectedTeacherId)
            .order('available_date', { ascending: true });

        if (!availabilities || availabilities.length === 0) {
            datesContainer.innerHTML = '<div class="slot-placeholder" style="color:red">No dates available for this teacher.</div>';
            return;
        }

        // Rimuovi duplicati
        const uniqueDates = [...new Set(availabilities.map(item => item.available_date))];

        datesContainer.innerHTML = '';
        uniqueDates.forEach(dateStr => {
            const btn = document.createElement('div');
            btn.className = 'date-btn';
            btn.textContent = formatDateNice(dateStr); 
            
            // Se stiamo modificando e questa è la data originale, selezionala
            if (modifyingBookingId && dateStr === selectedDate) {
                btn.classList.add('selected');
                // Triggera caricamento orari
                selectDate(btn, dateStr, true); 
            }

            btn.onclick = () => selectDate(btn, dateStr);
            datesContainer.appendChild(btn);
        });
    });

    // --- 4. SELEZIONE DATA -> MOSTRA ORARI ---
    async function selectDate(btn, dateStr, autoSelect = false) {
        // Grafica selezione
        document.querySelectorAll('.date-btn').forEach(el => el.classList.remove('selected'));
        if(btn) btn.classList.add('selected');
        
        selectedDate = dateStr;
        // Reset time solo se non è autoselect da modifica
        if (!autoSelect) selectedTime = null;
        
        confirmBtn.style.display = 'none';

        // Sblocca orari
        timeGroup.style.opacity = '1';
        timeGroup.style.pointerEvents = 'all';
        slotsContainer.innerHTML = '<div class="slot-placeholder">Loading slots...</div>';

        // A. Prendi Turni
        const { data: shifts } = await window.supabase
            .from('teacher_availability')
            .select('*')
            .eq('teacher_id', selectedTeacherId)
            .eq('available_date', dateStr);

        // B. Prendi Slot Occupati (Escludendo quello che stiamo modificando!)
        let query = window.supabase
            .from('bookings')
            .select('id, start_time')
            .eq('teacher_id', selectedTeacherId)
            .eq('lesson_date', dateStr)
            .neq('status', 'cancelled');
            
        const { data: takenSlots } = await query;

        // Filtra: se stiamo modificando, il nostro stesso orario NON deve risultare occupato
        const takenTimes = takenSlots
            .filter(b => b.id !== modifyingBookingId) // Ignora la mia stessa prenotazione
            .map(b => b.start_time.substring(0, 5));

        slotsContainer.innerHTML = '';
        if(shifts.length === 0) {
             slotsContainer.innerHTML = 'No slots.';
             return;
        }

        shifts.forEach(shift => {
            generateTimeSlots(shift.start_hour, shift.end_hour, takenTimes);
        });
    }

    function generateTimeSlots(startStr, endStr, takenTimes) {
        let current = timeToMins(startStr);
        const end = timeToMins(endStr);
        const duration = 45; 

        while (current + duration <= end) {
            const timeString = minsToTime(current);
            const btn = document.createElement('div');
            btn.className = 'time-slot';
            btn.textContent = timeString;
            
            if (takenTimes.includes(timeString)) {
                btn.classList.add('taken');
            } else {
                // Se stiamo modificando e questo era il mio orario, selezionalo
                if (modifyingBookingId && timeString === selectedTime.substring(0,5) + ":00") {
                    btn.classList.add('selected');
                    confirmBtn.style.display = 'block';
                    document.getElementById('price-preview').textContent = selectedTeacherPrice;
                }
                
                btn.onclick = () => selectSlot(btn, timeString);
            }

            slotsContainer.appendChild(btn);
            current += duration;
        }
    }

    function selectSlot(btn, time) {
        document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTime = time;
        
        confirmBtn.style.display = 'block';
        // Aggiorna testo bottone in base allo stato
        confirmBtn.innerHTML = modifyingBookingId ? 
            `UPDATE BOOKING (€ <span id="price-preview">${selectedTeacherPrice}</span>)` : 
            `CONFIRM BOOKING (€ <span id="price-preview">${selectedTeacherPrice}</span>)`;
    }

    // --- 5. CONFERMA (INSERT O UPDATE) ---
    confirmBtn.addEventListener('click', async () => {
        const originalText = confirmBtn.innerText;
        confirmBtn.disabled = true;
        confirmBtn.innerText = "Processing...";

        const startMins = timeToMins(selectedTime);
        const endTime = minsToTime(startMins + 45);

        let result;

        if (modifyingBookingId) {
            // --- UPDATE EXISTING ---
            result = await window.supabase
                .from('bookings')
                .update({
                    teacher_id: selectedTeacherId,
                    lesson_date: selectedDate,
                    start_time: selectedTime,
                    end_time: endTime,
                    lesson_price: selectedTeacherPrice,
                    admin_notes: "Modified by User" // Flag per l'admin
                })
                .eq('id', modifyingBookingId);
        } else {
            // --- INSERT NEW ---
            result = await window.supabase
                .from('bookings')
                .insert({
                    user_id: currentUser.id,
                    teacher_id: selectedTeacherId,
                    lesson_date: selectedDate,
                    start_time: selectedTime,
                    end_time: endTime,
                    lesson_price: selectedTeacherPrice
                });
        }

        if (result.error) {
            alert("Error: " + result.error.message);
            confirmBtn.disabled = false;
            confirmBtn.innerText = originalText;
        } else {
            alert(modifyingBookingId ? "Lesson Updated Successfully!" : "Lesson Booked Successfully!");
            resetForm();
            loadMyBookings();
        }
    });

    // --- FUNZIONI DI MODIFICA (Chiamate dai bottoni lista) ---
    window.startModifyBooking = async (id, teacherId, date, startTime) => {
        modifyingBookingId = id;
        selectedDate = date;
        selectedTime = startTime; // "10:00:00"

        // UI Feedback
        bookingFormArea.scrollIntoView({ behavior: 'smooth' });
        bookingFormArea.style.border = "2px solid #ff9f43"; // Arancione
        formTitle.innerHTML = `<i class="fas fa-edit"></i> Modifying Lesson`;
        
        // Popola il form
        teacherSelect.value = teacherId;
        // Triggera manualmente il cambio per ricaricare date e orari
        teacherSelect.dispatchEvent(new Event('change'));
    };

    function resetForm() {
        modifyingBookingId = null;
        selectedDate = null;
        selectedTime = null;
        
        // Reset UI
        bookingFormArea.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        formTitle.innerHTML = `<i class="fas fa-calendar-plus"></i> New Booking`;
        
        teacherSelect.value = "";
        slotsContainer.innerHTML = '<div class="slot-placeholder">Select a date</div>';
        datesContainer.innerHTML = '<div class="slot-placeholder">Select teacher first</div>';
        timeGroup.style.opacity = '0.5';
        dateGroup.style.opacity = '0.5';
        confirmBtn.style.display = 'none';
    }

    // --- CARICAMENTO LISTA PRENOTAZIONI ---
    async function loadMyBookings() {
        const { data: bookings } = await window.supabase
            .from('bookings')
            .select('*, teachers(full_name)')
            .eq('user_id', currentUser.id)
            .neq('status', 'cancelled')
            .order('lesson_date', { ascending: true });

        myBookingsList.innerHTML = '';
        let total = 0;

        if (!bookings || bookings.length === 0) {
            myBookingsList.innerHTML = '<p style="text-align: center; opacity: 0.6; width:100%;">No lessons booked yet.</p>';
        } else {
            bookings.forEach(b => {
                total += b.lesson_price;
                myBookingsList.innerHTML += `
                    <div class="booking-item fade-in-up">
                        <div class="booking-actions">
                            <button class="btn-edit" onclick="startModifyBooking(${b.id}, ${b.teacher_id}, '${b.lesson_date}', '${b.start_time}')" title="Modify">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" onclick="cancelBooking(${b.id})" title="Cancel">
                                &times;
                            </button>
                        </div>
                        <h4>${b.teachers.full_name}</h4>
                        <div class="details">
                            <i class="far fa-calendar"></i> ${formatDateNice(b.lesson_date)} <br>
                            <i class="far fa-clock"></i> ${b.start_time.substring(0,5)} - ${b.end_time.substring(0,5)}
                        </div>
                        <div class="price">€ ${b.lesson_price}</div>
                    </div>`;
            });
        }
        grandTotalDisplay.textContent = "€ " + total;
    }

    // --- UTILS ---
    window.cancelBooking = async (id) => {
        if (!confirm("Are you sure you want to cancel this lesson?")) return;
        
        await window.supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
        
        // Se stavo modificando proprio quella, resetta
        if (modifyingBookingId === id) resetForm();
        
        loadMyBookings();
    };

    function timeToMins(t) { 
        if(!t) return 0;
        const [h,m] = t.split(':'); return h*60 + +m; 
    }
    function minsToTime(mins) { 
        return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}:00`; 
    }
    
    function formatDateNice(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    }

    // AVVIO
    checkAccess();
});