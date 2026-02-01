document.addEventListener('DOMContentLoaded', async () => {
    
    // --- SICUREZZA BASE ---
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // DOM Elements
    const teacherSelectAvail = document.getElementById('avail-teacher');
    const teacherSelectPrint = document.getElementById('print-teacher');
    
    // --- 1. CARICA DATI INIZIALI ---
    loadTeachers();
    loadActiveShifts();

    // --- FUNZIONI TAB ---
    window.showTab = (tabId) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        
        const selectedContent = document.getElementById('tab-' + tabId);
        if (selectedContent) selectedContent.classList.add('active');
        
        // Evidenzia bottone
        if (event && event.currentTarget && event.currentTarget.classList.contains('nav-btn')) {
            event.currentTarget.classList.add('active');
        }

        // Caricamento Dati Specifici
        if (tabId === 'accounting') loadAllBookings();
        if (tabId === 'messages') loadMessages();
        if (tabId === 'registrations') loadRegistrations();
        if (tabId === 'teachers-mgmt') loadTeachersList();
    };

    // --- GESTIONE DISPONIBILITÀ (WHITELIST) ---
    async function loadTeachers() {
        const { data: teachers } = await window.supabase
            .from('teachers')
            .select('*')
            .order('full_name');

        let html = '<option value="">Seleziona...</option>';
        teachers.forEach(t => {
            html += `<option value="${t.id}">${t.full_name}</option>`;
        });
        
        teacherSelectAvail.innerHTML = html;
        teacherSelectPrint.innerHTML = html;
    }

    window.addAvailability = async () => {
        const teacherId = teacherSelectAvail.value;
        const date = document.getElementById('avail-date').value;
        const start = document.getElementById('avail-start').value;
        const end = document.getElementById('avail-end').value;

        if (!teacherId || !date) return alert("Compila tutti i campi");

        const { error } = await window.supabase
            .from('teacher_availability')
            .insert({
                teacher_id: teacherId,
                available_date: date,
                start_hour: start,
                end_hour: end
            });

        if (error) alert("Errore: " + error.message);
        else {
            alert("Turno aggiunto!");
            loadActiveShifts();
        }
    };

    async function loadActiveShifts() {
        const { data: shifts } = await window.supabase
            .from('teacher_availability')
            .select('*, teachers(full_name)')
            .order('available_date', { ascending: true })
            .limit(20);

        const list = document.getElementById('avail-list');
        list.innerHTML = '';
        shifts.forEach(s => {
            list.innerHTML += `
                <div class="shift-card">
                    <strong>${s.teachers.full_name}</strong><br>
                    ${s.available_date}<br>
                    ${s.start_hour.slice(0,5)} - ${s.end_hour.slice(0,5)}
                    <button class="btn-delete-mini" onclick="deleteShift(${s.id})">&times;</button>
                </div>
            `;
        });
    }
    
    window.deleteShift = async (id) => {
        if(!confirm("Eliminare questo turno? (Non cancellerà le prenotazioni già prese)")) return;
        await window.supabase.from('teacher_availability').delete().eq('id', id);
        loadActiveShifts();
    }

    // --- GESTIONE PIANO LAVORO & STAMPA ---
    window.loadSchedule = async () => {
        const teacherId = teacherSelectPrint.value;
        const date = document.getElementById('print-date').value;

        if (!teacherId || !date) return;

        // Aggiorna Intestazione Foglio
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

        if (error) {
            console.error("ERRORE CARICAMENTO:", error);
            alert("Errore caricamento dati: " + error.message);
            return;
        }

        const tbody = document.getElementById('schedule-body');
        tbody.innerHTML = '';

        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nessuna lezione trovata per questa data.</td></tr>';
            return;
        }

        bookings.forEach(b => {
            let coupleName = "Dato Utente Mancante";
            if (b.registrations && b.registrations.full_name) {
                coupleName = b.registrations.full_name;
            } else if (b.user_id) {
                coupleName = "ID: " + b.user_id.slice(0, 5) + "..."; 
            }

            tbody.innerHTML += `
                <tr>
                    <td>${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)}</td>
                    <td><strong>${coupleName}</strong></td>
                    <td>${b.admin_notes || 'Sala A'}</td> 
                    <td></td>
                </tr>
            `;
        });
    };

    // ==========================================
    // NUOVO: DOWNLOAD PDF
    // ==========================================
   // ==========================================
    // FUNZIONE DOWNLOAD PDF (VERSIONE DEBUG)
    // ==========================================
    window.downloadPDF = () => {
        console.log("Avvio procedura download PDF...");

        // 1. CONTROLLO LIBRERIA
        if (typeof html2pdf === 'undefined') {
            alert("ERRORE GRAVE: La libreria html2pdf non è stata caricata.\nControlla di aver inserito lo <script> nel file admin.html e di essere connesso a internet.");
            return;
        }

        // 2. CONTROLLO ELEMENTO HTML
        const element = document.getElementById('print-area');
        if (!element) {
            alert("ERRORE: Non trovo l'elemento con id='print-area'.\nVai in admin.html e aggiungi id=\"print-area\" al div con class=\"print-sheet\".");
            return;
        }

        // 3. RECUPERO DATI NOME FILE
        const teacherName = document.getElementById('sheet-teacher-name').innerText || "Piano";
        // Pulisce il nome da spazi e caratteri strani
        const safeName = teacherName.replace(/[^a-zA-Z0-9]/g, '_');
        const date = document.getElementById('sheet-date').innerText.replace(/[:\/\s]/g, '-').replace('Data-', '');

        // 4. OPZIONI PDF
        const opt = {
            margin:       0.3, // Margine ridotto
            filename:     `Schedule_${safeName}_${date}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, // Importante per le immagini esterne
                logging: true  // Attiva i log per il debug
            },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        // 5. GENERAZIONE (Con gestione errori Immagini)
        // Modifica temporanea del bottone per dare feedback
        const btn = document.querySelector('button[onclick="downloadPDF()"]');
        const oldText = btn ? btn.innerHTML : '';
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generazione...';

        html2pdf().set(opt).from(element).save()
            .then(() => {
                console.log("PDF Scaricato con successo!");
                if(btn) btn.innerHTML = oldText;
            })
            .catch(err => {
                console.error("ERRORE PDF:", err);
                alert("ERRORE durante la creazione del PDF:\n" + err.message + "\n\nNOTA: Se sei in locale (file://), le immagini (logo) potrebbero bloccare il download. Prova a rimuovere il logo per testare.");
                if(btn) btn.innerHTML = oldText;
            });
    };

    // --- CONTABILITÀ E ALERT ---
    window.loadAllBookings = async () => {
        const { data: bookings } = await window.supabase
            .from('bookings')
            .select('*, teachers(full_name), registrations(full_name)')
            .order('created_at', { ascending: false })
            .limit(50); 

        renderAccountingTable(bookings);
    };

    window.searchBookings = async () => {
        const query = document.getElementById('search-booking').value;
        loadAllBookings(); 
    };

    function renderAccountingTable(bookings) {
        const tbody = document.getElementById('accounting-body');
        tbody.innerHTML = '';
        
        if(!bookings) return;

        bookings.forEach(b => {
            const rowClass = b.status === 'cancelled' ? 'style="opacity:0.5; text-decoration:line-through"' : '';
            const coupleName = b.registrations?.full_name || "N/A";
            
            // 1. Bottone MODIFICA (Matita) - Solo se non cancellato
            const btnEdit = b.status !== 'cancelled' ? `
                <button onclick="openEditModal(${b.id}, '${b.lesson_date}', '${b.start_time}', '${b.end_time}', ${b.lesson_price})" 
                        style="color:#ff9f43; background:none; border:none; cursor:pointer; margin-right:5px;" title="Modifica">
                    <i class="fas fa-edit"></i>
                </button>` : '';

            // 2. Bottone ANNULLA (Divieto/X) - "Soft Delete" (rimane nello storico)
            const btnCancel = b.status !== 'cancelled' ? `
                <button onclick="cancelBookingAdmin(${b.id})" 
                        style="color:#f55394; background:none; border:none; cursor:pointer; margin-right:5px;" title="Annulla (Mantieni in storico)">
                    <i class="fas fa-ban"></i>
                </button>` : '<span style="font-size:0.8rem; margin-right:5px;">(Annullato)</span>';

            // 3. Bottone ELIMINA (Cestino) - "Hard Delete" (sparice per sempre) - NUOVO!
            const btnDelete = `
                <button onclick="deleteBookingPermanent(${b.id})" 
                        style="color:red; background:none; border:none; cursor:pointer;" title="Elimina DEFINITIVAMENTE dal database">
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
                    <td>
                        ${btnEdit}
                        ${btnCancel}
                        ${btnDelete} 
                    </td>
                </tr>`;
        });
    }

    window.cancelBookingAdmin = async (id) => {
        if (!confirm("ATTENZIONE!\nQuesta modifica cambierà il saldo dell'insegnante e della coppia.\n\nSe hai già stampato le buste, ricordati di aggiornarle!\n\nVuoi procedere?")) return;

        await window.supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', id);
        
        loadAllBookings();
    };
    // ELIMINAZIONE TOTALE (Hard Delete)
    window.deleteBookingPermanent = async (id) => {
        if (!confirm("ATTENZIONE ESTREMA!\n\nStai per eliminare questa prenotazione COMPLETAMENTE dal database.\nNon rimarrà nessuna traccia nello storico.\n\nSei sicuro di voler procedere?")) return;

        const { error } = await window.supabase
            .from('bookings')
            .delete()
            .eq('id', id);
        
        if (error) {
            alert("Errore durante l'eliminazione: " + error.message);
        } else {
            // Ricarica la tabella
            loadAllBookings();
        }
    };

    // ==========================================
    // NUOVO: LOGICA MODALE MODIFICA ADMIN
    // ==========================================
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
        const newStart = document.getElementById('edit-start').value; // HH:MM
        const newEnd = document.getElementById('edit-end').value;     // HH:MM
        const newPrice = document.getElementById('edit-price').value;

        if(!newDate || !newStart || !newPrice) return alert("Compila tutti i campi");

        const formattedStart = newStart.length === 5 ? newStart + ":00" : newStart;
        const formattedEnd = newEnd.length === 5 ? newEnd + ":00" : newEnd;

        const { error } = await window.supabase
            .from('bookings')
            .update({
                lesson_date: newDate,
                start_time: formattedStart,
                end_time: formattedEnd,
                lesson_price: newPrice,
                admin_notes: "Modified by Admin"
            })
            .eq('id', id);

        if (error) {
            alert("Errore modifica: " + error.message);
        } else {
            alert("Modifica salvata!");
            closeEditModal();
            loadAllBookings(); 
        }
    };

    // ==========================================
    // GESTIONE MESSAGGI CONTATTI
    // ==========================================
    window.loadMessages = async () => {
        const { data: msgs, error } = await window.supabase
            .from('contacts') 
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Errore caricamento messaggi:", error);
            return;
        }

        const tbody = document.getElementById('messages-body');
        tbody.innerHTML = '';

        if (!msgs || msgs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nessun messaggio ricevuto.</td></tr>';
            return;
        }

        msgs.forEach(m => {
            const style = m.is_read ? '' : 'font-weight:bold; color:#fff; background:rgba(245, 83, 148, 0.1);';
            const date = new Date(m.created_at).toLocaleDateString('it-IT');
            const subject = m.subject ? m.subject : '(Nessun oggetto)';

            tbody.innerHTML += `
                <tr style="${style}">
                    <td>${date}</td>
                    <td>${m.full_name}<br><small style="opacity:0.7">${m.email}</small></td>
                    <td><strong>${subject}</strong><br>${m.message}</td>
                    <td>
                        <button onclick="deleteMessage(${m.id})" style="color:red; background:none; border:none; cursor:pointer;" title="Elimina">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${!m.is_read ? `<button onclick="markAsRead(${m.id})" style="color:#0f0; background:none; border:none; cursor:pointer; margin-left:10px;" title="Segna come letto"><i class="fas fa-check"></i></button>` : ''}
                    </td>
                </tr>
            `;
        });
    };

    window.markAsRead = async (id) => {
        await window.supabase.from('contacts').update({ is_read: true }).eq('id', id);
        loadMessages(); 
    };

    window.deleteMessage = async (id) => {
        if(confirm("Eliminare questo messaggio?")) {
            await window.supabase.from('contacts').delete().eq('id', id);
            loadMessages();
        }
    };

    // ==========================================
    // GESTIONE ISCRITTI ENTRY FORM
    // ==========================================
    window.loadRegistrations = async () => {
        const { data: regs, error } = await window.supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });

        const tbody = document.getElementById('registrations-body');
        tbody.innerHTML = '';
        
        let totalMoney = 0;
        let count = 0;

        if (!regs || regs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nessuna iscrizione trovata.</td></tr>';
            return;
        }

        regs.forEach(r => {
            count++;
            totalMoney += Number(r.total_amount) || 0;
            const date = new Date(r.created_at).toLocaleDateString('it-IT');
            
            tbody.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td><strong>${r.full_name}</strong><br><small>${r.user_email}</small></td>
                    <td>${r.role}</td>
                    <td>${r.package}</td>
                    <td>€ ${r.total_amount}</td>
                    <td><span style="color:#0f0">${r.payment_status}</span></td>
                </tr>
            `;
        });

        const countDisplay = document.getElementById('total-reg-count');
        const moneyDisplay = document.getElementById('total-reg-money');
        if(countDisplay) countDisplay.innerText = count;
        if(moneyDisplay) moneyDisplay.innerText = "€ " + totalMoney;
    };
    
    window.filterRegistrations = () => {
        const input = document.getElementById('search-reg').value.toLowerCase();
        const rows = document.querySelectorAll('#registrations-body tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(input) ? '' : 'none';
        });
    };
    
    window.logout = async () => {
        await window.supabase.auth.signOut();
        window.location.href = 'index.html';
    }

    // ==========================================
    // GESTIONE INSEGNANTI (CRUD)
    // ==========================================
    window.loadTeachersList = async () => {
        const { data: teachers } = await window.supabase
            .from('teachers')
            .select('*')
            .order('full_name');

        const tbody = document.getElementById('teachers-list-body');
        tbody.innerHTML = '';

        if (!teachers) return;

        teachers.forEach(t => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${t.full_name}</strong></td>
                    <td>€ ${t.base_price}</td>
                    <td>${t.discipline || '-'}</td>
                    <td><span style="color:#0f0">Attivo</span></td>
                    <td>
                        <button onclick="deleteTeacher(${t.id})" style="color:red; background:none; border:none; cursor:pointer;" title="Elimina">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </td>
                </tr>
            `;
        });
    };

    window.addNewTeacher = async () => {
        const name = document.getElementById('new-teacher-name').value;
        const price = document.getElementById('new-teacher-price').value;
        const discipline = document.getElementById('new-teacher-discipline').value;

        if (!name || !price) return alert("Inserisci almeno Nome e Prezzo.");

        const { error } = await window.supabase
            .from('teachers')
            .insert({
                full_name: name,
                base_price: price,
                discipline: discipline,
                is_active: true
            });

        if (error) {
            alert("Errore: " + error.message);
        } else {
            alert("Insegnante aggiunto con successo!");
            document.getElementById('new-teacher-name').value = '';
            document.getElementById('new-teacher-discipline').value = '';
            loadTeachersList();
            loadTeachers(); 
        }
    };

    window.deleteTeacher = async (id) => {
        if (!confirm("Sei sicuro di voler eliminare questo insegnante?")) return;
        
        const { error } = await window.supabase
            .from('teachers')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Impossibile eliminare: probabilmente ci sono lezioni o orari collegati a questo insegnante. Cancellali prima.");
            console.error(error);
        } else {
            alert("Insegnante eliminato.");
            loadTeachersList();
            loadTeachers(); 
        }
    };
});