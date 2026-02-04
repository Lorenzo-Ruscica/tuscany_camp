// ==========================================
// FILE: js/teacher_dashboard.js (TIMELINE VIEW)
// ==========================================

let currentTeacherId = null;
let allBookings = []; 

document.addEventListener('DOMContentLoaded', async () => {
    await checkTeacherAuth();
});

// 1. AUTENTICAZIONE
async function checkTeacherAuth() {
    const nameLabel = document.getElementById('teacher-name');
    const container = document.getElementById('schedule-container');

    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) { window.location.href = 'login.html'; return; }

        const userEmail = session.user.email;
        
        const { data: teacher } = await window.supabase
            .from('teachers')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

        if (!teacher) {
            container.innerHTML = `<div style="color:red; text-align:center; margin-top:30px;">Email non associata ad un insegnante.</div>`;
            return;
        }

        currentTeacherId = teacher.id;
        nameLabel.innerText = teacher.full_name;
        
        await loadMySchedule();

    } catch (err) {
        console.error(err);
        nameLabel.innerText = "Error";
    }
}

// 2. CARICAMENTO DATI
async function loadMySchedule() {
    const container = document.getElementById('schedule-container');
    
    // Query completa
    const { data: bookings, error } = await window.supabase
        .from('bookings')
        .select(`
            *, 
            registrations ( full_name, phone, man_name, man_surname, woman_name, woman_surname )
        `)
        .eq('teacher_id', currentTeacherId)
        .neq('status', 'cancelled')
        .order('lesson_date', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Error loading data.</p>`;
        return;
    }

    allBookings = bookings || [];
    renderTimeline(allBookings); 
}

// 3. RENDERIZZAZIONE "TIMELINE STYLE"
function renderTimeline(bookingsToRender) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';

    if (bookingsToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="far fa-calendar-times"></i><br>
                No lessons found.
            </div>`;
        return;
    }

    // A. RAGGRUPPIAMO LE LEZIONI PER DATA
    // Creiamo un oggetto: { "2026-05-22": [lezione1, lezione2], "2026-05-23": [...] }
    const grouped = {};
    bookingsToRender.forEach(b => {
        if (!grouped[b.lesson_date]) {
            grouped[b.lesson_date] = [];
        }
        grouped[b.lesson_date].push(b);
    });

    // B. ITERIAMO SUI GIORNI
    for (const [date, dayBookings] of Object.entries(grouped)) {
        
        // 1. Formatta la data header (es. "Venerdì 22 Maggio")
        const dateObj = new Date(date);
        const dateNice = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        const dayName = dateNice.charAt(0).toUpperCase() + dateNice.slice(1); // Maiuscola iniziale

        // 2. Crea il contenitore del giorno
        const dayGroup = document.createElement('div');
        dayGroup.className = 'day-group';

        // 3. Aggiungi Header Data
        let dayHTML = `
            <div class="day-header">
                <i class="far fa-calendar"></i> ${dayName}
            </div>
            <div class="timeline-wrapper">
        `;

        // 4. Aggiungi le lezioni di quel giorno (Time Slots)
        dayBookings.forEach(b => {
            // Nome
            let displayName = "Private Lesson";
            let phone = null;
            if (b.registrations) {
                if (b.registrations.full_name) displayName = b.registrations.full_name;
                else {
                    const m = b.registrations.man_name ? b.registrations.man_name : "";
                    const w = b.registrations.woman_name ? b.registrations.woman_name : "";
                    if(m && w) displayName = `${m} & ${w}`;
                    else displayName = m || w;
                }
                phone = b.registrations.phone;
            }

            // Orario pulito (10:00 - 10:45)
            const timeRange = `${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)}`;

            // Bottoni Azione
            let btns = '';
            if(phone) {
                const p = phone.replace(/\s+/g, '').replace(/-/g, '');
                btns = `
                    <div class="action-row">
                        <a href="tel:${p}" class="btn-action"><i class="fas fa-phone"></i> Call</a>
                        <a href="https://wa.me/${p}" target="_blank" class="btn-action btn-wa"><i class="fab fa-whatsapp"></i> Chat</a>
                    </div>`;
            }

            // HTML del singolo SLOT
            dayHTML += `
                <div class="time-slot">
                    <div class="time-label">${b.start_time.slice(0,5)}</div>
                    
                    <div class="lesson-card">
                        <div class="lesson-couple">${displayName}</div>
                        
                        <div class="lesson-details">
                            <span><i class="far fa-clock"></i> ${timeRange}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${b.admin_notes || 'Room A'}</span>
                        </div>
                        
                        ${btns}
                    </div>
                </div>
            `;
        });

        dayHTML += `</div>`; // Chiude timeline-wrapper
        dayGroup.innerHTML = dayHTML;
        container.appendChild(dayGroup);
    }
}

// 4. FILTRI
window.filterSchedule = () => {
    const inputDate = document.getElementById('filter-date').value;
    if (!inputDate) { renderTimeline(allBookings); return; }
    const filtered = allBookings.filter(b => b.lesson_date === inputDate);
    renderTimeline(filtered);
};

window.resetFilter = () => {
    document.getElementById('filter-date').value = '';
    renderTimeline(allBookings);
};

window.logoutTeacher = async () => {
    await window.supabase.auth.signOut();
    window.location.href = 'login.html';
};