
// لغة
let lang = localStorage.getItem('lang') || 'ar';
function applyLang(){
  const rtl = (lang==='ar');
  document.documentElement.lang = rtl ? 'ar':'fr';
  document.documentElement.dir  = rtl ? 'rtl':'ltr';
  const btn = document.getElementById('langBtn');
  if(btn) btn.textContent = rtl ? 'Français' : 'العربية';

  // ترجمة بسيطة للصفحات
  const map = {
    'index': {
      ar:{t1:'مرحبًا بك 👋',t2:'أدخل اسم المستخدم وكلمة المرور للولوج إلى منصتك. يمكنك استعمال هذه الواجهة للتجربة (محفوظة محليًا).',t3:'تسجيل الدخول',luser:'اسم المستخدم',lpass:'كلمة المرور',btnlogin:'دخول'},
      fr:{t1:'Bienvenue 👋',t2:"Entrez votre nom d'utilisateur et mot de passe. Cette interface est une démo (stockage local).",t3:'Connexion',luser:"Nom d'utilisateur",lpass:'Mot de passe',btnlogin:'Se connecter'}
    },
    'teacher': {
      ar:{h:'معلومات الأستاذ',lfn:'الاسم',lln:'اللقب',lsp:'التخصص',lsch:'المدرسة',saveBtn:'حفظ'},
      fr:{h:"Infos de l'enseignant",lfn:'Prénom',lln:'Nom',lsp:'Spécialité',lsch:'École',saveBtn:'Enregistrer'}
    },
    'students': {
      ar:{sh:'إدارة التلاميذ',sn:'اسم التلميذ',sp:'اسم الولي',sa:'العنوان',sb:'مكان الازدياد',sd:'تاريخ الازدياد',st:'نوع التوحد/المرض',sr:'ملاحظات',addBtn:'إضافة',listTitle:'قائمة التلاميذ',
          thn:'الاسم',thp:'الولي',tha:'العنوان',thb:'مكان/تاريخ الازدياد',tht:'النوع',thx:'ملاحظات'},
      fr:{sh:'Gestion des élèves',sn:"Nom de l'élève",sp:'Parent',sa:'Adresse',sb:'Lieu de naissance',sd:'Date de naissance',st:'Type',sr:'Notes',addBtn:'Ajouter',listTitle:'Liste des élèves',
          thn:'Nom',thp:'Parent',tha:'Adresse',thb:'Lieu/Date',tht:'Type',thx:'Notes'}
    }
  };
  const page = location.pathname.split('/').pop().split('.').shift() || 'index';
  const t = map[page]?.[lang];
  if(t){
    Object.entries(t).forEach(([k,v])=>{
      const el = document.getElementById(k);
      if(el) el.textContent = v;
      const lbl = document.getElementById('l'+k);
      if(lbl) lbl.textContent = v;
    });
  }
}
function toggleLang(){ lang = (lang==='ar'?'fr':'ar'); localStorage.setItem('lang',lang); applyLang(); }

// تسجيل دخول تجريبي
function login(){
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  if(!u || !p){ alert(lang==='ar'?'يرجى إدخال البيانات':'Veuillez remplir les champs'); return; }
  localStorage.setItem('auth', JSON.stringify({u}));
  const info = document.getElementById('loginInfo'); if(info){ info.style.display='inline-block'; }
  setTimeout(()=> location.href='teacher.html', 600);
}

// حفظ بيانات الأستاذ
function saveTeacher(){
  const firstName = document.getElementById('firstName').value;
  const lastName  = document.getElementById('lastName').value;
  const speciality= document.getElementById('speciality').value;
  const school    = document.getElementById('school').value;
  localStorage.setItem('teacher', JSON.stringify({firstName,lastName,speciality,school}));
  const b = document.getElementById('savedBadge'); if(b){ b.style.display='inline-block'; setTimeout(()=>b.style.display='none',2000); }
  renderPreview();
}
function renderPreview(){
  const box = document.getElementById('preview'); if(!box) return;
  const t = JSON.parse(localStorage.getItem('teacher')||'{}');
  box.innerHTML = `
    <div class="card" style="background:#f9fff7;border-color:#d1fae5">
      <div><strong>${t.firstName||'-'} ${t.lastName||''}</strong></div>
      <div>${t.speciality||'-'} — ${t.school||'-'}</div>
    </div>`;
}

// إدارة التلاميذ
function loadStudents(){ return JSON.parse(localStorage.getItem('students')||'[]'); }
function saveStudents(arr){ localStorage.setItem('students', JSON.stringify(arr)); }
function addStudent(){
  const s = {
    name: val('sName'),
    parent: val('parentName'),
    address: val('address'),
    birthPlace: val('birthPlace'),
    birthDate: val('birthDate'),
    type: val('type'),
    notes: val('notes')
  };
  if(!s.name){ alert(lang==='ar'?'أدخل اسم التلميذ':'Entrez le nom'); return; }
  const list = loadStudents(); list.push(s); saveStudents(list); renderStudents();
  ['sName','parentName','address','birthPlace','birthDate','type','notes'].forEach(id=>document.getElementById(id).value='');
}
function val(id){ const el=document.getElementById(id); return el?el.value.trim():''; }
function renderStudents(){
  const tbody = document.querySelector('#studentsTable tbody'); if(!tbody) return;
  const list = loadStudents(); tbody.innerHTML='';
  list.forEach((s,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${s.name}</td>
      <td>${s.parent||''}</td>
      <td>${s.address||''}</td>
      <td>${s.birthPlace||''} ${s.birthDate?'— '+s.birthDate:''}</td>
      <td>${s.type||''}</td>
      <td>${s.notes||''}</td>
      <td class="row-actions">
        <button class="btn secondary" onclick="editStudent(${i})">${lang==='ar'?'تعديل':'Éditer'}</button>
        <button class="btn danger" onclick="deleteStudent(${i})">${lang==='ar'?'حذف':'Supprimer'}</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
function deleteStudent(i){ const list=loadStudents(); list.splice(i,1); saveStudents(list); renderStudents(); }
function editStudent(i){
  const list = loadStudents(); const s = list[i];
  if(!s) return;
  const name = prompt(lang==='ar'?'اسم التلميذ':'Nom', s.name);
  if(name===null) return;
  s.name = name;
  list[i]=s; saveStudents(list); renderStudents();
}

// تصدير CSV
function downloadCSV(){
  const list = loadStudents(); if(!list.length){ alert(lang==='ar'?'لا توجد بيانات':'Aucune donnée'); return; }
  const header = ['name','parent','address','birthPlace','birthDate','type','notes'];
  const rows = [header.join(',')].concat(list.map(s=>header.map(k=>(s[k]||'').toString().replace(/,/g,';')).join(',')));
  const blob = new Blob([rows.join('\\n')], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='students.csv'; a.click();
}

// طباعة PDF (باستخدام نافذة الطباعة)
function printPDF(){ window.print(); }

// init
document.addEventListener('DOMContentLoaded', ()=>{
  applyLang(); renderPreview(); renderStudents();
});
