/* ================================================================
   1. SUPABASE CONFIG & REALTIME
================================================================ */
const SUPABASE_URL = 'https://ddqiiybuaozsjlrnckfz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rzftsvyC9ahQTXW-Pq4BsA_EOTSY5kP';

// تشغيل التحديث اللحظي (عشان لو حد من الجروب خلص، تظهرلك فوراً)
let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    supabaseClient.channel('public:members')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, payload => {
            if (AppState.myGroupCode) {
                renderLeaderboard(); // تحديث القائمة فوراً
            }
        }).subscribe();
}

async function sbFetch(path, opts={}) {
    try {
        // تجهيز الإعدادات بدون ما نمسح الـ Headers الأساسية
        const fetchOptions = { ...opts };
        fetchOptions.headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': opts.prefer || 'return=representation',
            ...(opts.headers || {}) // دمج أي هيدرز إضافية هنا بأمان
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, fetchOptions);
        if(!res.ok) throw new Error(await res.text());
        
        const txt = await res.text(); 
        return txt ? JSON.parse(txt) : [];
    } catch(e) { 
        throw e; 
    }
}

/* ================================================================
   2. STATE MANAGEMENT
================================================================ */
const AppState = {
    today: new Date().toDateString(),
    streak: parseInt(localStorage.getItem("streak")) || 0,
    points: parseFloat(localStorage.getItem("points")) || 0, // 👈 عداد النقاط
    tasbeehForPoints: parseInt(localStorage.getItem("tasbeehForPoints")) || 0, // 👈 عداد الـ 50 تسبيحة
    completedToday: false,
    currentMode: [], currentModeName: '', currentIndex: 0, currentCount: 0, xp: 0, combo: 0, halfwayShown: false,
    freeCounter: 0,
    kahfIndex: parseInt(localStorage.getItem("kahfIndex") || "0"),
    myGroupCode: localStorage.getItem("myGroupCode") || null,
    myName: localStorage.getItem("myName") || null,
    myUserId: localStorage.getItem("myUserId") || ('u' + Math.random().toString(36).substr(2,8)),
    notifEnabled: localStorage.getItem("notifEnabled") === "true",
    notifInterval: null,
    currentQuote: quotes[Math.floor(Math.random() * quotes.length)],
    shareContext: 'quote'
};
/* ================================================================
   3. DOM CACHING
================================================================ */
const DOM = {
    sadaqaScroll: document.getElementById("sadaqaScroll"), 
    duaGrid: document.getElementById("duaGrid"),
    card: document.getElementById("card"), 
    sections: ['card', 'tasbeehArea', 'kahfArea', 'groupArea', 'finish'].map(id => document.getElementById(id)),
    quote: document.getElementById("quote"), 
    streakBadge: document.getElementById("streak"), 
    streakWarning: document.getElementById("streakWarning"),
    speech: document.getElementById("speech"), 
    inlineSpeech: document.getElementById("inlineSpeech"),
    xp: document.getElementById("xp"), 
    combo: document.getElementById("combo"),
    zekrTitle: document.getElementById("zekrTitle"), 
    zekrText: document.getElementById("zekrText"), 
    zekrFadl: document.getElementById("zekrFadl"),
    repeat: document.getElementById("repeat"), 
    counter: document.getElementById("counter"), 
    progress: document.getElementById("progress"),
    btnMorning: document.getElementById("btnMorning"), 
    btnEvening: document.getElementById("btnEvening"), 
    btnQuick: document.getElementById("btnQuick"),
    btnTasbeehMode: document.getElementById("btnTasbeehMode"), 
    btnKahfMode: document.getElementById("btnKahfMode"), 
    btnGroupMode: document.getElementById("btnGroupMode"),
    btnCountZekr: document.getElementById("btnCountZekr"), 
    btnBacks: document.querySelectorAll('.btn-close-section'),
    shareModal: document.getElementById("shareModal"), 
    celebOverlay: document.getElementById("celebOverlay"), 
    celebTitle: document.getElementById("celebTitle"), 
    celebMsg: document.getElementById("celebMsg")
};

/* ================================================================
   4. INIT & EVENTS
================================================================ */
document.addEventListener("DOMContentLoaded", () => {
    initStreak();
    renderDynamicLists();
    bindEvents();
    DOM.quote.innerText = AppState.currentQuote;
    if(AppState.notifEnabled) startNotifLoop();
    
    // 👈 السطرين دول هما اللي بيجيبوا بيانات الجروب ويعرضوها في الهوم أوتوماتيك
    if (AppState.myGroupCode) {
        renderLeaderboard();
    }
});

function renderDynamicLists() {
    let sadaqaHtml = '';
    sadaqaList.forEach(p => { sadaqaHtml += `<div class="sadaqa-card"><div class="icon">🕊️</div><div class="name">${p.name}</div><div class="role">${p.role}</div></div>`; });
    DOM.sadaqaScroll.innerHTML = sadaqaHtml;

    let duaHtml = '';
    duaList.forEach(d => { duaHtml += `<div class="dua-card" data-duatype="${d.id}"><div class="dua-name">${d.name}</div></div>`; });
    DOM.duaGrid.innerHTML = duaHtml;

    document.querySelectorAll('.dua-card').forEach(c => c.addEventListener('click', (e) => openDua(e.currentTarget.getAttribute('data-duatype'))));
}

function bindEvents() {
    DOM.btnMorning.addEventListener("click", () => startMode('morning'));
    DOM.btnEvening.addEventListener("click", () => startMode('evening'));
    DOM.btnQuick.addEventListener("click", () => startMode('quick'));
    DOM.btnTasbeehMode.addEventListener("click", openTasbeeh);
    DOM.btnKahfMode.addEventListener("click", openKahf);
    DOM.btnGroupMode.addEventListener("click", openGroup);
    DOM.btnCountZekr.addEventListener("click", countZekr);
    DOM.btnBacks.forEach(btn => btn.addEventListener("click", closeSection));

    document.getElementById("btnCloseShare").addEventListener("click", closeShareModal);
    document.getElementById("btnCloseCelebration").addEventListener("click", closeCelebration);
    
    document.getElementById("quoteBox").addEventListener("click", () => openShareModal('quote'));
    document.getElementById("btnShareSadaqa").addEventListener("click", () => openShareModal('sadaqa'));
    document.getElementById("btnShareFinish").addEventListener("click", () => openShareModal('finish'));
    document.getElementById("btnShareGroup").addEventListener("click", () => openShareModal('group'));
    
    document.querySelectorAll('.share-platform-btn').forEach(btn => btn.addEventListener("click", (e) => doShare(e.currentTarget.getAttribute('data-platform'))));
    document.querySelectorAll('.alert-close').forEach(btn => btn.addEventListener('click', (e) => e.target.parentElement.classList.remove('show')));

    // Mascot Interaction
    document.getElementById("mascotBtn").addEventListener("click", () => {
        navigator.vibrate?.(30);
        setSpeech(motiv[Math.floor(Math.random() * motiv.length)]);
    });
}

function hideAll() { DOM.sections.forEach(s => s.style.display = 'none'); document.body.className = ''; }
function closeSection() { hideAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function setSpeech(t) { DOM.speech.innerText = t; DOM.inlineSpeech.innerText = t; }
function goTo(id) { setTimeout(() => document.getElementById(id).scrollIntoView({ behavior: "smooth" }), 80); }

function showMiniToast(msg) {
    let t = document.getElementById("miniToast");
    if (!t) { t = document.createElement("div"); t.id = "miniToast"; t.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#10b981;color:white;padding:12px 20px;border-radius:50px;font-size:13px;font-weight:800;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.4);opacity:0;transition:.3s;text-align:center;`; document.body.appendChild(t); }
    t.innerText = msg; t.style.opacity = '1'; setTimeout(() => t.style.opacity = '0', 3000);
}

/* ================================================================
   5. STREAK ENGINE
================================================================ */
function initStreak() {
    let storedLast = localStorage.getItem("lastVisit");
    if (storedLast !== AppState.today) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        if (storedLast === y.toDateString()) AppState.streak++; else AppState.streak = 1;
        localStorage.setItem("lastVisit", AppState.today); localStorage.setItem("streak", AppState.streak);
    }
    DOM.streakBadge.innerText = AppState.streak;
    if (!AppState.completedToday && new Date().getHours() >= 18) DOM.streakWarning.style.display = "block";
}

/* ================================================================
   6. ZEKR ENGINE
================================================================ */
function startMode(mode) {
    hideAll(); AppState.currentModeName = mode;
    if (mode === 'morning') { document.body.classList.add("morning-theme"); setSpeech("صباح الأذكار ☀️"); }
    if (mode === 'evening') { document.body.classList.add("evening-theme"); setSpeech("سكينة المساء 🌙"); }
    if (mode === 'quick')   { document.body.classList.add("quick-theme"); setSpeech("ورد بسيط ✨"); }
    DOM.card.style.display = "block";
    AppState.currentMode = data[mode]; AppState.currentIndex = 0; AppState.currentCount = 0; AppState.xp = 0; AppState.combo = 0; AppState.halfwayShown = false;
    loadZekr(); goTo("card");
}

function loadZekr() {
    const item = AppState.currentMode[AppState.currentIndex];
    DOM.zekrTitle.innerText = item.title; DOM.zekrText.innerText = item.text;
    if (item.fadl) { DOM.zekrFadl.innerText = "✦ " + item.fadl; DOM.zekrFadl.style.display = 'block'; } else DOM.zekrFadl.style.display = 'none';
    DOM.repeat.innerText = item.repeat; DOM.counter.innerText = `${AppState.currentCount}/${item.repeat}`;
    DOM.progress.style.width = (AppState.currentIndex / AppState.currentMode.length * 100) + "%";
}

function countZekr() {
    navigator.vibrate?.(35);
    const item = AppState.currentMode[AppState.currentIndex];
    AppState.currentCount++; AppState.xp += 5; AppState.combo++;
    DOM.xp.innerText = AppState.xp; DOM.combo.innerText = AppState.combo; DOM.counter.innerText = `${AppState.currentCount}/${item.repeat}`;
    setSpeech(motiv[Math.floor(Math.random() * motiv.length)]);

    if (AppState.currentCount >= item.repeat) {
        AppState.currentIndex++; AppState.currentCount = 0;
        if (AppState.currentIndex >= AppState.currentMode.length) finishZekr();
        else loadZekr();
    }
}

function finishZekr() {
    if(AppState.currentModeName !== 'dua') {
        localStorage.setItem("completedToday", AppState.today); 
        AppState.completedToday = true;
        DOM.streakWarning.style.display = "none";
        
        // حساب النقاط الجديدة
        let pointsAdded = 0;
        const modeKey = `done_${AppState.currentModeName}_${AppState.today}`;
        
        // الحماية: مش هيحسب نقاط للورد لو اتعمل قبل كده النهارده
        if (!localStorage.getItem(modeKey)) {
            if (AppState.currentModeName === 'morning') pointsAdded = 1;
            else if (AppState.currentModeName === 'evening') pointsAdded = 1;
            else if (AppState.currentModeName === 'quick') pointsAdded = 0.5;
            
            if (pointsAdded > 0) {
                AppState.points += pointsAdded;
                localStorage.setItem("points", AppState.points);
                localStorage.setItem(modeKey, "true"); // تسجيل إن الورد ده خلص النهارده
            }
        }
        updateMyGroupStreak(); // تحديث السيرفر
    }
    DOM.card.style.display = "none"; document.getElementById("finish").style.display = "block";
    let cel = AppState.currentModeName==='dua' ? 'تقبل الله دعاءك 🤲' : 'أشطر كتكوت خلص ورده! 🏆';
    setTimeout(() => showCelebration('ممتاز!', cel), 300);
}
function openDua(type) {
    const duaListForType = duas[type]; 
    if (!duaListForType || duaListForType.length === 0) return;
    
    hideAll(); 
    DOM.card.style.display = "block";
    AppState.currentModeName = 'dua'; 
    
    // تحويل مصفوفة الأدعية لتتناسب مع الكروت زي أذكار الصباح بالظبط
    AppState.currentMode = duaListForType.map((dua, index) => {
        return {
            title: `🤲 دعاء (${index + 1} / ${duaListForType.length})`, 
            text: dua.text, 
            fadl: dua.ref, 
            repeat: dua.repeat || 1
        };
    });
    
    AppState.currentIndex = 0; 
    AppState.currentCount = 0; 
    AppState.xp = 0; 
    AppState.combo = 0;
    
    loadZekr(); 
    goTo("card");
}
/* ================================================================
   7. TASBEEH & KAHF
================================================================ */
function openTasbeeh() {
    hideAll(); document.getElementById("tasbeehArea").style.display = "block"; setSpeech("سبح براحتك 🤍");
    AppState.freeCounter = 0; document.getElementById("freeCounter").innerText = 0;
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(`tasbeeh_${AppState.today}_`));
    const total = allKeys.reduce((s,k) => s + (parseInt(localStorage.getItem(k))||0), 0);
    document.getElementById("tasbeehTodayCount").innerText = `تسبيحاتك اليوم: ${total}`; goTo("tasbeehArea");
   document.getElementById("tasbeehDateLabel").innerText = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
}

document.getElementById("btnIncreaseTasbeeh").addEventListener("click", () => {
    navigator.vibrate?.(30); 
    AppState.freeCounter++; 
    document.getElementById("freeCounter").innerText = AppState.freeCounter;
    const key = `tasbeeh_${AppState.today}_${document.getElementById("tasbeehSelect").value}`;
    localStorage.setItem(key, (parseInt(localStorage.getItem(key)||0)+1).toString());

    // 👈 نظام نقاط التسبيح: كل 50 تسبيحة = 1 نقطة
    AppState.tasbeehForPoints++;
    if (AppState.tasbeehForPoints >= 50) {
        AppState.points += 1;
        AppState.tasbeehForPoints = 0; // تصفير العداد الفرعي
        localStorage.setItem("points", AppState.points);
        updateMyGroupStreak(); // رفع النقطة الجديدة للجروب
        showMiniToast("🌟 كفو! تمت إضافة نقطة لترتيبك في الجروب");
    }
    localStorage.setItem("tasbeehForPoints", AppState.tasbeehForPoints);
});
// تصفير العداد عند تغيير نوع التسبيح من القائمة
document.getElementById("tasbeehSelect").addEventListener("change", () => {
    AppState.freeCounter = 0; 
    document.getElementById("freeCounter").innerText = 0;
    
    // تحديث إجمالي اليوم للذكر الجديد اللي تم اختياره
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(`tasbeeh_${AppState.today}_`));
    const total = allKeys.reduce((s,k) => s + (parseInt(localStorage.getItem(k))||0), 0);
    document.getElementById("tasbeehTodayCount").innerText = `تسبيحاتك اليوم: ${total}`;
});
document.getElementById("btnResetTasbeeh").addEventListener("click", () => { AppState.freeCounter=0; document.getElementById("freeCounter").innerText=0; });

function openKahf() { hideAll(); document.body.classList.add("kahf-theme"); document.getElementById("kahfArea").style.display="block"; renderKahf(); goTo("kahfArea"); }
function renderKahf() {
    const done = AppState.kahfIndex >= kahfAyat.length;
    document.getElementById("kahfText").style.display = done ? 'none' : 'flex';
    document.querySelector(".kahf-nav").style.display = done ? 'none' : 'grid';
    document.getElementById("kahfDone").style.display = done ? 'block' : 'none';
    if(!done) {
        const a = kahfAyat[AppState.kahfIndex];
        document.getElementById("kahfText").innerHTML = `<div style="width:100%;"><div style="font-size:12px;color:#6ee7b7;margin-bottom:12px;">﴿ ${a.n} ﴾</div><div style="font-size:20px;line-height:2.5;">${a.t}</div></div>`;
        document.getElementById("kahfBadge").innerText = `${AppState.kahfIndex+1} / ${kahfAyat.length}`;
        document.getElementById("kahfProgress").style.width = Math.round((AppState.kahfIndex+1)/kahfAyat.length*100) + "%";
    }
}
document.getElementById("btnKahfNext").addEventListener("click", () => { if(AppState.kahfIndex < kahfAyat.length) { AppState.kahfIndex++; localStorage.setItem("kahfIndex", AppState.kahfIndex); renderKahf(); } });
document.getElementById("btnKahfPrev").addEventListener("click", () => { if(AppState.kahfIndex > 0) { AppState.kahfIndex--; localStorage.setItem("kahfIndex", AppState.kahfIndex); renderKahf(); } });
document.getElementById("btnRestartKahf").addEventListener("click", () => { AppState.kahfIndex = 0; localStorage.setItem("kahfIndex","0"); renderKahf(); });

/* ================================================================
   8. GROUP LOGIC (أونلاين 100%)
================================================================ */
async function updateMyGroupStreak() {
    if(!AppState.myGroupCode) return;
    try { 
        await sbFetch(`members?group_code=eq.${AppState.myGroupCode}&user_id=eq.${AppState.myUserId}`, { 
            method: 'PATCH', 
            // بنبعت النقاط والاستريك سوا للسيرفر
            body: JSON.stringify({ streak: AppState.streak, done_today: AppState.completedToday, points: AppState.points }) 
        }); 
    } catch(e) { console.warn("تعذر تحديث السيرفر"); }
}

function openGroup() { 
    hideAll(); 
    document.getElementById("groupArea").style.display = "block"; 
    if(AppState.myGroupCode) showLeaderboard(); 
    else document.getElementById("groupSetup").style.display = "block"; 
    goTo("groupArea"); 
}

document.getElementById("btnShowJoin").addEventListener("click", () => document.getElementById("joinRow").style.display = "block");

function setGroupStatus(msg, color='#f472b6') {
    document.getElementById("groupStatus").style.color = color;
    document.getElementById("groupStatus").innerText = msg;
}

function getWeekStart() {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); 
    return d.toISOString().split('T')[0];
}

async function createGroup() {
    const name = document.getElementById("nameInput").value.trim(); 
    if(!name) return showMiniToast("اكتب اسمك الأول 😊");
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGroupStatus("⏳ جاري الإنشاء أونلاين...", "#fcd34d");

    try {
        await sbFetch('groups', { method: 'POST', body: JSON.stringify({ code: code, name: name + "'s Group", week_start: getWeekStart() }) });
        await sbFetch('members', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ group_code: code, user_id: AppState.myUserId, name: name, streak: AppState.streak, done_today: AppState.completedToday, points: AppState.points }) });

        AppState.myGroupCode = code; AppState.myName = name; 
        localStorage.setItem("myGroupCode", code); localStorage.setItem("myName", name);
        showLeaderboard(); showMiniToast(`✅ الجروب اتعمل! كوده: ${code}`);
    } catch (e) {
        showMiniToast(`⚠️ مشكلة في الاتصال بالانترنت!`);
        setGroupStatus("");
    }
}

async function joinGroup() {
    const name = document.getElementById("nameInput").value.trim();
    const code = document.getElementById("codeInput").value.trim();
    
    if(!name || code.length !== 6) return showMiniToast("تأكد من الاسم والكود");
    setGroupStatus("⏳ جاري الانضمام أونلاين...", "#fcd34d");

    try {
        const groups = await sbFetch(`groups?code=eq.${code}&select=code`);
        if(!groups.length) { setGroupStatus("❌ الكود ده مش موجود، تأكد منه", '#ef4444'); return; }

        await sbFetch('members', { method: 'POST', headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ group_code: code, user_id: AppState.myUserId, name: name, streak: AppState.streak, done_today: AppState.completedToday, points: AppState.points }) });

        AppState.myGroupCode = code; AppState.myName = name; 
        localStorage.setItem("myGroupCode", code); localStorage.setItem("myName", name);
        showLeaderboard(); showMiniToast("✅ انضممت أونلاين بنجاح!");
    } catch (e) {
        showMiniToast("⚠️ مشكلة في الاتصال بالانترنت!");
        setGroupStatus("");
    }
}

document.getElementById("btnCreateGroup").addEventListener("click", createGroup); 
document.getElementById("btnJoinGroup").addEventListener("click", joinGroup);

function showLeaderboard() { 
    document.getElementById("groupSetup").style.display = "none"; 
    document.getElementById("leaderboard").style.display = "block"; 
    document.getElementById("groupCodeDisplay").innerText = `📋 ${AppState.myGroupCode}`; 
    renderLeaderboard(); 
}

async function renderLeaderboard() {
    const ranks = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    document.getElementById("lbRows").innerHTML = '<div style="text-align:center; color:#94a3b8; padding: 10px;">⏳ جاري التحميل من السيرفر...</div>';
    
    let arr = [];
    try {
        // ترتيب المتصدرين بناءً على النقاط (points) بدلاً من الاستريك
        arr = await sbFetch(`members?group_code=eq.${AppState.myGroupCode}&order=points.desc&limit=10`);
    } catch (e) {
        document.getElementById("lbRows").innerHTML = '<div style="text-align:center; color:#ef4444; padding: 10px;">⚠️ مشكلة في الاتصال بالسيرفر.</div>';
        return;
    }

    let html = ''; 
    arr.forEach((m, i) => { 
        const isMe = m.user_id === AppState.myUserId;
        html += `<div class="lb-row ${isMe ? 'me' : ''}">
                    <div class="lb-rank">${ranks[i] || '👤'}</div>
                    <div class="lb-name">${m.name} ${isMe ? '(أنا)' : ''}</div>
                    <div class="lb-streak" style="color:#fcd34d;">⭐ ${m.points || 0}</div>
                    <div class="lb-streak" style="font-size:11px; margin-right:6px; opacity:0.7;">🔥 ${m.streak || 0}</div>
                    <div class="lb-done">${m.done_today ? '✅' : '⏳'}</div>
                 </div>`; 
    });
    
    document.getElementById("lbRows").innerHTML = html || '<div style="text-align:center; color:#94a3b8;">ابعت الكود لأصحابك عشان ينضموا! 🌿</div>';
    renderHomeLB(arr);
}

function renderHomeLB(arr) {
    if(!arr || !arr.length){ document.getElementById("homeLB").style.display="none"; return; }
    document.getElementById("homeLB").style.display="block";
    const ranks=['🥇','🥈','🥉','4️⃣','5️⃣'];
    let html='';
    arr.slice(0,5).forEach((m,i) => {
        const isMe = m.user_id === AppState.myUserId;
        html += `<div class="home-lb-row ${isMe ? 'me' : ''}">
                    <div class="home-lb-rank">${ranks[i]}</div>
                    <div class="home-lb-name">${m.name}${isMe ? ' 👈' : ''}</div>
                    <div class="home-lb-streak" style="color:#fcd34d;">⭐ ${m.points || 0}</div>
                    <div class="home-lb-streak" style="font-size:10px; margin-right:5px; opacity:0.7;">🔥 ${m.streak || 0}</div>
                    <div class="home-lb-done">${m.done_today ? '✅' : '⏳'}</div>
                 </div>`;
    });
    document.getElementById("homeLBRows").innerHTML = html;
}

document.getElementById("btnLeaveGroup").addEventListener("click", () => { 
    localStorage.removeItem("myGroupCode"); localStorage.removeItem("myName");
    AppState.myGroupCode = null; AppState.myName = null;
    document.getElementById("leaderboard").style.display = "none"; 
    document.getElementById("groupSetup").style.display = "block"; 
    document.getElementById("homeLB").style.display = "none";
});

document.getElementById("groupCodeDisplay").addEventListener("click", () => {
    navigator.clipboard?.writeText(AppState.myGroupCode).then(()=>showMiniToast("✅ الكود اتنسخ!"));
});
/* ================================================================
   9. SHARE & CELEBRATION (المشاركة)
================================================================ */
function getShareText(ctx){
    if(ctx==='quote') return `✨ حصنك اليومي ✨\n\n"${AppState.currentQuote}"\n\n📲 ${APP_URL}`;
    if(ctx==='sadaqa') return `🤍 صدقة جارية على أرواح خالد آدم وعمرو خالد ومحمود فوزي وغيرهم 🤍\n\nشارك معايا تطبيق حصنك اليومي للأذكار 🌿\n\n📲 ${APP_URL}\n\nكل ما حد بيستخدمه بيجي الأجر عليهم وعليك ✨`;
    if(ctx==='finish') return `🏆 خلصت وردي اليومي في حصنك اليومي!\n🔥 الاستريك: ${AppState.streak} يوم\n\n📲 ${APP_URL} 🤍`;
    if(ctx==='kahf') return `📖 أتممت سورة الكهف كاملة النهارده 🌟\n\nسورة الكهف نور بين الجمعتين ✨\n\n📲 ${APP_URL}`;
    if(ctx==='group') return `🏆 يا جماعة! انضموا لتحدي الأذكار معايا!\n\nكود الجروب: ${AppState.myGroupCode||'------'}\n\n📲 ${APP_URL}\nاضغط "تحدي الجروب" وادخل الكود 🌿`;
    return `✨ حصنك اليومي\n📲 ${APP_URL}`;
}

function openShareModal(ctx) { AppState.shareContext = ctx; DOM.shareModal.classList.add("show"); }
function closeShareModal() { DOM.shareModal.classList.remove("show"); }

function doShare(platform) { 
    const txt = getShareText(AppState.shareContext);
    const enc = encodeURIComponent(txt);
    const urls = {
        whatsapp:`https://wa.me/?text=${enc}`,
        facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}&quote=${enc}`,
        twitter:`https://twitter.com/intent/tweet?text=${enc}`
    };

    if(platform==='copy'){ navigator.clipboard?.writeText(txt).then(() => showMiniToast("تم النسخ!")); closeShareModal(); return; }
    if(platform==='instagram'){ navigator.clipboard?.writeText(txt).then(() => showMiniToast("النص اتنسخ، افتح انستجرام والصقه!")); closeShareModal(); return; }
    if(platform==='native'){
        if(navigator.share) navigator.share({title:'حصنك اليومي', text:txt, url:APP_URL}).catch(()=>{});
        else navigator.clipboard?.writeText(txt).then(()=>showMiniToast("تم النسخ!"));
        closeShareModal(); return;
    }
    
    window.open(urls[platform], '_blank');
    closeShareModal(); 
}

function showCelebration(title, msg) { DOM.celebTitle.innerText = title; DOM.celebMsg.innerText = msg; DOM.celebOverlay.classList.add("show"); }
function closeCelebration() { DOM.celebOverlay.classList.remove("show"); }

/* ================================================================
   10. NOTIFICATIONS
================================================================ */
document.getElementById("notifToggle").addEventListener("click", () => {
    AppState.notifEnabled = !AppState.notifEnabled; 
    localStorage.setItem("notifEnabled", AppState.notifEnabled);
    document.getElementById("notifToggle").classList.toggle("on", AppState.notifEnabled);
    document.getElementById("notifStatus").innerText = AppState.notifEnabled ? "شغال" : "إيقاف";
    
    if (AppState.notifEnabled) {
        if (!("Notification" in window)) return showMiniToast("المتصفح لا يدعم الإشعارات");
        Notification.requestPermission().then(perm => {
            if (perm === "granted") startNotifLoop();
        });
    } else {
        if(AppState.notifInterval) clearInterval(AppState.notifInterval);
    }
});

function startNotifLoop() {
    if(AppState.notifInterval) clearInterval(AppState.notifInterval);
    AppState.notifInterval = setInterval(() => {
        if(!AppState.notifEnabled || Notification.permission !== "granted") return;
        const now = new Date(), h = now.getHours(), m = now.getMinutes(), d = now.getDay();
        if(m !== 0) return; 
        
        if(h === 8) new Notification("🌅 صباح الأذكار!",{body:"ابدأ يومك بذكر الله يا بطل 🌿", icon:"/icons/icon-192x192.png"});
        if(h === 17) new Notification("🌙 أذكار المساء!",{body:"اختم يومك بذكر الله وتنام محصن 🤍", icon:"/icons/icon-192x192.png"});
        if(d === 5 && h === 14) new Notification("📖 سورة الكهف!",{body:"سورة الكهف نور بين الجمعتين ✨", icon:"/icons/icon-192x192.png"});
    }, 60000);
}

/* ================================================================
   11. PWA & INSTALLATION
================================================================ */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { 
    e.preventDefault(); 
    deferredPrompt = e; 
    document.getElementById('installBtn').style.display = 'block'; 
});

document.getElementById('installBtn').addEventListener('click', async () => { 
    if (!deferredPrompt) {
        // لو المستخدم آيفون أو المتصفح مش داعم، نعرضله رسالة
        showMiniToast("على الآيفون: اضغط زر المشاركة بالأسفل ⍗ ثم Add to Home Screen 📱");
        return;
    } 
    deferredPrompt.prompt(); 
    const { outcome } = await deferredPrompt.userChoice; 
    if (outcome === 'accepted') document.getElementById('installBtn').style.display = 'none'; 
    deferredPrompt = null; 
});

window.addEventListener('appinstalled', () => document.getElementById('installBtn').style.display = 'none');
