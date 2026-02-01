// ============================================================
// FILE: js/booking.js - UPDATED FOR NEW DESIGN & EMAIL
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // DOM ELEMENTS
    const loader = document.getElementById('access-loader');
    const accessDeniedBox = document.getElementById('access-denied-box');
    const bookingMainContent = document.getElementById('booking-main-content');
    
    // Form Elements
    const bookingFormArea = document.querySelector('.booking-form-area');
    const teacherSelect = document.getElementById('teacherSelect');
    const datesContainer = document.getElementById('dates-container');
    const dateGroup = document.getElementById('dateGroup');
    const timeGroup = document.getElementById('timeGroup');
    const slotsContainer = document.getElementById('slots-container');
    const confirmBtn = document.getElementById('btn-confirm-booking');
    
    // List Elements
    const myBookingsList = document.getElementById('my-bookings-list');
    const grandTotalDisplay = document.getElementById('grand-total-display');

    // Modal Elements (Se non esistono nell'HTML, il codice non si spacca)
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');

    // STATE VARIABLES
    let currentUser = null;
    let selectedTeacherId = null;
    let selectedTeacherPrice = 0;
    let selectedDate = null;
    let selectedTime = null;
    let modifyingBookingId = null; 

    // ============================================================
    // 0. HELPER: SHOW MODAL (O ALERT CLASSICO SE MODAL NON C'È)
    // ============================================================
    function showModal(message, type = 'alert', title = 'Notice') {
        return new Promise((resolve) => {
            if (!modalOverlay) {
                // Fallback se il modale HTML non c'è
                if (type === 'confirm') {
                    const result = confirm(message);
                    resolve(result);
                } else {
                    alert(message);
                    resolve(true);
                }
                return;
            }

            modalTitle.innerText = title;
            modalMessage.innerText = message;
            modalOverlay.style.display = 'flex';

            if (type === 'alert') {
                btnCancel.style.display = 'none';
                btnConfirm.innerText = "OK";
            } else {
                btnCancel.style.display = 'block';
                btnConfirm.innerText = "Confirm";
                btnCancel.innerText = "Cancel";
            }

            // Pulizia vecchi eventi
            const newConfirm = btnConfirm.cloneNode(true);
            const newCancel = btnCancel.cloneNode(true);
            btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);
            btnCancel.parentNode.replaceChild(newCancel, btnCancel);

            // Nuovi eventi
            newConfirm.onclick = () => {
                modalOverlay.style.display = 'none';
                resolve(true);
            };
            newCancel.onclick = () => {
                modalOverlay.style.display = 'none';
                resolve(false);
            };
        });
    }

    // ============================================================
    // 1. CHECK ACCESS (FIXED LOADER)
    // ============================================================
    async function checkAccess() {
        try {
            // 1. Controllo Sessione Supabase
            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            // 2. NASCONDI LOADER SUBITO (Così non gira all'infinito)
            if(loader) loader.style.display = 'none';

            if (error || !session) {
                window.location.href = 'login.html'; 
                return;
            }

            currentUser = session.user;

            // 3. Controllo se ha compilato il form
            const { data: regData, error: regError } = await window.supabase
                .from('registrations')
                .select('id')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (!regData) {
                if(bookingMainContent) bookingMainContent.style.display = 'none';
                if(accessDeniedBox) accessDeniedBox.style.display = 'block'; // Mostra card accesso negato
                return;
            }

            // 4. Tutto ok, mostra contenuto
            if(accessDeniedBox) accessDeniedBox.style.display = 'none';
            if(bookingMainContent) bookingMainContent.style.display = 'block';
            
            loadTeachers();
            loadMyBookings();

        } catch (err) {
            console.error("Errore critico checkAccess:", err);
            // Sicurezza: nascondi loader anche in caso di crash
            if(loader) loader.style.display = 'none';
        }
    }

    // ============================================================
    // 2. BOOKING LOGIC
    // ============================================================
    async function loadTeachers() {
        const { data: teachers } = await window.supabase
            .from('teachers')
            .select('*')
            .eq('is_active', true)
            .order('full_name');

        if(teacherSelect) {
            teacherSelect.innerHTML = '<option value="" disabled selected>Select a Teacher...</option>';
            if(teachers) {
                teachers.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.full_name;
                    opt.dataset.price = t.base_price;
                    teacherSelect.appendChild(opt);
                });
            }
        }
    }

    if(teacherSelect) {
        teacherSelect.addEventListener('change', async (e) => {
            selectedTeacherId = e.target.value;
            selectedTeacherPrice = parseFloat(e.target.selectedOptions[0].dataset.price);
            
            if (!modifyingBookingId) {
                selectedDate = null;
                selectedTime = null;
            }
            confirmBtn.style.display = 'none';
            
            dateGroup.style.opacity = '1';
            dateGroup.style.pointerEvents = 'all';
            datesContainer.innerHTML = '<div class="slot-placeholder">Loading dates...</div>';
            
            timeGroup.style.opacity = '0.5';
            timeGroup.style.pointerEvents = 'none';
            slotsContainer.innerHTML = '<div class="slot-placeholder">Select a date first</div>';

            const { data: availabilities } = await window.supabase
                .from('teacher_availability')
                .select('available_date')
                .eq('teacher_id', selectedTeacherId)
                .order('available_date', { ascending: true });

            if (!availabilities || availabilities.length === 0) {
                datesContainer.innerHTML = '<div class="slot-placeholder" style="color:red">No dates available for this teacher.</div>';
                return;
            }

            const uniqueDates = [...new Set(availabilities.map(item => item.available_date))];

            datesContainer.innerHTML = '';
            uniqueDates.forEach(dateStr => {
                const btn = document.createElement('div');
                btn.className = 'date-btn';
                btn.textContent = formatDateNice(dateStr); 
                
                if (modifyingBookingId && dateStr === selectedDate) {
                    btn.classList.add('selected');
                    selectDate(btn, dateStr, true); 
                }

                btn.onclick = () => selectDate(btn, dateStr);
                datesContainer.appendChild(btn);
            });
        });
    }

    async function selectDate(btn, dateStr, autoSelect = false) {
        document.querySelectorAll('.date-btn').forEach(el => el.classList.remove('selected'));
        if(btn) btn.classList.add('selected');
        
        selectedDate = dateStr;
        if (!autoSelect) selectedTime = null;
        
        confirmBtn.style.display = 'none';

        timeGroup.style.opacity = '1';
        timeGroup.style.pointerEvents = 'all';
        slotsContainer.innerHTML = '<div class="slot-placeholder">Loading slots...</div>';

        const { data: shifts } = await window.supabase
            .from('teacher_availability')
            .select('*')
            .eq('teacher_id', selectedTeacherId)
            .eq('available_date', dateStr);

        let query = window.supabase
            .from('bookings')
            .select('id, start_time')
            .eq('teacher_id', selectedTeacherId)
            .eq('lesson_date', dateStr)
            .neq('status', 'cancelled');
            
        const { data: takenSlots } = await query;

        const takenTimes = takenSlots
            .filter(b => b.id !== modifyingBookingId) 
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
        confirmBtn.innerHTML = modifyingBookingId ? 
            `UPDATE BOOKING (€ <span id="price-preview">${selectedTeacherPrice}</span>)` : 
            `CONFIRM BOOKING (€ <span id="price-preview">${selectedTeacherPrice}</span>)`;
    }

    // --- PULSANTE CONFERMA (CON EMAIL) ---
    if(confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const originalText = confirmBtn.innerText;
            confirmBtn.disabled = true;
            confirmBtn.innerText = "Processing...";

            const startMins = timeToMins(selectedTime);
            const endTime = minsToTime(startMins + 45);

            let result;

            if (modifyingBookingId) {
                // UPDATE
                result = await window.supabase
                    .from('bookings')
                    .update({
                        teacher_id: selectedTeacherId,
                        lesson_date: selectedDate,
                        start_time: selectedTime,
                        end_time: endTime,
                        lesson_price: selectedTeacherPrice,
                        admin_notes: "Modified by User"
                    })
                    .eq('id', modifyingBookingId);
            } else {
                // INSERT
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
                await showModal("Error: " + result.error.message, 'alert', 'Error');
            } else {
                // --- 1. INVIO EMAIL ---
                const teacherName = teacherSelect.options[teacherSelect.selectedIndex].text;
                const actionText = modifyingBookingId ? "LESSON MODIFIED" : "BOOKING CONFIRMED";

                await sendEmailNotification(
                    actionText,
                    {
                        teacher_name: teacherName,
                        lesson_date: selectedDate,
                        lesson_time: selectedTime,
                        price: selectedTeacherPrice
                    },
                    currentUser.email,
                    "Dancer"
                );

                // --- 2. MODAL SUCCESSO ---
                await showModal(
                    modifyingBookingId ? "Lesson Updated Successfully!" : "Lesson Booked Successfully!", 
                    'alert', 
                    'Success'
                );
                
                resetForm();
                loadMyBookings();
            }
            confirmBtn.disabled = false;
            confirmBtn.innerText = originalText;
        });
    }

    // ============================================================
    // 3. MODIFY & CANCEL (CON EMAIL)
    // ============================================================
    window.startModifyBooking = async (id, teacherId, date, startTime) => {
        await showModal("You are modifying a lesson.\nPlease select a new date or time from the calendar above.", 'alert', 'Modify Lesson');

        modifyingBookingId = id;
        selectedDate = date;
        selectedTime = startTime;

        bookingFormArea.scrollIntoView({ behavior: 'smooth' });
        bookingFormArea.style.border = "2px solid #ff9f43";
        // Opzionale: cambia titolo per indicare modifica
        const formH3 = document.querySelector('.booking-form-area h3');
        if(formH3) formH3.innerHTML = `<i class="fas fa-edit"></i> Modify Lesson`;
        
        teacherSelect.value = teacherId;
        teacherSelect.dispatchEvent(new Event('change'));
    };

    window.cancelBooking = async (id) => {
        const userConfirmed = await showModal("Are you sure you want to cancel this lesson?", 'confirm', 'Warning');
        
        if (!userConfirmed) return;
        
        // 1. Prendi dati PRIMA di cancellare (per email)
        const { data: bookingData } = await window.supabase
            .from('bookings')
            .select('*, teachers(full_name)')
            .eq('id', id)
            .single();

        // 2. Cancella (Update Status)
        await window.supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
        
        // 3. Invia Email
        if(bookingData) {
            await sendEmailNotification(
                "BOOKING CANCELLED",
                {
                    teacher_name: bookingData.teachers.full_name,
                    lesson_date: bookingData.lesson_date,
                    lesson_time: bookingData.start_time,
                    price: bookingData.lesson_price
                },
                currentUser.email,
                "Dancer"
            );
        }
        
        if (modifyingBookingId === id) resetForm();
        loadMyBookings();
    };

    function resetForm() {
        modifyingBookingId = null;
        selectedDate = null;
        selectedTime = null;
        
        bookingFormArea.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        const formH3 = document.querySelector('.booking-form-area h3');
        if(formH3) formH3.innerHTML = `<i class="far fa-calendar-alt"></i> New Booking`;
        
        teacherSelect.value = "";
        slotsContainer.innerHTML = '<div class="slot-placeholder">Select a date</div>';
        datesContainer.innerHTML = '<div class="slot-placeholder">Select teacher first</div>';
        timeGroup.style.opacity = '0.5';
        dateGroup.style.opacity = '0.5';
        confirmBtn.style.display = 'none';
    }

    async function loadMyBookings() {
        if(!myBookingsList) return;

        const { data: bookings } = await window.supabase
            .from('bookings')
            .select('*, teachers(full_name)')
            .eq('user_id', currentUser.id)
            .neq('status', 'cancelled')
            .order('lesson_date', { ascending: true });

        myBookingsList.innerHTML = '';
        let total = 0;

        if (!bookings || bookings.length === 0) {
            myBookingsList.innerHTML = '<p style="text-align: center; opacity: 0.6; width:100%; padding: 20px;">No lessons booked yet.</p>';
        } else {
            bookings.forEach(b => {
                total += b.lesson_price;
                
                // --- GENERAZIONE HTML AGGIORNATA PER NUOVO CSS ---
                myBookingsList.innerHTML += `
                    <div class="booking-item">
                        <h4>${b.teachers.full_name}</h4>
                        <div class="details">
                            <i class="far fa-calendar"></i> ${formatDateNice(b.lesson_date)} <br>
                            <i class="far fa-clock"></i> ${b.start_time.substring(0,5)} - ${b.end_time.substring(0,5)}
                        </div>
                        <div class="price">€ ${b.lesson_price}</div>
                        
                        <div class="booking-actions">
                            <button class="btn-action-small" onclick="startModifyBooking(${b.id}, ${b.teacher_id}, '${b.lesson_date}', '${b.start_time}')" title="Modify">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn-action-small delete" onclick="cancelBooking(${b.id})" title="Cancel">
                                <i class="fas fa-trash"></i> Cancel
                            </button>
                        </div>
                    </div>`;
            });
        }
        if(grandTotalDisplay) grandTotalDisplay.textContent = "€ " + total;
    }

    // ==========================================
    // 4. EMAILJS FUNCTION
    // ==========================================
    async function sendEmailNotification(type, bookingData, userEmail, userName) {
        console.log(`Sending email to ${userEmail} for ${type}...`);

        const templateParams = {
            to_email: userEmail,       // Destinatario
            user_name: userName,       // Nome Utente
            action_type: type,         // Es: "BOOKING CONFIRMED"
            teacher_name: bookingData.teacher_name,
            lesson_date: bookingData.lesson_date,
            lesson_time: bookingData.lesson_time,
            price: bookingData.price
        };

        try {
            // TUOI DATI EMAILJS
            const SERVICE_ID = "service_fik9j1g"; 
            const TEMPLATE_ID = "template_szh5dao"; 

            // Controllo se EmailJS è caricato
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
                console.log("Email sent successfully!");
            } else {
                console.warn("EmailJS library not loaded. Email not sent.");
            }
        } catch (error) {
            console.error("EmailJS Error:", error);
        }
    }

    function timeToMins(t) { if(!t) return 0; const [h,m] = t.split(':'); return h*60 + +m; }
    function minsToTime(mins) { return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}:00`; }
    function formatDateNice(dateStr) { const date = new Date(dateStr); return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }); }

    // AVVIA
    checkAccess();
});