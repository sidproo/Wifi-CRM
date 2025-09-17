import { db, storage } from './firebase.js';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js';

// Data collections names
const COL_CUSTOMERS = 'customers';
const COL_PLANS = 'plans';
const COL_PAYMENTS = 'payments';
const COL_TICKETS = 'tickets';
const COL_CAMPAIGNS = 'campaigns';
const COL_ACTIVITY = 'activity';
const COL_REMINDERS = 'reminders';
const COL_SETTINGS = 'settings';

let appSettings = { currency: 'INR', companyName: '', supportEmail: '', supportPhone: '', address: '' };

document.addEventListener('DOMContentLoaded', async () => {
  showApp();
  // Fallback: auto-hide loader after 6s even if something stalls
  const fallbackTimer = setTimeout(hideLoadingScreen, 6000);
  try {
    await loadSettings();
    await Promise.all([
      renderDashboard(),
      renderCustomers(),
      renderPlans(),
      renderPayments(),
      renderTickets(),
      renderMessagingStats(),
    ]);
    setupMessagingForms();
    setupCrudHandlers();
    setupSettingsHandlers();
    scheduleExpiryReminders();
  } catch (err) {
    console.error('Initialization error:', err);
    toast('Failed to load some data. Check console.');
  } finally {
    hideLoadingScreen();
    clearTimeout(fallbackTimer);
  }
});

async function renderDashboard() {
  const [customersSnap, paymentsSnap, ticketsSnap] = await Promise.all([
    getDocs(collection(db, COL_CUSTOMERS)),
    getDocs(collection(db, COL_PAYMENTS)),
    getDocs(collection(db, COL_TICKETS)),
  ]);

  const totalCustomers = customersSnap.size;
  const openTickets = ticketsSnap.docs.filter(d => (d.data().status || '').toLowerCase() !== 'closed').length;
  const monthlyRevenue = paymentsSnap.docs
    .filter(d => isInCurrentMonth((d.data().paidAt && d.data().paidAt.toDate?.()) || d.data().paidAt))
    .reduce((sum, d) => sum + Number(d.data().amount || 0), 0);

  setText('statTotalCustomers', formatNumber(totalCustomers));
  setText('statOpenTickets', formatNumber(openTickets));
  setText('statMonthlyRevenue', formatCurrency(monthlyRevenue));
  setText('statUptime', '99.9%');

  await renderActivity();
  renderChartsFromCollections(paymentsSnap, customersSnap);
}

async function renderActivity() {
  const activityList = byId('activityList');
  if (!activityList) return;
  activityList.innerHTML = '';
  const qSnap = await getDocs(query(collection(db, COL_ACTIVITY), orderBy('createdAt', 'desc'), limit(10)));
  if (qSnap.empty) {
    activityList.innerHTML = `<div class="text-center" style="color:#000">No recent activity</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  qSnap.forEach(docSnap => {
    const item = docSnap.data();
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.innerHTML = `
      <div class="activity-icon"><i class="${item.icon || 'fas fa-info-circle'}"></i></div>
      <div class="activity-content">
        <p>${item.text || ''}</p>
        <span class="activity-time">${formatTime(item.createdAt)}</span>
      </div>`;
    frag.appendChild(div);
  });
  activityList.appendChild(frag);
}

function renderChartsFromCollections(paymentsSnap, customersSnap) {
  const revenueByDay = Array(7).fill(0);
  const now = new Date();
  paymentsSnap.docs.forEach(d => {
    const data = d.data();
    const paidAt = (data.paidAt && data.paidAt.toDate?.()) || data.paidAt || new Date();
    const diff = Math.floor((now - new Date(paidAt)) / (1000*60*60*24));
    const idx = 6 - Math.min(6, Math.max(0, diff));
    revenueByDay[idx] += Number(data.amount || 0);
  });

  const monthlyCustomers = {};
  customersSnap.docs.forEach(d => {
    const data = d.data();
    const createdAt = (data.createdAt && data.createdAt.toDate?.()) || data.createdAt || new Date();
    const key = `${new Date(createdAt).getFullYear()}-${String(new Date(createdAt).getMonth()+1).padStart(2,'0')}`;
    monthlyCustomers[key] = (monthlyCustomers[key] || 0) + 1;
  });

  const revCtx = document.getElementById('revenueChart');
  if (revCtx) {
    new Chart(revCtx, {
      type: 'line',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
          data: revenueByDay,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6,182,212,0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        }]
      }, options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
    });
  }

  const custCtx = document.getElementById('customerChart');
  if (custCtx) {
    const labels = Object.keys(monthlyCustomers).slice(-6);
    const values = labels.map(k => monthlyCustomers[k]);
    new Chart(custCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: 'rgba(6,182,212,0.8)',
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      }, options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
    });
  }
}

async function renderCustomers() {
  const tbody = byId('customersTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const snap = await getDocs(collection(db, COL_CUSTOMERS));
  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#000">No customers</td></tr>`;
    return;
  }
  const frag = document.createDocumentFragment();
  snap.forEach(docSnap => {
    const c = docSnap.data();
    const tr = document.createElement('tr');
    tr.dataset.id = docSnap.id;
    tr.innerHTML = `
      <td><input type="checkbox" class="table-checkbox"></td>
      <td>
        <div class="customer-info">
          <div class="customer-avatar"><img src="${c.avatar || 'https://via.placeholder.com/32x32/4A90E2/FFFFFF?text=CU'}" alt="Customer"></div>
          <div>
            <div class="customer-name">${c.name || ''}</div>
            <div class="customer-email">${c.email || ''}</div>
          </div>
        </div>
      </td>
      <td><span class="plan-badge premium">${c.plan || '-'}</span></td>
      <td><span class="status-badge ${c.status === 'Active' ? 'active' : ''}">${c.status || '-'}</span></td>
      <td>${formatCurrency(c.lastPaymentAmount)}</td>
      <td>${formatDate(c.expiry)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
          <button class="action-btn" title="Edit" data-action="edit-customer"><i class="fas fa-edit"></i></button>
          <button class="action-btn" title="Delete" data-action="delete-customer"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

async function renderPlans() {
  const grid = byId('plansGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const snap = await getDocs(collection(db, COL_PLANS));
  if (snap.empty) {
    grid.innerHTML = `<div style="color:#000">No plans</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  snap.forEach(docSnap => {
    const p = docSnap.data();
    const div = document.createElement('div');
    div.className = 'plan-card';
    div.innerHTML = `
      <div class="plan-header">
        <h3>${p.name || ''}</h3>
        <div class="plan-price">${formatCurrency(p.price)}<span>/month</span></div>
      </div>
      <div class="plan-features">
        <div class="feature"><i class="fas fa-check"></i><span>${p.speed || ''} Speed</span></div>
        <div class="feature"><i class="fas fa-check"></i><span>${p.data || 'Unlimited'} Data</span></div>
        <div class="feature"><i class="fas fa-check"></i><span>${p.support || '24/7 Support'}</span></div>
      </div>
      <div class="plan-actions">
        <button class="btn btn-outline">Edit</button>
        <button class="btn btn-primary">View Details</button>
      </div>`;
    frag.appendChild(div);
  });
  grid.appendChild(frag);
}

async function renderPayments() {
  const tbody = byId('paymentsTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const snap = await getDocs(collection(db, COL_PAYMENTS));
  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#000">No payments</td></tr>`;
    return;
  }
  const frag = document.createDocumentFragment();
  snap.forEach(docSnap => {
    const p = docSnap.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id || docSnap.id}</td>
      <td>
        <div class="customer-info">
          <div class="customer-avatar"><img src="https://via.placeholder.com/32x32/4A90E2/FFFFFF?text=C" alt="Customer"></div>
          <div>
            <div class="customer-name">${p.customerName || ''}</div>
            <div class="customer-email">${p.customerEmail || ''}</div>
          </div>
        </div>
      </td>
      <td>${formatCurrency(p.amount)}</td>
      <td>${p.method || '-'}</td>
      <td><span class="status-badge ${badgeForStatus(p.status)}">${p.status || '-'}</span></td>
      <td>${formatDate(p.paidAt)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
          <button class="action-btn" title="Refund"><i class="fas fa-undo"></i></button>
        </div>
      </td>`;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

async function renderTickets() {
  const tbody = byId('ticketsTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const snap = await getDocs(collection(db, COL_TICKETS));
  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#000">No tickets</td></tr>`;
    return;
  }
  const frag = document.createDocumentFragment();
  snap.forEach(docSnap => {
    const t = docSnap.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.id || docSnap.id}</td>
      <td>
        <div class="customer-info">
          <div class="customer-avatar"><img src="https://via.placeholder.com/32x32/4A90E2/FFFFFF?text=T" alt="Customer"></div>
          <div>
            <div class="customer-name">${t.customerName || ''}</div>
            <div class="customer-email">${t.customerEmail || ''}</div>
          </div>
        </div>
      </td>
      <td>${t.subject || ''}</td>
      <td><span class="priority-badge ${priorityClass(t.priority)}">${t.priority || '-'}</span></td>
      <td><span class="status-badge ${badgeForStatus(t.status)}">${t.status || '-'}</span></td>
      <td>${t.assignedTo || '-'}</td>
      <td>${formatDate(t.createdAt)}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn" title="View"><i class="fas fa-eye"></i></button>
          <button class="action-btn" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="action-btn" title="Message"><i class="fas fa-comment"></i></button>
        </div>
      </td>`;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

async function renderMessagingStats() {
  const container = byId('messagingStats');
  if (!container) return;
  const snap = await getDocs(collection(db, COL_CAMPAIGNS));
  let email = 0, sms = 0, whatsapp = 0;
  snap.forEach(d => {
    const c = d.data();
    if (c.channel === 'email') email += c.count || 0;
    if (c.channel === 'sms') sms += c.count || 0;
    if (c.channel === 'whatsapp') whatsapp += c.count || 0;
  });
  container.innerHTML = `
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-envelope"></i></div><div class="stat-content"><h3>${email}</h3><p>Emails Sent</p></div></div>
    <div class="stat-card"><div class="stat-icon"><i class="fas fa-sms"></i></div><div class="stat-content"><h3>${sms}</h3><p>SMS Sent</p></div></div>
    <div class="stat-card"><div class="stat-icon"><i class="fab fa-whatsapp"></i></div><div class="stat-content"><h3>${whatsapp}</h3><p>WhatsApp Sent</p></div></div>`;
}

function setupMessagingForms() {
  document.querySelectorAll('#emailTab .message-form, #smsTab .message-form, #whatsappTab .message-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tabId = form.closest('.tab-panel').id;
      const channel = tabId === 'emailTab' ? 'email' : tabId === 'smsTab' ? 'sms' : 'whatsapp';
      const payload = serializeForm(form);
      await addDoc(collection(db, COL_CAMPAIGNS), {
        channel,
        payload,
        count: Array.isArray(payload.recipients) ? payload.recipients.length : 1,
        createdAt: serverTimestamp(),
      });
      toast('Campaign queued');
      renderMessagingStats();
    });
  });
}

function setupCrudHandlers(){
  const addBtn = document.getElementById('addCustomerBtn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const plans = await fetchPlans();
      openModal('Add Customer', customerFormTemplate({}, plans), async (data, form)=>{
        const file = form.querySelector('input[name="aadhaar"]')?.files?.[0];
        const payload = {
          name: data.name,
          email: data.email,
          plan: data.plan,
          status: data.status,
          lastPaymentAmount: Number(data.lastPaymentAmount||0),
          expiry: data.expiry ? new Date(data.expiry) : null,
          createdAt: serverTimestamp()
        };
        const ref = await addDoc(collection(db, COL_CUSTOMERS), payload);
        if (file) {
          const path = `customers/${ref.id}/aadhaar_${Date.now()}_${file.name}`;
          const sRef = storageRef(storage, path);
          await uploadBytes(sRef, file);
          const url = await getDownloadURL(sRef);
          await setDoc(ref, { aadhaarUrl: url, aadhaarPath: path }, { merge: true });
        }
        toast('Customer added');
        renderCustomers();
      });
    });
  }

  const custTbody = document.getElementById('customersTbody');
  if (custTbody) {
    custTbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const tr = btn.closest('tr');
      const id = tr?.dataset.id;
      if (!id) return;
      if (btn.dataset.action === 'delete-customer'){
        if (confirm('Delete this customer?')){
          await deleteDoc(doc(db, COL_CUSTOMERS, id));
          toast('Customer deleted');
          renderCustomers();
        }
      }
      if (btn.dataset.action === 'edit-customer'){
        const ref = doc(db, COL_CUSTOMERS, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const c = snap.data();
        const plans = await fetchPlans();
        openModal('Edit Customer', customerFormTemplate(c, plans), async (data, form)=>{
          const file = form.querySelector('input[name="aadhaar"]')?.files?.[0];
          const payload = {
            name: data.name,
            email: data.email,
            plan: data.plan,
            status: data.status,
            lastPaymentAmount: Number(data.lastPaymentAmount||0),
            expiry: data.expiry ? new Date(data.expiry) : null
          };
          await setDoc(ref, payload, { merge: true });
          if (file) {
            const path = `customers/${ref.id}/aadhaar_${Date.now()}_${file.name}`;
            const sRef = storageRef(storage, path);
            await uploadBytes(sRef, file);
            const url = await getDownloadURL(sRef);
            await setDoc(ref, { aadhaarUrl: url, aadhaarPath: path }, { merge: true });
          }
          toast('Customer updated');
          renderCustomers();
        });
      }
    });
  }

  const createPlanBtn = document.getElementById('createPlanBtn');
  if (createPlanBtn) {
    createPlanBtn.addEventListener('click', async () => {
      openModal('Create Plan', planFormTemplate(), async (data)=>{
        const payload = { name: data.name, price: Number(data.price||0), speed: data.speed, data: data.data, createdAt: serverTimestamp() };
        await addDoc(collection(db, COL_PLANS), payload);
        toast('Plan created');
        renderPlans();
      });
    });
  }

  const recordPaymentBtn = document.getElementById('recordPaymentBtn');
  if (recordPaymentBtn) {
    recordPaymentBtn.addEventListener('click', async () => {
      openModal('Record Payment', paymentFormTemplate({status:'Paid', method:'Card'}), async (data)=>{
        const payload = { customerName: data.customerName, amount: Number(data.amount||0), method: data.method, status: data.status, paidAt: serverTimestamp(), createdAt: serverTimestamp() };
        await addDoc(collection(db, COL_PAYMENTS), payload);
        toast('Payment recorded');
        renderPayments();
      });
    });
  }
}

async function fetchPlans(){
  const snap = await getDocs(collection(db, COL_PLANS));
  return snap.docs.map(d=>({ id: d.id, ...(d.data()||{}) }));
}

// Modal utilities and form builders
function openModal(title, innerHtml, onSubmit){
  const modal = byId('crudModal');
  if (!modal) return;
  byId('modalTitle').textContent = title;
  const form = byId('modalForm');
  form.innerHTML = innerHtml;
  const close = ()=> modal.style.display = 'none';
  byId('modalClose').onclick = close;
  byId('modalCancel').onclick = close;
  form.onsubmit = async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = validateRequired(form);
    if (errors) return;
    await onSubmit(data, form);
    close();
  };
  modal.style.display = 'block';
}

function setupSettingsHandlers(){
  const settingsBtn = document.querySelector('.settings-btn');
  if (!settingsBtn) return;
  const modal = byId('settingsModal');
  const form = byId('settingsForm');
  const close = ()=> modal.style.display = 'none';
  const open = ()=> {
    if (!modal) return;
    // prefill
    if (form){
      form.companyName.value = appSettings.companyName||'';
      form.supportEmail.value = appSettings.supportEmail||'';
      form.supportPhone.value = appSettings.supportPhone||'';
      form.currency.value = appSettings.currency||'INR';
      form.address.value = appSettings.address||'';
    }
    modal.style.display = 'block';
  };
  settingsBtn.addEventListener('click', open);
  byId('settingsClose')?.addEventListener('click', close);
  byId('settingsCancel')?.addEventListener('click', close);
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    await setDoc(doc(db, COL_SETTINGS, 'app'), data, { merge: true });
    appSettings = { ...appSettings, ...data };
    toast('Settings saved');
    close();
    // refresh currency displays
    renderPlans();
    renderPayments();
    renderCustomers();
    renderDashboard();
  });
}

async function loadSettings(){
  try{
    const snap = await getDoc(doc(db, COL_SETTINGS, 'app'));
    if (snap.exists()) {
      appSettings = { ...appSettings, ...(snap.data()||{}) };
    }
  } catch(e){
    console.warn('Settings load failed', e);
  }
}

function validateRequired(form){
  let hasError = false;
  form.querySelectorAll('[data-required]')?.forEach(el=>{
    const msgEl = el.parentElement.querySelector('.error-text') || document.createElement('div');
    msgEl.className = 'error-text';
    if (!el.value?.trim()){
      msgEl.textContent = 'This field is required';
      el.parentElement.appendChild(msgEl);
      hasError = true;
    } else {
      msgEl.textContent = '';
    }
  });
  return hasError;
}

function customerFormTemplate(values={}){
  return `
  <div class="form-row">
    <div class="field">
      <label>Name</label>
      <input name="name" value="${values.name||''}" data-required />
    </div>
    <div class="field">
      <label>Email</label>
      <input name="email" type="email" value="${values.email||''}" data-required />
    </div>
  </div>
  <div class="form-row">
    <div class="field">
      <label>Plan</label>
      <input name="plan" value="${values.plan||''}" data-required />
    </div>
    <div class="field">
      <label>Status</label>
      <select name="status" data-required>
        <option ${values.status==='Active'?'selected':''}>Active</option>
        <option ${values.status==='Inactive'?'selected':''}>Inactive</option>
      </select>
    </div>
  </div>
  <div class="form-row">
    <div class="field">
      <label>Expiry</label>
      <input name="expiry" type="date" value="${values.expiry? new Date(values.expiry.toDate?.()||values.expiry).toISOString().slice(0,10):''}" />
    </div>
    <div class="field">
      <label>Last Payment Amount</label>
      <input name="lastPaymentAmount" type="number" step="0.01" value="${values.lastPaymentAmount||''}" />
    </div>
  </div>`;
}

function planFormTemplate(values={}){
  return `
  <div class="form-row">
    <div class="field">
      <label>Name</label>
      <input name="name" value="${values.name||''}" data-required />
    </div>
    <div class="field">
      <label>Price (INR)</label>
      <input name="price" type="number" step="0.01" value="${values.price||''}" data-required />
    </div>
  </div>
  <div class="form-row">
    <div class="field">
      <label>Speed</label>
      <input name="speed" value="${values.speed||''}" data-required />
    </div>
    <div class="field">
      <label>Data</label>
      <input name="data" value="${values.data||'Unlimited'}" />
    </div>
  </div>`;
}

function paymentFormTemplate(values={}){
  return `
  <div class="form-row">
    <div class="field">
      <label>Customer Name</label>
      <input name="customerName" value="${values.customerName||''}" data-required />
    </div>
    <div class="field">
      <label>Amount</label>
      <input name="amount" type="number" step="0.01" value="${values.amount||''}" data-required />
    </div>
  </div>
  <div class="form-row">
    <div class="field">
      <label>Method</label>
      <select name="method" data-required>
        <option ${values.method==='Card'?'selected':''}>Card</option>
        <option ${values.method==='Cash'?'selected':''}>Cash</option>
        <option ${values.method==='UPI'?'selected':''}>UPI</option>
      </select>
    </div>
    <div class="field">
      <label>Status</label>
      <select name="status" data-required>
        <option ${values.status==='Paid'?'selected':''}>Paid</option>
        <option ${values.status==='Pending'?'selected':''}>Pending</option>
        <option ${values.status==='Failed'?'selected':''}>Failed</option>
      </select>
    </div>
  </div>`;
}

async function scheduleExpiryReminders() {
  // Find customers whose expiry is in 10 days
  const snap = await getDocs(collection(db, COL_CUSTOMERS));
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10);
  let count = 0;
  for (const d of snap.docs) {
    const c = d.data();
    const expiry = toDate(c.expiry);
    if (!expiry) continue;
    if (isSameDay(expiry, target)) {
      await addDoc(collection(db, COL_REMINDERS), {
        customerId: d.id,
        name: c.name || '',
        channel: 'all',
        scheduledFor: expiry,
        createdAt: serverTimestamp(),
        type: 'plan-expiry-10d'
      });
      count++;
    }
  }
  if (count) toast(`${count} reminders scheduled for customers expiring in 10 days`);
}

// Helpers
function byId(id){ return document.getElementById(id); }
function setText(id, text){ const el = byId(id); if (el) el.textContent = text; }
function formatNumber(n){ return (n||0).toLocaleString(); }
function formatCurrency(n){
  const num = Number(n||0);
  const currency = appSettings?.currency || 'INR';
  try {
    return num.toLocaleString(undefined,{style:'currency',currency});
  } catch (e) {
    return `₹${num.toLocaleString()}`;
  }
}
function toDate(v){ if (!v) return null; return v.toDate?.() || new Date(v); }
function formatDate(v){ const d = toDate(v); return d ? d.toLocaleDateString() : '-'; }
function formatTime(v){ const d = toDate(v); return d ? d.toLocaleString() : ''; }
function isInCurrentMonth(date){ const d = date instanceof Date ? date : new Date(date); const n = new Date(); return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear(); }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function badgeForStatus(s){ if(!s) return ''; const m=s.toLowerCase(); if(m==='paid'||m==='active') return 'active'; if(m==='pending') return 'pending'; if(m==='failed') return 'failed'; if(m==='refunded') return 'refunded'; if(m==='in progress') return 'in-progress'; if(m==='resolved') return 'resolved'; if(m==='closed') return 'closed'; return ''; }
function priorityClass(p){ if(!p) return 'low'; const m=p.toLowerCase(); if(m==='high') return 'high'; if(m==='medium') return 'medium'; if(m==='critical') return 'critical'; return 'low'; }
function serializeForm(form){
  const data = new FormData(form);
  const obj = {};
  data.forEach((v,k)=>{
    if (obj[k]) { obj[k] = Array.isArray(obj[k]) ? [...obj[k], v] : [obj[k], v]; }
    else obj[k]=v;
  });
  return obj;
}
function toast(msg){
  const n = document.createElement('div');
  n.textContent = msg;
  n.style.cssText = 'position:fixed;top:20px;right:20px;background:#06b6d4;color:#fff;padding:12px 16px;border-radius:8px;z-index:10000;box-shadow:0 6px 20px rgba(0,0,0,0.15)';
  document.body.appendChild(n);
  setTimeout(()=>n.remove(),3000);
}

// Loading helpers
function hideLoadingScreen(){
  const loading = document.getElementById('loadingScreen');
  if (!loading) return;
  loading.classList.add('hidden');
  setTimeout(()=>{ loading.style.display='none'; }, 500);
}
function showApp(){
  const app = document.getElementById('app');
  if (app) app.style.visibility = 'visible';
}


