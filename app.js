/* ================================================================
   1. SUPABASE CONFIG & LOGIC
================================================================ */
const SUPABASE_URL = 'https://ddqiiybuaozsjlrnckfz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rzftsvyC9ahQTXW-Pq4BsA_EOTSY5kP';
const APP_URL = window.location.href;

async function sbFetch(path, opts={}) {
    const fetchOptions = { ...opts, headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': opts.prefer || 'return=representation', ...(opts.headers || {}) } };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, fetchOptions);
    if(!res.ok) throw new Error(await res.text());
    const txt = await res.text(); return txt ? JSON.parse(txt) : [];
}

/* ================================================================
   2. STATE & UI MANAGEMENT
================================================================ */
const AppState = {
    today: new Date().toDateString(),
    streak: parseInt(localStorage.getItem("streak")) || 0,
    points: parseFloat(localStorage.getItem("points")) || 0,
    completedToday: localStorage.getItem("completedToday") === new Date().toDateString(),
    myGroupCode: localStorage.getItem("myGroupCode") || null,
    myName: localStorage.getItem("myName") || null,
    myUserId: localStorage.getItem("myUserId") || ('u' + Math.random().toString(36).substr(2,8)),
    currentMode: [], currentIndex: 0, currentCount: 0, kahfIndex: 0, freeCounter: 0
};
localStorage.setItem("myUserId", AppState.myUserId);

function showMiniToast(msg) {
    const t = document.getElementById("miniToast");
    t.innerText = msg; t.style.opacity = '1'; t.style.transform = 'translate(-50%, 10px)';
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translate(-50%, 0)'; }, 3000);
}

// UI Controllers for the new Glassmorphism Modals
function openModal(id) { 
    closeAllModals(); 
    document.getElementById(id).classList.add('open'); 
}
function closeAllModals() {
    ['duasModal', 'tasbeehModal', 'communityModal', 'zekrModal', 'kahfModal'].forEach(id => {
        document.getElementById(id).classList.remove('open');
    });
    document.getElementById('dhikrSheet').classList.remove('open');
    document.getElementById('dhikrSheetBg').classList.remove('open');
}

/* ================================================================
   3. INIT & RENDER
================================================================ */
document.addEventListener("DOMContentLoaded", () => {
    initStreak();
    renderDynamicLists();
    bindEvents();
    if (AppState.myGroupCode) showLeaderboard();
});

function initStreak() {
    let storedLast = localStorage.getItem("lastVisit");
    if (storedLast !== AppState.today) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        if (storedLast === y.toDateString()) AppState.streak++; else AppState.streak = 1;
        localStorage.setItem("lastVisit", AppState.today); localStorage.setItem("streak", AppState.streak);
    }
    document.getElementById("streakBadge").innerText = `🔥 ${AppState.streak}`;
}

function renderDynamicLists() {
    // Render Sadaqa
    let sadaqaHtml = '';
    sadaqaList.forEach(p => { 
        sadaqaHtml += `<div class="glass-card rounded-2xl p-4 flex flex-col items-center text-center space-y-2">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><span class="material-symbols-outlined">favorite</span></div>
            <div class="flex flex-col"><span class="font-headline-md text-on-surface text-[13px]">${p.name}</span><span class="text-[10px] text-on-surface-variant">${p.role}</span></div>
        </div>`; 
    });
    document.getElementById("sadaqaScroll").innerHTML = sadaqaHtml;

    // Render Duas
    let duaHtml = '';
    duaList.forEach(d => { 
        duaHtml += `<div class="glass-card rounded-2xl p-4 flex items-center justify-center text-center glow-border cursor-pointer active:scale-95 transition-all" onclick="openDua('${d.id}')">
            <span class="font-headline-md text-on-surface text-sm">${d.name}</span>
        </div>`; 
    });
    document.getElementById("duaGrid").innerHTML = duaHtml;
}

function bindEvents() {
    document.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', closeAllModals));
    
    // Bottom Sheet Logic
    document.getElementById('btnOpenDhikr').addEventListener('click', () => {
        document.getElementById('dhikrSheetBg').classList.add('open');
        document.getElementById('dhikrSheet').classList.add('open');
    });
    document.getElementById('btnCloseDhikr').addEventListener('click', closeAllModals);
    document.getElementById('dhikrSheetBg').addEventListener('click', closeAllModals);

    // Zekr actions
    document.getElementById('btnCloseZekr').addEventListener('click', closeAllModals);
    document.getElementById('btnCountZekr').addEventListener('click', countZekr);

    // Free Tasbeeh
    document.getElementById('btnIncreaseTasbeeh').addEventListener('click', () => {
        navigator.vibrate?.(30); AppState.freeCounter++; 
        document.getElementById('freeCounterLabel').innerText = AppState.freeCounter;
        if(AppState.freeCounter % 50 === 0) {
            AppState.points += 1; localStorage.setItem("points", AppState.points);
            updateMyGroupStreak(); showMiniToast("🌟 كفو! تمت إضافة نقطة لترتيبك في الجروب");
        }
    });
    document.getElementById('btnResetTasbeeh').addEventListener('click', () => { AppState.freeCounter=0; document.getElementById('freeCounterLabel').innerText='0'; });

    // Group Actions
    document.getElementById('btnShowJoin').addEventListener('click', () => { document.getElementById('joinRow').classList.remove('hidden'); });
    document.getElementById('btnCreateGroup').addEventListener('click', createGroup);
    document.getElementById('btnJoinGroup').addEventListener('click', joinGroup);
    document.getElementById('btnLeaveGroup').addEventListener('click', () => {
        localStorage.removeItem("myGroupCode"); localStorage.removeItem("myName");
        AppState.myGroupCode = null; AppState.myName = null;
        document.getElementById("leaderboardView").classList.add("hidden"); 
        document.getElementById("groupSetup").classList.remove("hidden");
        document.getElementById("homeLBRows").innerHTML = "";
    });

    // Share
    document.getElementById('btnShareHome').addEventListener('click', () => {
        const txt = `✨ حصنك اليومي\nشارك معايا تطبيق الأذكار والصدقة الجارية 🌿\n\n📲 ${APP_URL}`;
        if(navigator.share) navigator.share({title:'حصنك اليومي', text:txt, url:APP_URL}).catch(()=>{});
        else navigator.clipboard?.writeText(txt).then(()=>showMiniToast("تم النسخ!"));
    });
}

/* ================================================================
   4. ZEKR & DUAS ENGINE
================================================================ */
function startMode(mode) {
    closeAllModals(); AppState.currentMode = data[mode] || []; 
    AppState.currentIndex = 0; AppState.currentCount = 0; 
    if(AppState.currentMode.length > 0) { loadZekr(); openModal('zekrModal'); }
}

function openDua(type) {
    const list = duas[type]; if (!list || list.length === 0) return;
    closeAllModals(); 
    AppState.currentMode = list.map((d, i) => ({ title: `🤲 دعاء (${i + 1} / ${list.length})`, text: d.text, fadl: d.ref, repeat: d.repeat || 1 }));
    AppState.currentIndex = 0; AppState.currentCount = 0;
    loadZekr(); openModal('zekrModal');
}

function loadZekr() {
    const item = AppState.currentMode[AppState.currentIndex];
    document.getElementById('zekrTitle').innerText = item.title; 
    document.getElementById('zekrText').innerText = item.text;
    if (item.fadl) { document.getElementById('zekrFadl').innerText = item.fadl; document.getElementById('zekrFadl').classList.remove('hidden'); } 
    else document.getElementById('zekrFadl').classList.add('hidden');
    document.getElementById('counter').innerText = `${AppState.currentCount}/${item.repeat}`;
    
    const total = AppState.currentMode.length;
    document.getElementById('progress').style.width = ((AppState.currentIndex / total) * 100) + "%";
}

function countZekr() {
    if (!AppState.currentMode.length) return; 
    navigator.vibrate?.(35);
    const item = AppState.currentMode[AppState.currentIndex];
    AppState.currentCount++; 
    document.getElementById('counter').innerText = `${AppState.currentCount}/${item.repeat}`;
    
    const total = AppState.currentMode.length;
    const currentFrac = (AppState.currentCount / item.repeat) * (100 / total);
    document.getElementById('progress').style.width = (((AppState.currentIndex / total) * 100) + currentFrac) + "%";

    if (AppState.currentCount >= item.repeat) {
        AppState.currentIndex++; AppState.currentCount = 0;
        if (AppState.currentIndex >= AppState.currentMode.length) finishZekr();
        else setTimeout(loadZekr, 200);
    }
}

function finishZekr() {
    closeAllModals(); showMiniToast("تقبل الله منك 🤲");
    if (!AppState.completedToday) {
        localStorage.setItem("completedToday", AppState.today); AppState.completedToday = true;
        AppState.points += 1; localStorage.setItem("points", AppState.points);
        updateMyGroupStreak();
    }
}

// Kahf Logic
function openKahf() {
    closeAllModals(); AppState.kahfIndex = 0; renderKahf(); openModal('kahfModal');
}
function renderKahf() {
    if(AppState.kahfIndex >= kahfAyat.length) { closeAllModals(); showMiniToast("تمت القراءة تقبل الله ✨"); return; }
    const a = kahfAyat[AppState.kahfIndex];
    document.getElementById('kahfText').innerHTML = `<span class="text-primary text-sm block mb-2">﴿ ${a.n} ﴾</span>${a.t}`;
    document.getElementById('kahfBadge').innerText = `${AppState.kahfIndex+1} / ${kahfAyat.length}`;
}
document.getElementById('btnKahfNext').addEventListener('click', () => { AppState.kahfIndex++; renderKahf(); });
document.getElementById('btnKahfPrev').addEventListener('click', () => { if(AppState.kahfIndex>0) AppState.kahfIndex--; renderKahf(); });

/* ================================================================
   5. GROUP & SUPABASE
================================================================ */
async function updateMyGroupStreak() {
    if(!AppState.myGroupCode) return;
    try { await sbFetch(`members?group_code=eq.${AppState.myGroupCode}&user_id=eq.${AppState.myUserId}`, { method: 'PATCH', body: JSON.stringify({ streak: AppState.streak, done_today: AppState.completedToday, points: AppState.points }) }); } catch(e){}
}

async function createGroup() {
    const name = document.getElementById("nameInput").value.trim(); if(!name) return showMiniToast("اكتب اسمك الأول 😊");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await sbFetch('groups', { method: 'POST', body: JSON.stringify({ code: code, name: name + "'s Group", week_start: new Date().toISOString().split('T')[0] }) });
        await sbFetch('members', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ group_code: code, user_id: AppState.myUserId, name: name, streak: AppState.streak, done_today: AppState.completedToday, points: AppState.points }) });
        AppState.myGroupCode = code; AppState.myName = name; localStorage.setItem("myGroupCode", code); localStorage.setItem("myName", name);
        showLeaderboard(); showMiniToast(`✅ الجروب اتعمل!`);
    } catch (e) { showMiniToast(`⚠️ مشكلة في الاتصال`); }
}

async function joinGroup() {
    const name = document.getElementById("nameInput").value.trim(); const code = document.getElementById("codeInput").value.trim();
    if(!name || code.length !== 6) return showMiniToast("تأكد من الاسم والكود");
    try {
        const groups = await sbFetch(`groups?code=eq.${code}&select=code`);
        if(!groups.length) return showMiniToast("❌ الكود مش موجود");
        await sbFetch('members', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ group_code: code, user_id: AppState.myUserId, name: name, streak: AppState.streak, done_today: AppState.completedToday, points: AppState.points }) });
        AppState.myGroupCode = code; AppState.myName = name; localStorage.setItem("myGroupCode", code); localStorage.setItem("myName", name);
        showLeaderboard(); showMiniToast("✅ انضممت بنجاح!");
    } catch (e) { showMiniToast("⚠️ مشكلة في الاتصال!"); }
}

function showLeaderboard() { 
    document.getElementById("groupSetup").classList.add("hidden"); 
    document.getElementById("leaderboardView").classList.remove("hidden"); 
    document.getElementById("groupCodeDisplay").innerText = AppState.myGroupCode; 
    fetchLeaderboard(); 
}

async function fetchLeaderboard() {
    try {
        const arr = await sbFetch(`members?group_code=eq.${AppState.myGroupCode}&order=points.desc&limit=10`);
        let html = '';
        arr.forEach((m, i) => { 
            html += `<div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 mb-2">
                <div class="flex items-center gap-3"><span class="${i<3?'text-primary font-bold':'text-on-surface-variant'} w-4">${i+1}</span><span class="font-bold">${m.name}</span></div>
                <span class="text-primary font-bold">⭐ ${m.points||0}</span>
            </div>`; 
        });
        document.getElementById("lbRows").innerHTML = html;
        document.getElementById("homeLBRows").innerHTML = html; // Sync Home screen
    } catch (e) {}
}

/* ================================================================
   6. PWA INSTALL
================================================================ */
const installBtn = document.getElementById('installBtn');
let deferredPrompt = null;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (!isStandalone) installBtn.style.display = 'flex';
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.style.display = 'flex'; });
installBtn.addEventListener('click', async () => { 
    if (!deferredPrompt) return showMiniToast("📱 الآيفون: اضغط زر المشاركة ثم 'Add to Home Screen'");
    deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; 
    if (outcome === 'accepted') installBtn.style.display = 'none'; deferredPrompt = null; 
});
window.addEventListener('appinstalled', () => { installBtn.style.display = 'none'; showMiniToast("✅ تم تنزيل التطبيق!"); });

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js'); });
}