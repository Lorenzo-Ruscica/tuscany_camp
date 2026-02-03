// ============================================================
// FILE: js/admin.js - COMPLETE VERSION (With Delete Entry)
// ============================================================

// 1. VARIABILI GLOBALI
let teacherSelectAvail;
let teacherSelectPrint;

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- A. CONTROLLO SICUREZZA (WHITELIST) ---
    const { data: { session } } = await window.supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // LISTA EMAIL AMMINISTRATORI
    const allowedAdmins = [
        'admin@tuscanycamp.com',
        'mirko@gozzoli.com', 
        'lorenzo.ruscica@outlook.it'
    ];

    const userEmail = session.user.email;

    if (!allowedAdmins.includes(userEmail)) {
        alert("ACCESSO NEGATO: Non sei un amministratore autorizzato.");
        window.location.href = 'index.html'; 
        return; 
    }

    console.log("Admin loggato:", userEmail);

    // --- B. INIZIALIZZAZIONE ELEMENTI ---
    teacherSelectAvail = document.getElementById('avail-teacher');
    teacherSelectPrint = document.getElementById('print-teacher');
    
    // --- C. CARICAMENTO DATI INIZIALI ---
    loadTeachers();
    loadActiveShifts();
});

// ============================================================
// 2. FUNZIONI GLOBALI
// ============================================================

// --- GESTIONE TAB ---
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabId);
    if(tab) tab.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    if (event && event.currentTarget && event.currentTarget.classList.contains('nav-btn')) {
        event.currentTarget.classList.add('active');
    }

    if (tabId === 'accounting') loadAllBookings();
    if (tabId === 'messages') loadMessages();
    if (tabId === 'registrations') loadRegistrations();
    if (tabId === 'teachers-mgmt') loadTeachersList();
    if (tabId === 'users-system') loadSystemUsers();
};

// --- LOGOUT ---
window.logout = async () => {
    await window.supabase.auth.signOut();
    window.location.href = 'index.html';
};

// --- GESTIONE DISPONIBILITÀ ---
window.loadTeachers = async () => {
    const { data: teachers } = await window.supabase.from('teachers').select('*').order('full_name');
    if (!teachers) return;

    let html = '<option value="">Seleziona...</option>';
    teachers.forEach(t => {
        html += `<option value="${t.id}">${t.full_name}</option>`;
    });
    
    if(teacherSelectAvail) teacherSelectAvail.innerHTML = html;
    if(teacherSelectPrint) teacherSelectPrint.innerHTML = html;
};

window.addAvailability = async () => {
    const teacherId = teacherSelectAvail.value;
    const date = document.getElementById('avail-date').value;
    const start = document.getElementById('avail-start').value;
    const end = document.getElementById('avail-end').value;

    if (!teacherId || !date) return alert("Compila tutti i campi");

    const { error } = await window.supabase.from('teacher_availability').insert({
        teacher_id: teacherId, available_date: date, start_hour: start, end_hour: end
    });

    if (error) alert("Errore: " + error.message);
    else { alert("Turno aggiunto!"); loadActiveShifts(); }
};

window.loadActiveShifts = async () => {
    const { data: shifts } = await window.supabase
        .from('teacher_availability')
        .select('*, teachers(full_name)')
        .order('available_date', { ascending: true })
        .limit(20);

    const list = document.getElementById('avail-list');
    if(list) {
        list.innerHTML = '';
        if(shifts) {
            shifts.forEach(s => {
                list.innerHTML += `
                    <div class="shift-card">
                        <strong>${s.teachers.full_name}</strong><br>
                        ${s.available_date}<br>${s.start_hour.slice(0,5)} - ${s.end_hour.slice(0,5)}
                        <button class="btn-delete-mini" onclick="deleteShift(${s.id})">&times;</button>
                    </div>`;
            });
        }
    }
};

window.deleteShift = async (id) => {
    if(!confirm("Eliminare turno?")) return;
    await window.supabase.from('teacher_availability').delete().eq('id', id);
    loadActiveShifts();
};

// --- STAMPA E PDF ---
window.loadSchedule = async () => {
    const teacherId = teacherSelectPrint.value;
    const date = document.getElementById('print-date').value;

    if (!teacherId || !date) return;

    const teacherName = teacherSelectPrint.options[teacherSelectPrint.selectedIndex].text;
    document.getElementById('sheet-teacher-name').innerText = teacherName;
    document.getElementById('sheet-date').innerText = "Data: " + date.split('-').reverse().join('/');

    const { data: bookings, error } = await window.supabase
        .from('bookings')
        .select('*, registrations(full_name)')
        .eq('teacher_id', teacherId)
        .eq('lesson_date', date)
        .neq('status', 'cancelled')
        .order('start_time');
        
    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nessuna lezione.</td></tr>';
        return;
    }

    bookings.forEach(b => {
        let coupleName = "Utente non trovato";
        if (b.registrations && b.registrations.full_name) coupleName = b.registrations.full_name;
        else if (b.user_id) coupleName = "ID: " + b.user_id.slice(0,5);

        tbody.innerHTML += `
            <tr>
                <td>${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)}</td>
                <td><strong>${coupleName}</strong></td>
                <td>${b.admin_notes || 'Sala A'}</td> 
                <td></td>
            </tr>`;
    });
};

window.downloadPDF = () => {
    if (typeof html2pdf === 'undefined') {
        return alert("Libreria PDF non caricata.");
    }

    const element = document.getElementById('print-area');
    const teacherName = document.getElementById('sheet-teacher-name').innerText;
    
    if(teacherName === "Nome Insegnante") return alert("Seleziona prima un piano da stampare.");

    const safeName = teacherName.replace(/[^a-zA-Z0-9]/g, '_');
    const opt = {
        margin: 0.3,
        filename: `Schedule_${safeName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().catch(err => alert("Errore PDF: " + err.message));
};

// --- CONTABILITÀ E MODIFICA (EDIT) ---
window.loadAllBookings = async () => {
    const { data: bookings } = await window.supabase
        .from('bookings')
        .select('*, teachers(full_name), registrations(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);
    renderAccountingTable(bookings);
};

window.searchBookings = async () => {
    loadAllBookings(); 
};

function renderAccountingTable(bookings) {
    const tbody = document.getElementById('accounting-body');
    tbody.innerHTML = '';
    if(!bookings) return;

    bookings.forEach(b => {
        const rowClass = b.status === 'cancelled' ? 'style="opacity:0.5; text-decoration:line-through"' : '';
        const coupleName = b.registrations?.full_name || "N/A";
        
        const btnEdit = b.status !== 'cancelled' ? `
            <button onclick="openEditModal(${b.id}, '${b.lesson_date}', '${b.start_time}', '${b.end_time}', ${b.lesson_price})" 
                    style="color:#ff9f43; background:none; border:none; cursor:pointer; margin-right:5px;" title="Modifica">
                <i class="fas fa-edit"></i>
            </button>` : '';
            
        const btnCancel = b.status !== 'cancelled' ? `
            <button onclick="cancelBookingAdmin(${b.id})" 
                    style="color:#f55394; background:none; border:none; cursor:pointer; margin-right:5px;" title="Annulla">
                <i class="fas fa-ban"></i>
            </button>` : '<span style="font-size:0.8rem">(Annullato)</span>';

        const btnDelete = `
            <button onclick="deleteBookingPermanent(${b.id})" 
                    style="color:red; background:none; border:none; cursor:pointer;" title="ELIMINA DEL TUTTO">
                <i class="fas fa-trash"></i>
            </button>`;

        tbody.innerHTML += `
            <tr ${rowClass}>
                <td>${b.id}</td>
                <td>${b.lesson_date}<br>${b.start_time.slice(0,5)}</td>
                <td>${b.teachers.full_name}</td>
                <td>${coupleName}</td>
                <td>€ ${b.lesson_price}</td>
                <td>${b.status}</td>
                <td>${btnEdit} ${btnCancel} ${btnDelete}</td>
            </tr>`;
    });
}

// LOGICA MODALE MODIFICA (CON INVIO EMAIL)
window.openEditModal = (id, date, start, end, price) => {
    document.getElementById('edit-booking-id').value = id;
    document.getElementById('edit-date').value = date;
    document.getElementById('edit-start').value = start.slice(0,5);
    document.getElementById('edit-end').value = end.slice(0,5);
    document.getElementById('edit-price').value = price;
    
    document.getElementById('admin-edit-modal').style.display = 'flex';
};

window.closeEditModal = () => {
    document.getElementById('admin-edit-modal').style.display = 'none';
};

window.saveBookingChanges = async () => {
    const id = document.getElementById('edit-booking-id').value;
    const newDate = document.getElementById('edit-date').value;
    const newStart = document.getElementById('edit-start').value;
    const newEnd = document.getElementById('edit-end').value;
    const newPrice = document.getElementById('edit-price').value;

    if(!newDate || !newStart || !newPrice) return alert("Compila tutto");

    const formattedStart = newStart.length === 5 ? newStart + ":00" : newStart;
    const formattedEnd = newEnd.length === 5 ? newEnd + ":00" : newEnd;

    // 1. UPDATE SU SUPABASE
    const { error } = await window.supabase
        .from('bookings')
        .update({
            lesson_date: newDate, start_time: formattedStart, end_time: formattedEnd,
            lesson_price: newPrice, admin_notes: "Modified by Admin"
        })
        .eq('id', id);

    if (error) {
        alert("Errore: " + error.message);
    } else {
        // 2. RECUPERA DATI PER EMAIL E INVIA NOTIFICA
        const { data: fullBooking } = await window.supabase
            .from('bookings')
            .select('*, registrations(user_email, full_name), teachers(full_name)')
            .eq('id', id)
            .single();

        if(fullBooking && fullBooking.registrations) {
            await sendEmailNotification(
                "MODIFIED BY ADMIN",
                {
                    teacher_name: fullBooking.teachers.full_name,
                    lesson_date: newDate,
                    lesson_time: newStart,
                    price: newPrice
                },
                fullBooking.registrations.user_email,
                fullBooking.registrations.full_name
            );
        }

        alert("Salvato!");
        closeEditModal();
        loadAllBookings();
    }
};

window.cancelBookingAdmin = async (id) => {
    if (!confirm("Annullare la prenotazione? L'utente riceverà una notifica.")) return;

    // 1. RECUPERA DATI PRIMA DI CANCELLARE (per email)
    const { data: bookingData } = await window.supabase
        .from('bookings')
        .select('*, registrations(user_email, full_name), teachers(full_name)')
        .eq('id', id)
        .single();

    // 2. CANCELLA (UPDATE STATUS)
    await window.supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    
    // 3. INVIA EMAIL
    if(bookingData && bookingData.registrations) {
        await sendEmailNotification(
            "CANCELLED BY ADMIN",
            {
                teacher_name: bookingData.teachers.full_name,
                lesson_date: bookingData.lesson_date,
                lesson_time: bookingData.start_time,
                price: bookingData.lesson_price
            },
            bookingData.registrations.user_email,
            bookingData.registrations.full_name
        );
    }

    loadAllBookings();
};

window.deleteBookingPermanent = async (id) => {
    if (!confirm("ATTENZIONE: Eliminare DEFINITIVAMENTE dal database? Non si potrà recuperare.")) return;
    await window.supabase.from('bookings').delete().eq('id', id);
    loadAllBookings();
};

// --- ALTRE TAB (Messaggi) ---
window.loadMessages = async () => {
    const { data: msgs } = await window.supabase.from('contacts').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('messages-body');
    tbody.innerHTML = '';
    if(msgs) {
        msgs.forEach(m => {
            const style = m.is_read ? '' : 'font-weight:bold; color:#fff; background:rgba(245, 83, 148, 0.1);';
            const subject = m.subject || '(No Oggetto)';
            tbody.innerHTML += `
                <tr style="${style}">
                    <td>${new Date(m.created_at).toLocaleDateString()}</td>
                    <td>${m.full_name}<br><small>${m.email}</small></td>
                    <td><strong>${subject}</strong><br>${m.message}</td>
                    <td>
                        <button onclick="deleteMessage(${m.id})" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                        ${!m.is_read ? `<button onclick="markAsRead(${m.id})" style="color:#0f0; background:none; border:none; cursor:pointer;"><i class="fas fa-check"></i></button>` : ''}
                    </td>
                </tr>`;
        });
    }
};

window.markAsRead = async (id) => {
    await window.supabase.from('contacts').update({ is_read: true }).eq('id', id);
    loadMessages();
};
window.deleteMessage = async (id) => {
    if(confirm("Eliminare?")) {
        await window.supabase.from('contacts').delete().eq('id', id);
        loadMessages();
    }
};

// ==========================================
// SEZIONE: GESTIONE ISCRIZIONI (REGISTRATIONS)
// ==========================================
window.loadRegistrations = async () => {
    const { data: regs } = await window.supabase.from('registrations').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('registrations-body');
    tbody.innerHTML = '';
    let totalMoney = 0, count = 0;
    
    if(regs) {
        regs.forEach(r => {
            count++;
            totalMoney += Number(r.total_amount) || 0;
            
            // Generazione Riga con Bottone DELETE
// Cerca questo pezzo dentro loadRegistrations e AGGIORNALO così:
tbody.innerHTML += `
    <tr>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><strong>${r.full_name}</strong><br><small>${r.user_email}</small></td>
        <td>${r.role}</td>
        <td>${r.package}</td>
        <td>€ ${r.total_amount}</td>
        <td><span style="color:#0f0">${r.payment_status}</span></td>
        <td style="text-align: right; white-space: nowrap;">
            <button onclick="viewRegistrationDetails('${r.id}')" 
                    style="color:#00d2d3; background:none; border:none; cursor:pointer; margin-right: 10px;" 
                    title="Vedi Dettagli Completi">
                <i class="fas fa-eye"></i>
            </button>

            <button onclick="deleteEntry('${r.id}')" 
                    style="color:red; background:none; border:none; cursor:pointer;" 
                    title="Elimina Iscrizione">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    </tr>`;
        });
    }
    
    const countEl = document.getElementById('total-reg-count');
    const moneyEl = document.getElementById('total-reg-money');
    if(countEl) countEl.innerText = count;
    if(moneyEl) moneyEl.innerText = "€ " + totalMoney;
};

// ==========================================
// FUNZIONE CORRETTA: ELIMINAZIONE A CASCATA
// ==========================================
window.deleteEntry = async (id) => {
    const confirmed = confirm("SEI SICURO? \nEliminare questo iscritto cancellerà anche TUTTE le sue prenotazioni e lo storico.\nQuesta azione è irreversibile.");
    
    if (!confirmed) return;

    try {
        // PASSO 1: Dobbiamo trovare lo user_id collegato a questa registrazione
        const { data: regData, error: fetchError } = await window.supabase
            .from('registrations')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (regData && regData.user_id) {
            // PASSO 2: Cancelliamo TUTTE le prenotazioni (bookings) di questo utente
            const { error: bookingError } = await window.supabase
                .from('bookings')
                .delete()
                .eq('user_id', regData.user_id);

            if (bookingError) {
                console.warn("Attenzione: errore cancellazione prenotazioni o nessuna prenotazione trovata.", bookingError);
                // Non blocchiamo, proviamo comunque a cancellare la registrazione
            }
        }

        // PASSO 3: Ora che le prenotazioni sono andate, cancelliamo l'iscrizione
        const { error: regError } = await window.supabase
            .from('registrations')
            .delete()
            .eq('id', id);

        if (regError) throw regError;

        alert("Iscritto e relative prenotazioni eliminati con successo.");
        loadRegistrations(); // Ricarica la tabella

    } catch (error) {
        console.error("Errore cancellazione:", error);
        alert("Errore durante l'eliminazione: " + error.message);
    }
};

window.filterRegistrations = () => {
    const input = document.getElementById('search-reg').value.toLowerCase();
    document.querySelectorAll('#registrations-body tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(input) ? '' : 'none';
    });
};

// --- GESTIONE TEACHERS LIST ---
window.loadTeachersList = async () => {
    const { data: t } = await window.supabase.from('teachers').select('*').order('full_name');
    const tbody = document.getElementById('teachers-list-body');
    tbody.innerHTML = '';
    if(t) {
        t.forEach(teacher => {
            tbody.innerHTML += `<tr><td><strong>${teacher.full_name}</strong></td><td>€ ${teacher.base_price}</td><td>${teacher.discipline || '-'}</td><td><span style="color:#0f0">Attivo</span></td><td><button onclick="deleteTeacher(${teacher.id})" style="color:red; background:none; border:none; cursor:pointer;">Elimina</button></td></tr>`;
        });
    }
};
window.addNewTeacher = async () => {
    const name = document.getElementById('new-teacher-name').value;
    const price = document.getElementById('new-teacher-price').value;
    const disc = document.getElementById('new-teacher-discipline').value;
    if (!name) return alert("Nome obbligatorio");
    await window.supabase.from('teachers').insert({ full_name: name, base_price: price, discipline: disc, is_active: true });
    alert("Fatto"); loadTeachersList(); loadTeachers();
};
window.deleteTeacher = async (id) => {
    if(!confirm("Eliminare?")) return;
    const { error } = await window.supabase.from('teachers').delete().eq('id', id);
    if(error) alert("Errore: " + error.message);
    else { loadTeachersList(); loadTeachers(); }
};

// ==========================================
// SEZIONE: GESTIONE ACCOUNT DI SISTEMA
// ==========================================
window.loadSystemUsers = async () => {
    const tbody = document.getElementById('system-users-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Caricamento utenti...</td></tr>';

    const { data: allUsers, error: errAuth } = await window.supabase.rpc('get_system_users');
    const { data: regIds, error: errReg } = await window.supabase.from('registrations').select('user_id');

    if (errAuth || errReg) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center">Errore caricamento. Hai eseguito lo script SQL?</td></tr>';
        return;
    }

    const registeredSet = new Set(regIds.map(r => r.user_id));

    tbody.innerHTML = '';
    let ghosts = 0;

    allUsers.forEach(u => {
        const hasForm = registeredSet.has(u.id);
        if (!hasForm) ghosts++;

        const created = new Date(u.created_at).toLocaleDateString('it-IT');
        const lastSign = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('it-IT') : 'Mai';

        const statusBadge = hasForm 
            ? '<span style="color:#2ecc71; font-weight:bold;">✔ Completo</span>' 
            : '<span style="color:#ff9f43; font-weight:bold;">⚠ MANCANTE</span>';

        tbody.innerHTML += `
            <tr>
                <td>${created}</td>
                <td><strong>${u.email}</strong><br><small style="opacity:0.5">ID: ${u.id.slice(0,6)}...</small></td>
                <td>${lastSign}</td>
                <td>${statusBadge}</td>
                <td>
                    <button onclick="deleteSystemUser('${u.id}')" 
                            style="color:red; background:none; border:none; cursor:pointer;" 
                            title="Elimina Account Definitivamente">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                </td>
            </tr>`;
    });

    document.getElementById('sys-total-count').innerText = allUsers.length;
    document.getElementById('sys-ghost-count').innerText = ghosts;
};

window.deleteSystemUser = async (uuid) => {
    if(!confirm("ATTENZIONE: Stai cancellando un account di sistema. L'utente non potrà più fare login.")) return;
    await window.supabase.from('bookings').delete().eq('user_id', uuid);
    await window.supabase.from('registrations').delete().eq('user_id', uuid);
    const { error } = await window.supabase.rpc('delete_user_by_id', { target_id: uuid });
    if (error) alert("Errore eliminazione: " + error.message);
    else { alert("Account eliminato."); loadSystemUsers(); }
};

// ==========================================
// FUNZIONE INVIO EMAIL (EMAILJS)
// ==========================================
async function sendEmailNotification(type, bookingData, userEmail, userName) {
    console.log(`Sending email to ${userEmail} for ${type}...`);

    const templateParams = {
        to_email: userEmail,       // Destinatario
        user_name: userName,       // Nome Utente
        action_type: type,         // Es: "MODIFIED BY ADMIN"
        teacher_name: bookingData.teacher_name,
        lesson_date: bookingData.lesson_date,
        lesson_time: bookingData.lesson_time,
        price: bookingData.price
    };

    try {
        const SERVICE_ID = "service_fik9j1g"; 
        const TEMPLATE_ID = "template_szh5dao"; 

        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
        console.log("Email sent successfully!");
    } catch (error) {
        console.error("EmailJS Error:", error);
    }
}
// ==========================================
// NUOVE FUNZIONI: DETTAGLI ISCRIZIONE
// ==========================================

window.viewRegistrationDetails = async (id) => {
    // 1. Apri il modale e mostra caricamento
    const modal = document.getElementById('reg-details-modal');
    const content = document.getElementById('reg-details-content');
    modal.style.display = 'flex';
    content.innerHTML = '<p style="text-align:center;">Caricamento dati...</p>';

    try {
        // 2. Prendi TUTTI i dati da Supabase per quell'ID
        const { data: r, error } = await window.supabase
            .from('registrations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // 3. DETERMINA IL TIPO (Logica)
        let typeBadge = '';
        let hasMan = r.man_name && r.man_name.trim() !== '';
        let hasWoman = r.woman_name && r.woman_name.trim() !== '';

        if (hasMan && hasWoman) {
            typeBadge = `<div style="background:#6c5ce7; color:white; padding:8px 15px; border-radius:20px; display:inline-block; font-weight:bold; margin-bottom:15px;">
                            <i class="fas fa-user-friends"></i> COUPLE (x2)
                         </div>`;
        } else if (hasMan && !hasWoman) {
            typeBadge = `<div style="background:#0984e3; color:white; padding:8px 15px; border-radius:20px; display:inline-block; font-weight:bold; margin-bottom:15px;">
                            <i class="fas fa-male"></i> SINGLE MALE
                         </div>`;
        } else if (!hasMan && hasWoman) {
            typeBadge = `<div style="background:#e84393; color:white; padding:8px 15px; border-radius:20px; display:inline-block; font-weight:bold; margin-bottom:15px;">
                            <i class="fas fa-female"></i> SINGLE FEMALE
                         </div>`;
        } else {
            typeBadge = `<div style="background:#555; color:white; padding:8px 15px; border-radius:20px; display:inline-block; font-weight:bold; margin-bottom:15px;">
                            <i class="fas fa-question"></i> UNKNOWN
                         </div>`;
        }

        // 4. Genera l'HTML
        content.innerHTML = `
            <div style="text-align:center;">
                ${typeBadge}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9rem;">
                
                <div style="grid-column: 1 / -1; margin-bottom: 5px;">
                    <strong style="color:white; display:block; border-bottom:1px solid #444; padding-bottom:5px;">1. PARTECIPANTI</strong>
                </div>
                
                <div style="${hasMan ? '' : 'opacity:0.3'}"><span style="color:#888;">Man:</span> <br> <strong>${r.man_name || '-'} ${r.man_surname || '-'}</strong></div>
                <div style="${hasWoman ? '' : 'opacity:0.3'}"><span style="color:#888;">Woman:</span> <br> <strong>${r.woman_name || '-'} ${r.woman_surname || '-'}</strong></div>
                
                <div><span style="color:#888;">Teacher:</span> <br> ${r.teacher || '-'}</div>
                <div><span style="color:#888;">Country:</span> <br> ${r.country || '-'}</div>
                <div><span style="color:#888;">Age Group:</span> <br> ${r.age_group || '-'}</div>

                <div style="grid-column: 1 / -1; margin: 10px 0;">
                    <strong style="color:white; display:block; border-bottom:1px solid #444; padding-bottom:5px;">2. CONTATTI</strong>
                </div>
                <div><span style="color:#888;">Email:</span> <br> ${r.user_email || '-'}</div>
                <div><span style="color:#888;">Phone:</span> <br> ${r.phone || '-'}</div>

                <div style="grid-column: 1 / -1; margin: 10px 0;">
                    <strong style="color:white; display:block; border-bottom:1px solid #444; padding-bottom:5px;">3. PACCHETTO & COSTI</strong>
                </div>
                <div><span style="color:#888;">Package:</span> <br> <span style="color:var(--color-hot-pink); font-weight:bold;">${r.package}</span></div>
                <div><span style="color:#888;">Extra Nights:</span> <br> ${r.extra_nights || '0'}</div>
                <div><span style="color:#888;">Total Paid:</span> <br> € ${r.total_amount}</div>
                <div><span style="color:#888;">Method:</span> <br> ${r.payment_status === 'paid' ? 'Stripe (Card)' : 'Pending'}</div>

                <div style="grid-column: 1 / -1; margin: 10px 0;">
                    <strong style="color:white; display:block; border-bottom:1px solid #444; padding-bottom:5px;">4. LOGISTICA</strong>
                </div>
                <div><span style="color:#888;">Arrival:</span> <br> ${r.arrival_date || 'N/A'} <small>(${r.arrival_time || '--:--'})</small></div>
                <div><span style="color:#888;">Departure:</span> <br> ${r.departure_date || 'N/A'} <small>(${r.departure_time || '--:--'})</small></div>
            </div>
        `;

    } catch (err) {
        console.error(err);
        content.innerHTML = `<p style="color:red;">Errore nel caricamento dati: ${err.message}</p>`;
    }
};

window.closeRegModal = () => {
    document.getElementById('reg-details-modal').style.display = 'none';
};

// Chiudi se clicchi fuori
window.addEventListener('click', (e) => {
    const modal = document.getElementById('reg-details-modal');
    if (e.target === modal) modal.style.display = 'none';
    // ==========================================
// FUNZIONI MOBILE MENU
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobile-toggle-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('adminSidebar');
    const body = document.body;

    // Funzione Apri
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.add('sidebar-open');
            body.classList.add('menu-active');
        });
    }

    // Funzione Chiudi (Click su X)
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('sidebar-open');
            body.classList.remove('menu-active');
        });
    }

    // Funzione Chiudi (Click fuori / overlay)
    document.addEventListener('click', (e) => {
        if (body.classList.contains('menu-active') && 
            !sidebar.contains(e.target) && 
            e.target !== mobileBtn) {
            
            sidebar.classList.remove('sidebar-open');
            body.classList.remove('menu-active');
        }
    });

    // Chiudi menu quando clicchi un link
    const navLinks = document.querySelectorAll('.nav-btn');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                sidebar.classList.remove('sidebar-open');
                body.classList.remove('menu-active');
            }
        });
    });
});
// ==========================================
// GESTIONE NAVIGAZIONE SCHEDE (Tabs)
// ==========================================

window.showSection = function(sectionId, menuBtn) {
    // 1. Nascondi TUTTE le sezioni
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(sec => sec.style.display = 'none');

    // 2. Mostra solo quella richiesta
    const target = document.getElementById('section-' + sectionId);
    if (target) target.style.display = 'block';

    // 3. Aggiorna la classe 'active' nel menu (per evidenziare il tasto)
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    if (menuBtn) menuBtn.classList.add('active');
};

// ... (Lascia qui sotto il codice del Timer saveTimerSettings e loadTimerDate che ti ho dato prima)
});
// --- GESTIONE TIMER ---

// 1. Carica la data attuale all'avvio
document.addEventListener('DOMContentLoaded', async () => {
    // ... (altre funzioni di init se ci sono) ...
    loadCurrentTimer();
});

async function loadCurrentTimer() {
    const { data, error } = await window.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'countdown_end')
        .single();

    if (data && document.getElementById('timer-date-input')) {
        // Formatta la data per l'input datetime-local
        document.getElementById('timer-date-input').value = data.value;
    }
}

// 2. Funzione per salvare la nuova data (chiamata dal bottone HTML)
window.saveTimerDate = async () => {
    const newVal = document.getElementById('timer-date-input').value;
    
    if (!newVal) return alert("Please select a date.");

    const btn = document.querySelector('button[onclick="saveTimerDate()"]');
    const oldText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const { error } = await window.supabase
            .from('site_settings')
            .update({ value: newVal })
            .eq('key', 'countdown_end');

        if (error) throw error;
        alert("Timer updated successfully! Check the Home Page.");
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
};
