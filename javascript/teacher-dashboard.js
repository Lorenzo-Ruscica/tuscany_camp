// ==========================================
// FILE: js/teacher_dashboard.js
// ==========================================

let currentTeacherId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkTeacherAuth();
});

// 1. CHECK LOGIN E IDENTIFICAZIONE INSEGNANTE
async function checkTeacherAuth() {
    const { data: { session } } = await window.supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html'; // Se non loggato, vai al login
        return;
    }

    const userEmail = session.user.email;
    console.log("Utente loggato:", userEmail);

    // Cerca se questa email appartiene a un insegnante
    const { data: teacher, error } = await window.supabase
        .from('teachers')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

    if (error || !teacher) {
        // Se l'utente è loggato ma non è un insegnante nel DB
        alert("Accesso Negato: La tua email non è associata a nessun profilo insegnante.");
        await window.supabase.auth.signOut();
        window.location.href = 'index.html';
        return;
    }

    // Trovato!
    currentTeacherId = teacher.id;
    document.getElementById('teacher-name').innerText = teacher.full_name;
    
    // Carica le lezioni
    loadMySchedule();
}

// 2. CARICA LEZIONI
async function loadMySchedule() {
    if (!currentTeacherId) return;

    const container = document.getElementById('schedule-container');
    container.innerHTML = '<p style="text-align:center; color:#aaa;">Loading...</p>';

    // Prendi le lezioni future (o tutte, come preferisci)
    // Qui prendiamo tutte quelle NON cancellate, ordinate per data
    const { data: bookings, error } = await window.supabase
        .from('bookings')
        .select('*, registrations(full_name)')
        .eq('teacher_id', currentTeacherId)
        .neq('status', 'cancelled')
        .order('lesson_date', { ascending: true })
        .order('start_time', { ascending: true });

    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa; margin-top:30px;">No upcoming lessons found.</p>';
        return;
    }

    container.innerHTML = '';
    let lastDate = '';

    bookings.forEach(b => {
        // Formatta la data
        const dateObj = new Date(b.lesson_date);
        const dateString = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

        // Se cambia la data, metti l'intestazione
        if (dateString !== lastDate) {
            container.innerHTML += `<div class="date-header">${dateString}</div>`;
            lastDate = dateString;
        }

        // Trova il nome della coppia
        let coupleName = "Unknown User";
        if (b.registrations && b.registrations.full_name) coupleName = b.registrations.full_name;

        // Crea la card
        container.innerHTML += `
            <div class="schedule-card">
                <div>
                    <div class="time-box">${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)}</div>
                    <div class="couple-name">${coupleName}</div>
                    <small style="color:#666;">Sala: ${b.admin_notes || 'A'}</small>
                </div>
            </div>
        `;
    });
}

// 3. LOGOUT
window.logoutTeacher = async () => {
    await window.supabase.auth.signOut();
    window.location.href = 'login.html';
};