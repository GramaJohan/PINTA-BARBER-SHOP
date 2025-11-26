/* script.js - lógica del prototipo (localStorage demo) */
(function(){
  // UTIL: parse params
  function getQueryParam(name){
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  // Horarios: generar slots cada 50 minutos entre 08:00 y 20:00
  function generateTimeSlots(){
    const slots = [];
    const start = new Date();
    start.setHours(8,0,0,0);
    const end = new Date();
    end.setHours(20,0,0,0);
    let cur = new Date(start);
    while(cur <= end){
      const hh = String(cur.getHours()).padStart(2,'0');
      const mm = String(cur.getMinutes()).padStart(2,'0');
      slots.push(`${hh}:${mm}`);
      cur.setMinutes(cur.getMinutes() + 50);
    }
    return slots;
  }

  // bookings store in localStorage under 'pinta_bookings'
  function loadBookings(){
    const raw = localStorage.getItem('pinta_bookings') || '[]';
    try { return JSON.parse(raw); } catch(e){ return []; }
  }
  function saveBookings(bookings){
    localStorage.setItem('pinta_bookings', JSON.stringify(bookings));
  }

  // Helper: is date in past (date only)
  function isPastDate(dateStr){
    const today = new Date();
    const selected = new Date(dateStr + 'T00:00');
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return selected < t0;
  }

  // RENDER: fill time select on cliente page
  function fillTimeOptions(){
    const timeSelect = document.getElementById('timeSelect');
    if(!timeSelect) return;
    timeSelect.innerHTML = '';
    const slots = generateTimeSlots();
    const bookings = loadBookings();

    const dateInput = document.getElementById('dateInput');
    const barberSelect = document.getElementById('barberSelect');

    // helper to refresh options according to selected date and barber
    function refresh(){
      const selDate = dateInput.value;
      const selBarber = barberSelect ? barberSelect.value : 'Jhon Reales';
      timeSelect.innerHTML = '';
      const isToday = selDate === new Date().toISOString().slice(0,10);
      
      slots.forEach(s=>{
        // check if occupied by the selected barber
        const occupied = bookings.some(b => 
          b.date === selDate && 
          b.time === s && 
          b.barbero === selBarber
        );
        if(occupied) return; // skip occupied times
        
        if(isToday){
          // compute if time already passed
          const [hh,mm] = s.split(':').map(Number);
          const t = new Date();
          t.setHours(hh,mm,0,0);
          if(t <= new Date()) return; // skip past times of today
        }
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        timeSelect.appendChild(opt);
      });
      
      // if no options:
      if(timeSelect.options.length === 0){
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No hay horarios disponibles';
        timeSelect.appendChild(opt);
      }
    }

    // refresh on change
    dateInput.addEventListener('change', refresh);
    if(barberSelect){
      barberSelect.addEventListener('change', refresh);
    }
    
    // initial:
    if(!dateInput.value){
      dateInput.value = new Date().toISOString().slice(0,10);
    }
    refresh();
  }

  // CLIENTE PAGE: init
  function initCliente(){
    const serviceFromQuery = decodeURIComponent(getQueryParam('service') || 'Corte');
    const barberoFromQuery = decodeURIComponent(getQueryParam('barbero') || 'Jhon Reales');
    
    const serviceSelect = document.getElementById('serviceSelect');
    if(serviceSelect){
      // select matching option
      for(let i=0;i<serviceSelect.options.length;i++){
        if(serviceSelect.options[i].value === serviceFromQuery){
          serviceSelect.selectedIndex = i; break;
        }
      }
    }

    const barberSelect = document.getElementById('barberSelect');
    if(barberSelect){
      // select matching barbero
      for(let i=0;i<barberSelect.options.length;i++){
        if(barberSelect.options[i].value === barberoFromQuery){
          barberSelect.selectedIndex = i; break;
        }
      }
    }

    fillBookingsList();
    fillTimeOptions();

    // disable past dates in date input min
    const dateInput = document.getElementById('dateInput');
    if(dateInput){
      const todayStr = new Date().toISOString().slice(0,10);
      dateInput.setAttribute('min', todayStr);
    }

    const reserveBtn = document.getElementById('reserveBtn');
    if(reserveBtn){
      reserveBtn.addEventListener('click', function(){
        const name = (document.getElementById('clientName') || {}).value || '';
        const phone = (document.getElementById('clientPhone') || {}).value || '';
        const date = (document.getElementById('dateInput') || {}).value || '';
        const time = (document.getElementById('timeSelect') || {}).value || '';
        const service = (document.getElementById('serviceSelect') || {}).value || 'Corte';
        const barbero = (document.getElementById('barberSelect') || {}).value || 'Jhon Reales';

        const msgEl = document.getElementById('msg');

        if(!name.trim() || !phone.trim() || !date || !time){
          msgEl.style.color = '#dc2626';
          msgEl.style.background = '#fee2e2';
          msgEl.textContent = 'Completa todos los campos antes de reservar.';
          return;
        }
        if(isPastDate(date)){
          msgEl.style.color = '#dc2626';
          msgEl.style.background = '#fee2e2';
          msgEl.textContent = 'No puedes reservar fechas pasadas.';
          return;
        }
        
        // double-check slot still free for this barber
        const bookings = loadBookings();
        const occupied = bookings.some(b => 
          b.date === date && 
          b.time === time && 
          b.barbero === barbero
        );
        if(occupied){
          msgEl.style.color = '#dc2626';
          msgEl.style.background = '#fee2e2';
          msgEl.textContent = 'Ese horario ya fue reservado. Elige otro.';
          fillTimeOptions(); // refresh
          return;
        }
        
        // save booking
        bookings.push({
          id: 'b' + Date.now(),
          name: name.trim(),
          phone: phone.trim(),
          date: date,
          time: time,
          service: service,
          barbero: barbero
        });
        saveBookings(bookings);

        msgEl.style.color = '#059669';
        msgEl.style.background = '#d1fae5';
        msgEl.textContent = `✓ Reserva confirmada para ${date} ${time} — ${service} con ${barbero}`;

        // clear form
        document.getElementById('clientName').value = '';
        document.getElementById('clientPhone').value = '';

        // refresh bookings display and time options
        fillBookingsList();
        fillTimeOptions();
      });
    }
  }

  // show bookings in the side list
  function fillBookingsList(){
    const ul = document.getElementById('bookingsList');
    if(!ul) return;
    const bookings = loadBookings().sort((a,b)=>{
      if(a.date === b.date){
        if(a.time === b.time){
          return a.barbero.localeCompare(b.barbero);
        }
        return a.time.localeCompare(b.time);
      }
      return a.date.localeCompare(b.date);
    });
    ul.innerHTML = '';
    if(bookings.length === 0){
      ul.innerHTML = '<li style="color:#9ca3af;font-size:14px">No hay reservas</li>'; 
      return;
    }
    bookings.forEach(b=>{
      const li = document.createElement('li');
      li.style.cssText = 'padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:14px';
      li.innerHTML = `
        <div style="font-weight:600;color:#111">${b.name}</div>
        <div style="color:#6b7280;font-size:13px">${b.date} ${b.time} — ${b.service}</div>
        <div style="color:#c9a227;font-size:13px">Con ${b.barbero}</div>
      `;
      ul.appendChild(li);
    });
  }

  // BARBER PAGE: init
  function initBarbero(){
    const select = document.getElementById('barberService');
    const priceInput = document.getElementById('barberPrice');
    const registerBtn = document.getElementById('registerBtn');
    const timeEl = document.getElementById('barberTime');
    const historyBody = document.getElementById('historyBody');
    const totalDayEl = document.getElementById('totalDay');

    if(!select) return;

    // set initial price based on selection
    function setPriceBySelect(){
      const opt = select.options[select.selectedIndex];
      const p = opt.getAttribute('data-price') || '';
      if(p){
        priceInput.value = Number(p);
        priceInput.disabled = true;
      } else {
        priceInput.value = '';
        priceInput.disabled = false;
      }
    }
    select.addEventListener('change', setPriceBySelect);
    setPriceBySelect();

    // capture current time display
    function captureTime(){
      const now = new Date();
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      timeEl.textContent = `${hh}:${mm}`;
      return `${hh}:${mm}`;
    }
    setInterval(()=>{ captureTime(); }, 1000);
    captureTime();

    // register cut
    registerBtn.addEventListener('click', function(){
      const sel = select.options[select.selectedIndex].value;
      const price = Number(priceInput.value || 0);
      const hora = captureTime();
      if(!price || price <= 0){
        const msgEl = document.getElementById('barberMsg');
        msgEl.style.color = '#dc2626';
        msgEl.textContent = 'Ingresa un precio válido.';
        return;
      }
      
      // store in localStorage under 'pinta_records'
      const recordsRaw = localStorage.getItem('pinta_records') || '[]';
      let records = [];
      try { records = JSON.parse(recordsRaw); } catch(e){ records = []; }
      const now = new Date();
      const record = {
        id: 'r' + Date.now(),
        service: sel,
        price: price,
        time: hora,
        date: now.toISOString().slice(0,10)
      };
      records.push(record);
      localStorage.setItem('pinta_records', JSON.stringify(records));
      
      const msgEl = document.getElementById('barberMsg');
      msgEl.style.color = '#059669';
      msgEl.style.background = '#d1fae5';
      msgEl.style.padding = '12px';
      msgEl.style.borderRadius = '8px';
      msgEl.textContent = '✓ Corte registrado: ' + sel + ' · $' + price.toLocaleString();
      
      renderHistory();
    });

    // render today's history
    function renderHistory(){
      const recordsRaw = localStorage.getItem('pinta_records') || '[]';
      let records = [];
      try { records = JSON.parse(recordsRaw); } catch(e){ records = []; }
      const today = new Date().toISOString().slice(0,10);
      const todayRecords = records.filter(r => r.date === today);
      historyBody.innerHTML = '';
      let total = 0;
      todayRecords.forEach(r=>{
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = r.time;
        const td2 = document.createElement('td'); td2.textContent = r.service;
        const td3 = document.createElement('td'); td3.textContent = '$' + r.price.toLocaleString();
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        historyBody.appendChild(tr);
        total += Number(r.price);
      });
      totalDayEl.textContent = '$' + total.toLocaleString();
    }
    renderHistory();
  }

  // auto init depending on page
  document.addEventListener('DOMContentLoaded', function(){
    if(document.body.innerText.includes('Reservar cita') || document.getElementById('reserveBtn')){
      initCliente();
    }
    if(document.body.innerText.includes('Panel Barbero') || document.getElementById('registerBtn')){
      initBarbero();
    }
  });

})();