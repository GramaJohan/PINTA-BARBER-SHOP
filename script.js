/* script.js - Sistema completo Pinta Barber Shop */
(function(){
  'use strict';

  // ========== UTILIDADES ==========
  function getQueryParam(name){
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  // Horarios: generar slots cada 50 minutos entre 10:00 y 20:00
  function generateTimeSlots(){
    const slots = [];
    const start = new Date();
    start.setHours(10,0,0,0);
    const end = new Date();
    end.setHours(20,0,0,0);
    let cur = new Date(start);
    while(cur <= end){
      const hh = String(cur.getHours()).padStart(2,'0');
      const mm = String(cur.getMinutes()).padStart(2,'0');
      slots.push(hh + ':' + mm);
      cur.setMinutes(cur.getMinutes() + 50);
    }
    return slots;
  }

  // ========== GESTIÓN DE RESERVAS ==========
  function loadBookings(){
    const raw = localStorage.getItem('pinta_bookings') || '[]';
    try { 
      return JSON.parse(raw); 
    } catch(e){ 
      return []; 
    }
  }

  function saveBookings(bookings){
    localStorage.setItem('pinta_bookings', JSON.stringify(bookings));
  }

  // Helper: verificar si fecha es pasada
  function isPastDate(dateStr){
    const today = new Date();
    const selected = new Date(dateStr + 'T00:00');
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return selected < t0;
  }

  // ========== PÁGINA CLIENTE ==========
  function initCliente(){
    const serviceFromQuery = decodeURIComponent(getQueryParam('service') || 'Corte');
    const barberoFromQuery = decodeURIComponent(getQueryParam('barbero') || 'Jhon Reales');
    
    const serviceSelect = document.getElementById('serviceSelect');
    if(serviceSelect){
      for(let i=0; i<serviceSelect.options.length; i++){
        if(serviceSelect.options[i].value === serviceFromQuery){
          serviceSelect.selectedIndex = i; 
          break;
        }
      }
    }

    const barberSelect = document.getElementById('barberSelect');
    if(barberSelect){
      for(let i=0; i<barberSelect.options.length; i++){
        if(barberSelect.options[i].value === barberoFromQuery){
          barberSelect.selectedIndex = i; 
          break;
        }
      }
    }

    fillBookingsList();
    fillTimeOptions();

    const dateInput = document.getElementById('dateInput');
    if(dateInput){
      const todayStr = new Date().toISOString().slice(0,10);
      dateInput.setAttribute('min', todayStr);
    }

    const reserveBtn = document.getElementById('reserveBtn');
    if(reserveBtn){
      reserveBtn.addEventListener('click', handleReservation);
    }
  }

  function fillTimeOptions(){
    const timeSelect = document.getElementById('timeSelect');
    if(!timeSelect) return;
    
    const slots = generateTimeSlots();
    const bookings = loadBookings();
    const dateInput = document.getElementById('dateInput');
    const barberSelect = document.getElementById('barberSelect');

    function refresh(){
      const selDate = dateInput.value;
      const selBarber = barberSelect ? barberSelect.value : 'Jhon Reales';
      timeSelect.innerHTML = '';
      
      const isToday = selDate === new Date().toISOString().slice(0,10);
      
      slots.forEach(function(s){
        const occupied = bookings.some(function(b){
          return b.date === selDate && b.time === s && b.barbero === selBarber;
        });
        
        if(occupied) return;
        
        if(isToday){
          const parts = s.split(':');
          const hh = parseInt(parts[0], 10);
          const mm = parseInt(parts[1], 10);
          const t = new Date();
          t.setHours(hh, mm, 0, 0);
          if(t <= new Date()) return;
        }
        
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        timeSelect.appendChild(opt);
      });
      
      if(timeSelect.options.length === 0){
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No hay horarios disponibles';
        timeSelect.appendChild(opt);
      }
    }

    dateInput.addEventListener('change', refresh);
    if(barberSelect){
      barberSelect.addEventListener('change', refresh);
    }
    
    if(!dateInput.value){
      dateInput.value = new Date().toISOString().slice(0,10);
    }
    refresh();
  }

  function handleReservation(){
    const name = (document.getElementById('clientName') || {}).value || '';
    const phone = (document.getElementById('clientPhone') || {}).value || '';
    const date = (document.getElementById('dateInput') || {}).value || '';
    const time = (document.getElementById('timeSelect') || {}).value || '';
    const service = (document.getElementById('serviceSelect') || {}).value || 'Corte';
    const barbero = (document.getElementById('barberSelect') || {}).value || 'Jhon Reales';
    const msgEl = document.getElementById('msg');

    if(!name.trim() || !phone.trim() || !date || !time){
      showMessage(msgEl, 'Completa todos los campos antes de reservar.', 'error');
      return;
    }
    
    if(isPastDate(date)){
      showMessage(msgEl, 'No puedes reservar fechas pasadas.', 'error');
      return;
    }
    
    const bookings = loadBookings();
    const occupied = bookings.some(function(b){
      return b.date === date && b.time === time && b.barbero === barbero;
    });
    
    if(occupied){
      showMessage(msgEl, 'Ese horario ya fue reservado. Elige otro.', 'error');
      fillTimeOptions();
      return;
    }
    
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

    showMessage(msgEl, '✓ Reserva confirmada para ' + date + ' ' + time + ' — ' + service + ' con ' + barbero, 'success');

    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';

    fillBookingsList();
    fillTimeOptions();
  }

  function fillBookingsList(){
    const ul = document.getElementById('bookingsList');
    if(!ul) return;
    
    const bookings = loadBookings().sort(function(a,b){
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
    
    bookings.forEach(function(b){
      const li = document.createElement('li');
      li.style.cssText = 'padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:14px';
      li.innerHTML = '<div style="font-weight:600;color:#111">' + b.name + '</div>' +
        '<div style="color:#6b7280;font-size:13px">' + b.date + ' ' + b.time + ' — ' + b.service + '</div>' +
        '<div style="color:#c9a227;font-size:13px">Con ' + b.barbero + '</div>';
      ul.appendChild(li);
    });
  }

  // ========== PÁGINA BARBERO ==========
  function initBarbero(){
    // Verificar autenticación
    const auth = sessionStorage.getItem('barber_auth');
    if (!auth) {
      alert('Debes iniciar sesión para acceder al panel');
      window.location.href = 'login.html';
      return;
    }

    const userData = JSON.parse(auth);
    const barberNameEl = document.getElementById('barberName');
    if (barberNameEl) {
      barberNameEl.textContent = userData.name;
    }

    // Botón cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        if (confirm('¿Deseas cerrar sesión?')) {
          sessionStorage.removeItem('barber_auth');
          window.location.href = 'login.html';
        }
      });
    }

    // Mostrar citas del día
    renderTodayAppointments();

    const select = document.getElementById('barberService');
    const priceInput = document.getElementById('barberPrice');
    const registerBtn = document.getElementById('registerBtn');
    const timeEl = document.getElementById('barberTime');
    const historyBody = document.getElementById('historyBody');
    const totalDayEl = document.getElementById('totalDay');

    if(!select) return;

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

    function captureTime(){
      const now = new Date();
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      timeEl.textContent = hh + ':' + mm;
      return hh + ':' + mm;
    }
    
    setInterval(function(){ captureTime(); }, 1000);
    captureTime();

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
      
      const recordsRaw = localStorage.getItem('pinta_records') || '[]';
      let records = [];
      try { 
        records = JSON.parse(recordsRaw); 
      } catch(e){ 
        records = []; 
      }
      
      const now = new Date();
      const record = {
        id: 'r' + Date.now(),
        service: sel,
        price: price,
        time: hora,
        date: now.toISOString().slice(0,10),
        barber: userData.name
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

    function renderHistory(){
      const recordsRaw = localStorage.getItem('pinta_records') || '[]';
      let records = [];
      try { 
        records = JSON.parse(recordsRaw); 
      } catch(e){ 
        records = []; 
      }
      
      const today = new Date().toISOString().slice(0,10);
      const todayRecords = records.filter(function(r){ 
        return r.date === today; 
      });
      
      historyBody.innerHTML = '';
      let total = 0;
      
      todayRecords.forEach(function(r){
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); 
        td1.textContent = r.time;
        const td2 = document.createElement('td'); 
        td2.textContent = r.service;
        const td3 = document.createElement('td'); 
        td3.textContent = '$' + r.price.toLocaleString();
        
        tr.appendChild(td1); 
        tr.appendChild(td2); 
        tr.appendChild(td3);
        historyBody.appendChild(tr);
        total += Number(r.price);
      });
      
      totalDayEl.textContent = '$' + total.toLocaleString();
    }
    
    renderHistory();
  }

  function renderTodayAppointments() {
    const container = document.getElementById('todayAppointments');
    if (!container) return;

    const bookings = loadBookings();
    const today = new Date().toISOString().slice(0,10);
    const todayBookings = bookings
      .filter(function(b){ return b.date === today; })
      .sort(function(a,b){ return a.time.localeCompare(b.time); });

    if (todayBookings.length === 0) {
      container.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px">No hay citas agendadas para hoy</p>';
      return;
    }

    let html = '<div class="appointments-list">';
    todayBookings.forEach(function(booking) {
      html += '<div class="appointment-item">' +
        '<div class="appointment-time">' + booking.time + '</div>' +
        '<div class="appointment-details">' +
          '<div class="appointment-name">' + booking.name + '</div>' +
          '<div class="appointment-service">' + booking.service + '</div>' +
          '<div class="appointment-phone">📱 ' + booking.phone + '</div>' +
        '</div>' +
        '<div class="appointment-barber">' + booking.barbero + '</div>' +
      '</div>';
    });
    html += '</div>';
    
    container.innerHTML = html;
  }

  // ========== UTILIDAD: MOSTRAR MENSAJES ==========
  function showMessage(element, text, type){
    if(!element) return;
    
    if(type === 'error'){
      element.style.color = '#dc2626';
      element.style.background = '#fee2e2';
    } else {
      element.style.color = '#059669';
      element.style.background = '#d1fae5';
    }
    
    element.style.padding = '12px';
    element.style.borderRadius = '8px';
    element.textContent = text;
  }

  // ========== INICIALIZACIÓN ==========
  document.addEventListener('DOMContentLoaded', function(){
    // Detectar página actual
    if(document.getElementById('reserveBtn')){
      initCliente();
    }
    
    if(document.getElementById('registerBtn')){
      initBarbero();
    } 
  });
  
})(); 