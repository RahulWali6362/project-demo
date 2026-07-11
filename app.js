/* ============ Northstar HR — app logic ============ */

const STORAGE_KEY = 'northstar_hrms_v1';

const DEPT_COLORS = ['#2F8F7B','#DB9A34','#5B7FDB','#C15C64','#8B6BC9'];

function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

function seedData(){
  const depts = ['Engineering','Design','Sales','People Ops','Finance'];
  const names = [
    ['Ananya Rao','Frontend Engineer'],['Vikram Shah','Backend Engineer'],
    ['Meera Iyer','Product Designer'],['Rohan Kapoor','Sales Executive'],
    ['Priya Nair','HR Generalist'],['Aditya Verma','Finance Analyst'],
    ['Sneha Joshi','UX Researcher'],['Karan Mehta','Account Manager'],
    ['Divya Menon','Engineering Manager'],['Farhan Ali','Recruiter']
  ];
  const employees = names.map((n,i)=>({
    id: uid('emp'),
    name: n[0],
    role: n[1],
    dept: depts[i % depts.length],
    status: 'active',
    joined: `202${3+(i%3)}-0${(i%9)+1}-1${i%2===0?4:8}`
  }));

  const attStatuses = ['present','present','present','late','absent','present','leave','present','present','late'];
  const attendance = {};
  const today = todayISO();
  attendance[today] = employees.map((e,i)=>({
    empId: e.id, status: attStatuses[i % attStatuses.length],
    checkIn: attStatuses[i%attStatuses.length]==='present' ? `0${8+(i%2)}:${(i*7)%60<10?'0':''}${(i*7)%60}` :
             attStatuses[i%attStatuses.length]==='late' ? `10:1${i%9}` : '—'
  }));

  const leaveTypes = ['Casual','Sick','Earned','WFH'];
  const leave = [
    { id: uid('lv'), empId: employees[2].id, type:'Sick', from:addDays(today,1), to:addDays(today,3), reason:'Fever and rest advised by doctor', status:'pending' },
    { id: uid('lv'), empId: employees[5].id, type:'Casual', from:addDays(today,4), to:addDays(today,4), reason:'Family function', status:'pending' },
    { id: uid('lv'), empId: employees[7].id, type:'Earned', from:addDays(today,-3), to:addDays(today,-1), reason:'Pre-planned travel', status:'approved' },
  ];

  const activity = [
    { text:`<b>Priya Nair</b> approved Farhan Ali's WFH request`, time:'Yesterday, 5:40 PM' },
    { text:`<b>Divya Menon</b> marked attendance for the Engineering team`, time:'Yesterday, 9:12 AM' },
    { text:`<b>Karan Mehta</b> submitted a new leave request`, time:'2 days ago' },
  ];

  return { employees, attendance, leave, activity };
}

function todayISO(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function addDays(iso, n){
  const d = new Date(iso);
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}
function prettyDate(iso){
  return new Date(iso+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}

/* ---------- State ---------- */
let state = load();

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ /* fall through to seed */ }
  const seeded = seedData();
  save(seeded);
  return seeded;
}
function save(s = state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/* ---------- Navigation ---------- */
document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-' + btn.dataset.view).classList.add('active');
  });
});

/* ---------- Toast ---------- */
let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2400);
}

/* ---------- Modal ---------- */
const backdrop = document.getElementById('modalBackdrop');
const modalEl = document.getElementById('modal');
function openModal(html){
  modalEl.innerHTML = html;
  backdrop.classList.add('open');
}
function closeModal(){
  backdrop.classList.remove('open');
  modalEl.innerHTML = '';
}
backdrop.addEventListener('click', e=>{ if(e.target===backdrop) closeModal(); });

/* ============ RENDER: Dashboard ============ */
function renderDashboard(){
  document.getElementById('todayLabel').textContent = prettyDate(todayISO());

  const emps = state.employees;
  const todayAtt = state.attendance[todayISO()] || [];
  const statusOf = id => (todayAtt.find(a=>a.empId===id) || {}).status || 'absent';

  const counts = { present:0, late:0, absent:0, leave:0 };
  emps.forEach(e => counts[statusOf(e.id)]++ );

  document.getElementById('statHeadcount').textContent = emps.length;
  document.getElementById('statPresent').textContent = counts.present + counts.late;
  const pct = emps.length ? Math.round(((counts.present+counts.late)/emps.length)*100) : 0;
  document.getElementById('statPresentPct').textContent = pct + '% of headcount';
  document.getElementById('statPendingLeave').textContent = state.leave.filter(l=>l.status==='pending').length;
  document.getElementById('statOnLeave').textContent = counts.leave;

  renderRing(counts, emps.length);
  renderActivity();
  renderDeptPulse();
}

function renderRing(counts, total){
  const svg = document.getElementById('attendanceRing');
  const legend = document.getElementById('ringLegend');
  const segments = [
    { key:'present', label:'Present', color:'#2F8F7B', val:counts.present },
    { key:'late', label:'Late', color:'#DB9A34', val:counts.late },
    { key:'absent', label:'Absent', color:'#C15C64', val:counts.absent },
    { key:'leave', label:'On leave', color:'#5B5F8D', val:counts.leave },
  ];
  const R = 50, C = 2*Math.PI*R, cx=60, cy=60;
  let offset = 0;
  let circles = '';
  segments.forEach(s=>{
    const frac = total ? s.val/total : 0;
    const len = frac * C;
    circles += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${s.color}" stroke-width="14"
      stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += len;
  });
  svg.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#EEF0F4" stroke-width="14"/>${circles}
    <text x="${cx}" y="${cy-2}" text-anchor="middle" font-family="Space Grotesk" font-size="20" font-weight="700" fill="#16213A">${total}</text>
    <text x="${cx}" y="${cy+16}" text-anchor="middle" font-family="Inter" font-size="9" fill="#6B7385">people</text>`;

  legend.innerHTML = segments.map(s=>`
    <li><span class="swatch" style="background:${s.color}"></span>${s.label}<span class="lg-val">${s.val}</span></li>
  `).join('');
}

function renderActivity(){
  const feed = document.getElementById('activityFeed');
  feed.innerHTML = state.activity.map(a=>`
    <li><span class="dot"></span><div class="act-text">${a.text}<span class="act-time">${a.time}</span></div></li>
  `).join('') || `<li>No recent activity.</li>`;
}

function renderDeptPulse(){
  const el = document.getElementById('deptPulse');
  const depts = {};
  state.employees.forEach(e=>{ depts[e.dept] = (depts[e.dept]||0) + 1; });
  const max = Math.max(...Object.values(depts), 1);
  const entries = Object.entries(depts);
  el.innerHTML = entries.map(([name,count],i)=>`
    <div class="dept-row">
      <div class="dr-top"><span>${name}</span><span>${count}</span></div>
      <div class="dept-bar"><span style="width:${(count/max)*100}%;background:${DEPT_COLORS[i%DEPT_COLORS.length]}"></span></div>
    </div>
  `).join('');
}

/* ============ RENDER: Employees ============ */
function populateDeptFilter(){
  const sel = document.getElementById('filterDept');
  const depts = [...new Set(state.employees.map(e=>e.dept))];
  sel.innerHTML = `<option value="">All departments</option>` + depts.map(d=>`<option value="${d}">${d}</option>`).join('');
}

function renderEmployees(){
  const tbody = document.getElementById('employeeTable');
  const q = document.getElementById('searchEmployee').value.trim().toLowerCase();
  const deptFilter = document.getElementById('filterDept').value;

  let rows = state.employees.filter(e=>{
    const matchesQ = !q || e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q);
    const matchesDept = !deptFilter || e.dept === deptFilter;
    return matchesQ && matchesDept;
  });

  tbody.innerHTML = rows.length ? rows.map(e=>`
    <tr>
      <td><span class="emp-name">${e.name}</span><span class="emp-sub">${e.id}</span></td>
      <td>${e.role}</td>
      <td>${e.dept}</td>
      <td><span class="badge ${e.status}">${cap(e.status)}</span></td>
      <td class="mono">${prettyDate(e.joined)}</td>
      <td><div class="row-actions">
        <button class="icon-btn" data-action="remove-emp" data-id="${e.id}" title="Remove">
          <svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      </div></td>
    </tr>
  `).join('') : `<tr class="empty-row"><td colspan="6">No employees match your search.</td></tr>`;
}
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

document.getElementById('searchEmployee').addEventListener('input', renderEmployees);
document.getElementById('filterDept').addEventListener('change', renderEmployees);

document.getElementById('employeeTable').addEventListener('click', e=>{
  const btn = e.target.closest('[data-action="remove-emp"]');
  if(!btn) return;
  const id = btn.dataset.id;
  state.employees = state.employees.filter(x=>x.id!==id);
  Object.values(state.attendance).forEach(list=>{
    const idx = list.findIndex(a=>a.empId===id);
    if(idx>-1) list.splice(idx,1);
  });
  state.leave = state.leave.filter(l=>l.empId!==id);
  save();
  renderAll();
  showToast('Employee removed.');
});

document.getElementById('btnAddEmployee').addEventListener('click', ()=>{
  openModal(`
    <h3>Add employee</h3>
    <p class="m-sub">They'll appear on the roster immediately.</p>
    <form id="empForm">
      <div class="field"><label>Full name</label><input required name="name" placeholder="e.g. Ishaan Kapoor"></div>
      <div class="field"><label>Role</label><input required name="role" placeholder="e.g. Backend Engineer"></div>
      <div class="field"><label>Department</label>
        <select name="dept" required>
          <option>Engineering</option><option>Design</option><option>Sales</option>
          <option>People Ops</option><option>Finance</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" id="cancelEmp">Cancel</button>
        <button type="submit" class="btn-primary">Add employee</button>
      </div>
    </form>
  `);
  document.getElementById('cancelEmp').addEventListener('click', closeModal);
  document.getElementById('empForm').addEventListener('submit', ev=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const emp = {
      id: uid('emp'), name: fd.get('name'), role: fd.get('role'), dept: fd.get('dept'),
      status:'active', joined: todayISO()
    };
    state.employees.push(emp);
    const today = todayISO();
    if(!state.attendance[today]) state.attendance[today] = [];
    state.attendance[today].push({ empId: emp.id, status:'present', checkIn:'09:00' });
    save();
    closeModal();
    renderAll();
    showToast(`${emp.name} added to the roster.`);
  });
});

/* ============ RENDER: Attendance ============ */
function renderAttendance(){
  document.getElementById('attendanceDateChip').textContent = prettyDate(todayISO());
  const today = todayISO();
  if(!state.attendance[today]){
    state.attendance[today] = state.employees.map(e=>({empId:e.id, status:'present', checkIn:'09:00'}));
    save();
  }
  const tbody = document.getElementById('attendanceTable');
  const list = state.attendance[today];

  tbody.innerHTML = state.employees.map(e=>{
    const rec = list.find(a=>a.empId===e.id) || {status:'absent', checkIn:'—'};
    return `
      <tr>
        <td><span class="emp-name">${e.name}</span></td>
        <td>${e.dept}</td>
        <td>
          <select class="status-select" data-id="${e.id}">
            ${['present','late','absent','leave'].map(s=>`<option value="${s}" ${rec.status===s?'selected':''}>${cap(s)}</option>`).join('')}
          </select>
        </td>
        <td class="mono">${rec.checkIn || '—'}</td>
      </tr>`;
  }).join('');
}

document.getElementById('attendanceTable').addEventListener('change', e=>{
  const sel = e.target.closest('.status-select');
  if(!sel) return;
  const today = todayISO();
  const rec = state.attendance[today].find(a=>a.empId===sel.dataset.id);
  rec.status = sel.value;
  rec.checkIn = sel.value==='present' ? '09:00' : sel.value==='late' ? '10:15' : '—';
  save();
  renderDashboard();
  showToast('Attendance updated.');
});

/* ============ RENDER: Leave ============ */
function renderLeave(){
  const tbody = document.getElementById('leaveTable');
  const empName = id => (state.employees.find(e=>e.id===id) || {}).name || 'Unknown';

  tbody.innerHTML = state.leave.length ? state.leave.map(l=>`
    <tr>
      <td><span class="emp-name">${empName(l.empId)}</span></td>
      <td>${l.type}</td>
      <td class="mono">${prettyDate(l.from)}${l.from!==l.to ? ' – '+prettyDate(l.to) : ''}</td>
      <td>${l.reason}</td>
      <td><span class="badge ${l.status}">${cap(l.status)}</span></td>
      <td>
        ${l.status==='pending' ? `
          <div class="row-actions">
            <button class="link-btn" data-action="approve" data-id="${l.id}">Approve</button>
            <button class="link-btn reject" data-action="reject" data-id="${l.id}">Reject</button>
          </div>` : ''}
      </td>
    </tr>
  `).join('') : `<tr class="empty-row"><td colspan="6">No leave requests yet.</td></tr>`;
}

document.getElementById('leaveTable').addEventListener('click', e=>{
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const rec = state.leave.find(l=>l.id===btn.dataset.id);
  rec.status = btn.dataset.action === 'approve' ? 'approved' : 'rejected';
  save();
  renderLeave();
  renderDashboard();
  showToast(`Request ${rec.status}.`);
});

document.getElementById('btnAddLeave').addEventListener('click', ()=>{
  const options = state.employees.map(e=>`<option value="${e.id}">${e.name}</option>`).join('');
  openModal(`
    <h3>New leave request</h3>
    <p class="m-sub">Submit on behalf of an employee.</p>
    <form id="leaveForm">
      <div class="field"><label>Employee</label><select name="empId" required>${options}</select></div>
      <div class="field"><label>Type</label>
        <select name="type" required>
          <option>Casual</option><option>Sick</option><option>Earned</option><option>WFH</option>
        </select>
      </div>
      <div class="field"><label>From</label><input type="date" name="from" required value="${todayISO()}"></div>
      <div class="field"><label>To</label><input type="date" name="to" required value="${todayISO()}"></div>
      <div class="field"><label>Reason</label><textarea name="reason" placeholder="Brief reason…" required></textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn-ghost" id="cancelLeave">Cancel</button>
        <button type="submit" class="btn-primary">Submit request</button>
      </div>
    </form>
  `);
  document.getElementById('cancelLeave').addEventListener('click', closeModal);
  document.getElementById('leaveForm').addEventListener('submit', ev=>{
    ev.preventDefault();
    const fd = new FormData(ev.target);
    state.leave.unshift({
      id: uid('lv'), empId: fd.get('empId'), type: fd.get('type'),
      from: fd.get('from'), to: fd.get('to'), reason: fd.get('reason'), status:'pending'
    });
    save();
    closeModal();
    renderLeave();
    renderDashboard();
    showToast('Leave request submitted.');
  });
});

/* ============ Init ============ */
function renderAll(){
  populateDeptFilter();
  renderDashboard();
  renderEmployees();
  renderAttendance();
  renderLeave();
}
renderAll();
