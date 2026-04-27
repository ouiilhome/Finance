// ============================================
// ⚡ CONFIG
// ============================================
const API = "https://script.google.com/macros/s/AKfycbyYJKNw5abw1L6IEaD-fejQCia8KPHycJobDbIiWbcuwt1txuLQ27AdSWgk0ThX7erQ/exec";
const APP_PASSWORD = "Azabdev@1662001"; 

// ============================================
// DATA STORE
// ============================================
let TXN = [];
let DEBTS = [];
let accFilter = 'all';
let txnFilter = 'all';
let debtFilter = 'all';
let isPrivate = false;
let expAcc = 'all';
let expPeriod = 'all';
let chartDonut = null;
let chartBars = null;
let isLoading = false;
let SESSION_PASS = '';

// ============================================
// 🔒 LOGIN SYSTEM
// ============================================
function handleLogin(e) {
    e.preventDefault();
    const pass = document.getElementById('loginPass').value;
    const remember = document.getElementById('rememberMe').checked;
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    const input = document.getElementById('loginPass');

    if (!pass) {
        errEl.textContent = 'أدخل كلمة المرور';
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 500);
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
    errEl.textContent = '';

    // التحقق من السيرفر
    fetch(API + '?action=verifyPassword&pass=' + encodeURIComponent(pass))
        .then(res => res.text())
        .then(text => {
            let data;
            try { data = JSON.parse(text); } catch(e) { throw new Error('خطأ في الاتصال'); }

            if (data.success) {
                SESSION_PASS = pass;

                if (remember) {
                    localStorage.setItem('mw_auth', btoa(pass));
                } else {
                    sessionStorage.setItem('mw_auth', btoa(pass));
                }

                showApp();
                toast('تم تسجيل الدخول بنجاح ✅');
            } else {
                errEl.textContent = '❌ كلمة المرور غير صحيحة';
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 500);
                input.value = '';
                input.focus();
            }
        })
        .catch(err => {
            console.error(err);
            // لو مفيش اتصال، جرب أوفلاين
            if (pass === APP_PASSWORD) {
                SESSION_PASS = pass;
                localStorage.setItem('mw_auth', btoa(pass));
                showApp();
                toast('تم الدخول (وضع أوفلاين)', 'info');
            } else {
                errEl.textContent = '❌ خطأ في الاتصال أو كلمة المرور غلط';
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 500);
            }
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> دخول';
        });
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').classList.add('visible');
    document.getElementById('bottomNav').classList.add('visible');
    setGreeting();
    loadLocal();
    if (TXN.length > 0 || DEBTS.length > 0) renderAll();
    loadData();
}

function handleLogout() {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;

    SESSION_PASS = '';
    localStorage.removeItem('mw_auth');
    sessionStorage.removeItem('mw_auth');

    document.getElementById('mainApp').classList.remove('visible');
    document.getElementById('bottomNav').classList.remove('visible');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').textContent = '';
    document.getElementById('logoutMenu').classList.remove('show');

    toast('تم تسجيل الخروج', 'info');
}

function checkSavedLogin() {
    let saved = localStorage.getItem('mw_auth') || sessionStorage.getItem('mw_auth');
    if (saved) {
        try {
            SESSION_PASS = atob(saved);
            showApp();
            return true;
        } catch(e) {
            localStorage.removeItem('mw_auth');
            sessionStorage.removeItem('mw_auth');
        }
    }
    return false;
}

function toggleLogoutMenu() {
    document.getElementById('logoutMenu').classList.toggle('show');
}

// أقفل المنيو لو ضغط في أي مكان تاني
document.addEventListener('click', function(e) {
    const menu = document.getElementById('logoutMenu');
    const avatar = document.querySelector('.avatar');
    if (menu && !menu.contains(e.target) && e.target !== avatar && !avatar.contains(e.target)) {
        menu.classList.remove('show');
    }
});

// ============================================
// CONNECTION STATUS
// ============================================
function showConnStatus(msg, type) {
    const el = document.getElementById('connStatus');
    el.textContent = msg;
    el.className = 'conn-status ' + type;
    setTimeout(() => el.classList.add('hidden'), 3000);
}

// ============================================
// GREETING
// ============================================
function setGreeting() {
    const h = new Date().getHours();
    let g = 'مساء الخير 🌙';
    if (h >= 5 && h < 12) g = 'صباح الخير ☀️';
    else if (h >= 12 && h < 17) g = 'مساء الخير 🌤️';
    document.getElementById('greetText').textContent = g;
}

// ============================================
// NAVIGATION
// ============================================
function goTo(scrId, navIdx) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(scrId).classList.add('active');
    if (navIdx !== undefined) {
        document.querySelectorAll('.nav-btn:not(.fab-btn)').forEach(b => b.classList.remove('active'));
        const nb = document.getElementById('nav' + navIdx);
        if (nb) nb.classList.add('active');
    }
    if (scrId === 'scrReports') buildCharts();
    window.scrollTo(0, 0);
}

// ============================================
// MODAL
// ============================================
function openModal(id) {
    document.getElementById(id).classList.add('open');
    if (id === 'modalTxn') updateCats();
}
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-bg').forEach(m => {
    m.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('open');
    });
});

// ============================================
// TOAST
// ============================================
function toast(msg, type = 'ok') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast-msg ' + type + ' show';
    setTimeout(() => t.className = 'toast-msg', 3000);
}

// ============================================
// FORMAT MONEY
// ============================================
function fmt(n) {
    if (isNaN(n) || n === null) return '0 EGP';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' EGP';
}

// ============================================
// PRIVACY MODE
// ============================================
const HIDE = '• • • •';

function togglePrivacy() {
    isPrivate = !isPrivate;
    const btn = document.getElementById('privBtn');
    if (isPrivate) {
        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        btn.classList.add('privacy-on');
        toast('تم تفعيل وضع الخصوصية 🔒', 'info');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        btn.classList.remove('privacy-on');
        toast('تم إلغاء وضع الخصوصية 👁️', 'info');
    }
    renderAll();
}

function pv(amount) {
    if (isPrivate) return '<span class="hidden-amount">' + HIDE + '</span>';
    return fmt(amount);
}

// ============================================
// CATEGORIES
// ============================================
function updateCats() {
    const type = document.getElementById('txnType').value;
    const sel = document.getElementById('txnCat');
    sel.innerHTML = '';
    let opts = [];
    if (type === 'دخول') {
        opts = ['أرباح مبيعات أمازون','أرباح سوشيال ميديا','أرباح مواقع','تمويل مستلم','سلفة مستلمة','دخل آخر'];
    } else if (type === 'خروج') {
        opts = ['إعلانات سوشيال ميديا','إعلانات أمازون','شراء بضاعة أمازون','شراء بضاعة عامة','سداد سلفة','سداد تمويل','مصاريف تشغيل','مصروفات شخصية','عمولات وتحويلات','مصروف آخر'];
    } else {
        opts = ['من الشخصي للشركة','من الشركة للشخصي'];
    }
    opts.forEach(o => {
        const op = document.createElement('option');
        op.value = o; op.textContent = o;
        sel.appendChild(op);
    });
}
updateCats();

// ============================================
// 🔥 API HELPERS (with Password)
// ============================================
async function sendToSheet(payload) {
    payload.pass = SESSION_PASS;
    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        const result = JSON.parse(text);

        if (result.error === 'AUTH_FAILED') {
            toast('انتهت الجلسة - سجل دخول مرة تانية', 'err');
            handleLogout();
            throw new Error('AUTH_FAILED');
        }

        if (!result.success) throw new Error(result.error || 'فشل في الحفظ');
        return result;
    } catch (err) {
        console.error('API Error:', err);
        throw err;
    }
}

async function fetchFromSheet(params) {
    const url = API + '?pass=' + encodeURIComponent(SESSION_PASS) + '&' + params;
    const res = await fetch(url);
    const text = await res.text();
    const data = JSON.parse(text);

    if (data.error === 'AUTH_FAILED') {
        toast('انتهت الجلسة - سجل دخول مرة تانية', 'err');
        handleLogout();
        throw new Error('AUTH_FAILED');
    }

    if (!data.success) throw new Error(data.error || 'فشل في القراءة');
    return data;
}

// ============================================
// LOAD DATA
// ============================================
async function loadData() {
    if (isLoading || !SESSION_PASS) return;
    isLoading = true;
    toast('جاري تحميل البيانات...', 'info');

    try {
        const data = await fetchFromSheet('action=getAll');

        TXN = (data.transactions || []).map(t => ({
            id: String(t['ID'] || ''),
            date: String(t['التاريخ'] || ''),
            time: String(t['الوقت'] || ''),
            account: String(t['الحساب'] || ''),
            type: String(t['النوع'] || ''),
            category: String(t['التصنيف'] || ''),
            person: String(t['الطرف'] || ''),
            amount: parseFloat(t['المبلغ']) || 0,
            notes: String(t['ملاحظات'] || '')
        }));

        DEBTS = (data.debts || []).map(d => ({
            id: String(d['ID'] || ''),
            date: String(d['التاريخ'] || ''),
            account: String(d['الحساب'] || ''),
            debtType: String(d['النوع'] || ''),
            person: String(d['الاسم'] || ''),
            amount: parseFloat(d['المبلغ']) || 0,
            percentage: parseFloat(d['النسبة']) || 0,
            paid: parseFloat(d['المسدد']) || 0,
            status: String(d['الحالة'] || 'نشط'),
            notes: String(d['ملاحظات'] || '')
        }));

        saveLocal();
        renderAll();
        showConnStatus('✅ متصل بـ Google Sheets', 'online');
        toast('تم التحميل ✅ (' + TXN.length + ' معاملة، ' + DEBTS.length + ' سلفة)');

    } catch (err) {
        if (err.message === 'AUTH_FAILED') return;
        console.error('Load error:', err);
        showConnStatus('⚠️ غير متصل - وضع أوفلاين', 'offline');
        toast('خطأ في التحميل - وضع أوفلاين', 'err');
        loadLocal();
        renderAll();
    }
    isLoading = false;
}

// ============================================
// LOCAL STORAGE
// ============================================
function saveLocal() {
    try {
        localStorage.setItem('mw_txn', JSON.stringify(TXN));
        localStorage.setItem('mw_debts', JSON.stringify(DEBTS));
        localStorage.setItem('mw_lastSync', new Date().toISOString());
    } catch (e) { }
}

function loadLocal() {
    try {
        const t = localStorage.getItem('mw_txn');
        const d = localStorage.getItem('mw_debts');
        if (t) TXN = JSON.parse(t);
        if (d) DEBTS = JSON.parse(d);
    } catch (e) { }
}

// ============================================
// RENDER ALL
// ============================================
function renderAll() {
    renderHome();
    renderTxns();
    renderDebts();
    fillMonthFilter();
}

// ============================================
// HOME SCREEN
// ============================================
function setAccFilter(f, btn) {
    accFilter = f;
    btn.parentElement.querySelectorAll('.acc-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderHome();
}

function renderHome() {
    let list = TXN;
    if (accFilter !== 'all') list = TXN.filter(t => t.account === accFilter);

    let inc = 0, exp = 0;
    list.forEach(t => {
        if (t.type === 'دخول') inc += t.amount;
        else if (t.type === 'خروج') exp += t.amount;
    });

    document.getElementById('homeBalance').innerHTML = pv(inc - exp);
    document.getElementById('homeIncome').innerHTML = pv(inc);
    document.getElementById('homeExpense').innerHTML = pv(exp);

    const el = document.getElementById('homeTxnList');
    const recent = [...list].reverse().slice(0, 6);

    if (recent.length === 0) {
        el.innerHTML = '<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد عمليات بعد<br>اضغط + لإضافة أول عملية</p></div>';
        return;
    }
    el.innerHTML = recent.map(t => txnHTML(t)).join('');
}

// ============================================
// TRANSACTION HTML
// ============================================
function txnHTML(t) {
    let icoClass, valClass, sign, icoName;
    if (t.type === 'دخول') {
        icoClass = 'in'; valClass = 'plus'; sign = '+'; icoName = 'fa-arrow-down';
    } else if (t.type === 'خروج') {
        icoClass = 'out'; valClass = 'minus'; sign = '-'; icoName = 'fa-arrow-up';
    } else {
        icoClass = 'transfer'; valClass = 'neutral'; sign = '⇄'; icoName = 'fa-right-left';
    }
    const amountDisplay = isPrivate
        ? '<span class="hidden-amount">' + HIDE + '</span>'
        : sign + ' ' + fmt(t.amount);

    return `
        <div class="txn">
            <div class="txn-left">
                <div class="txn-ico ${icoClass}"><i class="fa-solid ${icoName}"></i></div>
                <div class="txn-det">
                    <h4>${t.category || 'بدون تصنيف'}</h4>
                    <p>${t.person || ''} • ${t.date} • ${t.account === 'شخصي' ? '💰' : '🏢'} ${t.account}</p>
                </div>
            </div>
            <div class="txn-val ${valClass}">${amountDisplay}</div>
        </div>
    `;
}

// ============================================
// TRANSACTIONS SCREEN
// ============================================
function setTxnFilter(f, btn) {
    txnFilter = f;
    document.querySelectorAll('#txnFilters .f-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTxns();
}

function renderTxns() {
    let list = TXN;
    if (txnFilter !== 'all') list = TXN.filter(t => t.type === txnFilter);
    const el = document.getElementById('allTxnList');
    if (list.length === 0) {
        el.innerHTML = '<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد معاملات</p></div>';
        return;
    }
    el.innerHTML = [...list].reverse().map(t => txnHTML(t)).join('');
}

// ============================================
// DEBTS SCREEN
// ============================================
function setDebtFilter(f, btn) {
    debtFilter = f;
    btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderDebts();
}

function renderDebts() {
    let list = DEBTS;
    if (debtFilter !== 'all') list = DEBTS.filter(d => d.debtType === debtFilter);
    const el = document.getElementById('debtList');
    if (list.length === 0) {
        el.innerHTML = '<div class="empty" style="margin-top:30px"><i class="fa-solid fa-handshake"></i><p>لا توجد سلف أو تمويل</p></div>';
        return;
    }
    el.innerHTML = list.map(d => {
        const remaining = d.amount - d.paid;
        const progress = d.amount > 0 ? Math.min((d.paid / d.amount) * 100, 100) : 0;
        const isPaid = d.status === 'مسدد' || d.paid >= d.amount;
        const fillClass = isPaid ? 'green' : 'purple';
        const badgeClass = isPaid ? 'paid-badge' : 'active-badge';
        const badgeText = isPaid ? '✅ مسدد' : '🔴 نشط';
        return `
            <div class="debt-card">
                <div class="debt-top">
                    <div class="debt-name">${d.person}</div>
                    <span class="debt-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="debt-row"><span class="dr-label">النوع</span><span class="dr-value">${d.debtType === 'سلفة' ? '💰 سلفة' : '📈 تمويل'} (${d.account})</span></div>
                <div class="debt-row"><span class="dr-label">التاريخ</span><span class="dr-value">${d.date}</span></div>
                <div class="debt-row"><span class="dr-label">المبلغ الأصلي</span><span class="dr-value">${isPrivate ? HIDE : fmt(d.amount)}</span></div>
                ${d.percentage > 0 ? `<div class="debt-row"><span class="dr-label">النسبة</span><span class="dr-value">${d.percentage}%</span></div>` : ''}
                <div class="debt-row"><span class="dr-label">المسدد</span><span class="dr-value" style="color:var(--success)">${isPrivate ? HIDE : fmt(d.paid)}</span></div>
                <div class="debt-row"><span class="dr-label">المتبقي</span><span class="dr-value" style="color:var(--danger)">${isPrivate ? HIDE : fmt(remaining)}</span></div>
                <div class="progress-track"><div class="progress-fill ${fillClass}" style="width:${progress}%"></div></div>
                ${!isPaid ? `
                <div class="debt-actions">
                    <button class="btn-pay" onclick="openPay('${d.id}')"><i class="fa-solid fa-money-bill"></i> سداد</button>
                    <button class="btn-del" onclick="delDebt('${d.id}')"><i class="fa-solid fa-trash"></i> حذف</button>
                </div>` : `
                <div class="debt-actions">
                    <button class="btn-del" onclick="delDebt('${d.id}')" style="flex:1"><i class="fa-solid fa-trash"></i> حذف</button>
                </div>`}
            </div>
        `;
    }).join('');
}

function openPay(id) {
    document.getElementById('payId').value = id;
    document.getElementById('payVal').value = '';
    openModal('modalPay');
}

// ============================================
// 🔥 SAVE TRANSACTION
// ============================================
async function saveTxn(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveTxn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

    const now = new Date();
    const type = document.getElementById('txnType').value;
    const account = document.getElementById('txnAcc').value;
    const category = document.getElementById('txnCat').value;
    const person = document.getElementById('txnPerson').value.trim();
    const amount = parseFloat(document.getElementById('txnAmount').value) || 0;
    const notes = document.getElementById('txnNotes').value.trim();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (amount <= 0) {
        toast('أدخل مبلغ صحيح', 'err');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> حفظ العملية';
        return;
    }

    try {
        if (type === 'تحويل') {
            const fromAcc = category === 'من الشركة للشخصي' ? 'شركة' : 'شخصي';
            const toAcc = category === 'من الشركة للشخصي' ? 'شخصي' : 'شركة';
            const noteText = notes || 'تحويل بين الحسابات';

            const [r1, r2] = await Promise.all([
                sendToSheet({ action: 'addTransaction', date: dateStr, time: timeStr, account: fromAcc, type: 'خروج', category: 'تحويل إلى ' + toAcc, person: 'تحويل داخلي', amount, notes: noteText }),
                sendToSheet({ action: 'addTransaction', date: dateStr, time: timeStr, account: toAcc, type: 'دخول', category: 'تحويل من ' + fromAcc, person: 'تحويل داخلي', amount, notes: noteText })
            ]);

            TXN.push({ id: r1.id, date: dateStr, time: timeStr, account: fromAcc, type: 'خروج', category: 'تحويل إلى ' + toAcc, person: 'تحويل داخلي', amount, notes: noteText });
            TXN.push({ id: r2.id, date: dateStr, time: timeStr, account: toAcc, type: 'دخول', category: 'تحويل من ' + fromAcc, person: 'تحويل داخلي', amount, notes: noteText });
            toast('تم تحويل ' + fmt(amount) + ' بنجاح ✅');
        } else {
            const result = await sendToSheet({ action: 'addTransaction', date: dateStr, time: timeStr, account, type, category, person, amount, notes });
            TXN.push({ id: result.id, date: dateStr, time: timeStr, account, type, category, person, amount, notes });
            toast('تم حفظ العملية ✅');
        }

        saveLocal();
        renderAll();
        closeModal('modalTxn');
        document.getElementById('frmTxn').reset();
        updateCats();
    } catch (err) {
        if (err.message !== 'AUTH_FAILED') toast('خطأ في الحفظ!', 'err');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> حفظ العملية';
}

// ============================================
// 🔥 SAVE DEBT
// ============================================
async function saveDebt(e) {
    e.preventDefault();
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const debtData = {
        action: 'addDebt',
        date: dateStr,
        account: document.getElementById('debtAcc').value,
        debtType: document.getElementById('debtType').value,
        person: document.getElementById('debtPerson').value.trim(),
        amount: parseFloat(document.getElementById('debtAmount').value) || 0,
        percentage: parseFloat(document.getElementById('debtPct').value) || 0,
        notes: document.getElementById('debtNotes').value.trim()
    };

    if (debtData.amount <= 0) { toast('أدخل مبلغ صحيح', 'err'); return; }

    try {
        const debtResult = await sendToSheet(debtData);
        const txnResult = await sendToSheet({
            action: 'addTransaction',
            date: dateStr, time: timeStr, account: debtData.account, type: 'دخول',
            category: debtData.debtType === 'سلفة' ? 'سلفة مستلمة' : 'تمويل مستلم',
            person: debtData.person, amount: debtData.amount,
            notes: debtData.debtType + (debtData.percentage > 0 ? ' - نسبة ' + debtData.percentage + '%' : ' - بدون نسبة')
        });

        DEBTS.push({ id: debtResult.id, date: dateStr, account: debtData.account, debtType: debtData.debtType, person: debtData.person, amount: debtData.amount, percentage: debtData.percentage, paid: 0, status: 'نشط', notes: debtData.notes });
        TXN.push({ id: txnResult.id, date: dateStr, time: timeStr, account: debtData.account, type: 'دخول', category: debtData.debtType === 'سلفة' ? 'سلفة مستلمة' : 'تمويل مستلم', person: debtData.person, amount: debtData.amount, notes: debtData.debtType });

        saveLocal(); renderAll();
        closeModal('modalDebt');
        document.getElementById('frmDebt').reset();
        toast('تم حفظ ' + debtData.debtType + ' ✅');
    } catch (err) {
        if (err.message !== 'AUTH_FAILED') toast('خطأ في الحفظ!', 'err');
    }
}

// ============================================
// 🔥 PAY DEBT
// ============================================
async function submitPay(e) {
    e.preventDefault();
    const debtId = document.getElementById('payId').value;
    const payAmount = parseFloat(document.getElementById('payVal').value) || 0;
    if (payAmount <= 0) { toast('أدخل مبلغ صحيح', 'err'); return; }

    const idx = DEBTS.findIndex(d => d.id === debtId);
    if (idx < 0) { toast('السلفة غير موجودة', 'err'); return; }

    const debt = DEBTS[idx];
    const remaining = debt.amount - debt.paid;
    if (payAmount > remaining) { toast('المبلغ أكبر من المتبقي (' + fmt(remaining) + ')', 'err'); return; }

    try {
        await sendToSheet({ action: 'payDebt', id: debtId, paidAmount: payAmount });

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB');
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const txnResult = await sendToSheet({
            action: 'addTransaction', date: dateStr, time: timeStr, account: debt.account, type: 'خروج',
            category: debt.debtType === 'سلفة' ? 'سداد سلفة' : 'سداد تمويل',
            person: debt.person, amount: payAmount, notes: 'سداد - ' + debt.person
        });

        DEBTS[idx].paid += payAmount;
        if (DEBTS[idx].paid >= DEBTS[idx].amount) DEBTS[idx].status = 'مسدد';

        TXN.push({ id: txnResult.id, date: dateStr, time: timeStr, account: debt.account, type: 'خروج', category: debt.debtType === 'سلفة' ? 'سداد سلفة' : 'سداد تمويل', person: debt.person, amount: payAmount, notes: 'سداد' });

        saveLocal(); renderAll();
        closeModal('modalPay');
        toast('تم سداد ' + fmt(payAmount) + ' ✅');
    } catch (err) {
        if (err.message !== 'AUTH_FAILED') toast('خطأ في السداد!', 'err');
    }
}

// ============================================
// 🔥 DELETE DEBT
// ============================================
async function delDebt(id) {
    if (!confirm('هل أنت متأكد من الحذف نهائياً؟')) return;
    try {
        await sendToSheet({ action: 'deleteDebt', id });
        DEBTS = DEBTS.filter(d => d.id !== id);
        saveLocal(); renderAll();
        toast('تم الحذف ✅');
    } catch (err) {
        if (err.message !== 'AUTH_FAILED') toast('خطأ في الحذف!', 'err');
    }
}

// ============================================
// MONTH FILTER
// ============================================
function fillMonthFilter() {
    const sel = document.getElementById('rptMonth');
    sel.innerHTML = '<option value="all">كل الشهور</option>';
    const months = new Set();
    TXN.forEach(t => {
        const parts = (t.date || '').split('/');
        if (parts.length >= 3) months.add(parts[1] + '/' + parts[2]);
    });
    const mNames = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    [...months].sort((a,b) => {
        const [mA,yA]=a.split('/').map(Number); const [mB,yB]=b.split('/').map(Number);
        return yA!==yB?yA-yB:mA-mB;
    }).forEach(m => {
        const [month,year] = m.split('/');
        sel.innerHTML += `<option value="${m}">${mNames[parseInt(month)]||month} ${year}</option>`;
    });
}

// ============================================
// BUILD CHARTS
// ============================================
function buildCharts() {
    const selMonth = document.getElementById('rptMonth').value;
    let filtered = TXN;
    if (selMonth !== 'all') {
        filtered = TXN.filter(t => {
            const parts = (t.date||'').split('/');
            return parts.length >= 3 && parts[1]+'/'+parts[2] === selMonth;
        });
    }

    let pInc=0, pExp=0, cInc=0, cExp=0, catExpenses={};
    filtered.forEach(t => {
        const amt = t.amount||0;
        if (t.type==='دخول') { if(t.account==='شخصي') pInc+=amt; else cInc+=amt; }
        else if (t.type==='خروج') { if(t.account==='شخصي') pExp+=amt; else cExp+=amt; catExpenses[t.category]=(catExpenses[t.category]||0)+amt; }
    });

    let totalDebtRemain = 0;
    DEBTS.forEach(d => { if(d.status!=='مسدد') totalDebtRemain+=(d.amount-d.paid); });

    const pBal=pInc-pExp, cBal=cInc-cExp, net=pBal+cBal;

    document.getElementById('rPersonal').innerHTML = pv(pBal);
    document.getElementById('rCompany').innerHTML = pv(cBal);
    document.getElementById('rDebts').innerHTML = pv(totalDebtRemain);
    document.getElementById('rNet').innerHTML = pv(net);

    if (!isPrivate) {
        document.getElementById('rPersonal').style.color = pBal>=0?'var(--success)':'var(--danger)';
        document.getElementById('rCompany').style.color = cBal>=0?'var(--success)':'var(--danger)';
        document.getElementById('rDebts').style.color = 'var(--danger)';
        document.getElementById('rNet').style.color = net>=0?'var(--success)':'var(--danger)';
    }

    // Doughnut
    const catLabels = Object.keys(catExpenses);
    const catData = Object.values(catExpenses);
    const colors = ['#6C5CE7','#00CEC9','#FF6B6B','#FDCB6E','#00B894','#E17055','#0984E3','#D63031','#A29BFE','#FD79A8','#55EFC4','#74B9FF'];

    const ctxD = document.getElementById('chartDoughnut').getContext('2d');
    if (chartDonut) chartDonut.destroy();
    if (catLabels.length > 0) {
        chartDonut = new Chart(ctxD, { type:'doughnut', data:{ labels:catLabels, datasets:[{ data:catData, backgroundColor:colors.slice(0,catLabels.length), borderWidth:0, hoverOffset:8 }] }, options:{ responsive:true, cutout:'65%', plugins:{ legend:{ position:'bottom', labels:{ font:{family:'Tajawal',size:11}, padding:12, usePointStyle:true }}, tooltip:{ rtl:true, callbacks:{ label:ctx=>{ const total=ctx.dataset.data.reduce((a,b)=>a+b,0); return ' '+ctx.label+': '+fmt(ctx.raw)+' ('+((ctx.raw/total)*100).toFixed(1)+'%)'; }}}}} });
    } else {
        chartDonut = new Chart(ctxD, { type:'doughnut', data:{ labels:['لا توجد بيانات'], datasets:[{ data:[1], backgroundColor:['#f0f0f5'], borderWidth:0 }] }, options:{ responsive:true, cutout:'65%', plugins:{ legend:{display:false}}} });
    }

    // Bar
    let monthlyMap = {};
    TXN.forEach(t => {
        const parts = (t.date||'').split('/');
        if (parts.length>=3) {
            const key = parts[1]+'/'+parts[2];
            if (!monthlyMap[key]) monthlyMap[key]={inc:0,exp:0};
            if (t.type==='دخول') monthlyMap[key].inc+=t.amount;
            else if (t.type==='خروج') monthlyMap[key].exp+=t.amount;
        }
    });
    const sortedKeys = Object.keys(monthlyMap).sort((a,b)=>{ const[mA,yA]=a.split('/').map(Number);const[mB,yB]=b.split('/').map(Number);return yA!==yB?yA-yB:mA-mB; });
    const mNames = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const barLabels = sortedKeys.map(k=>{const[m]=k.split('/');return mNames[parseInt(m)]||k;});
    const barInc = sortedKeys.map(k=>monthlyMap[k].inc);
    const barExp = sortedKeys.map(k=>monthlyMap[k].exp);

    const ctxB = document.getElementById('chartBar').getContext('2d');
    if (chartBars) chartBars.destroy();
    chartBars = new Chart(ctxB, { type:'bar', data:{ labels:barLabels, datasets:[ { label:'الدخل', data:barInc, backgroundColor:'rgba(0,184,148,0.75)', borderRadius:8, borderSkipped:false }, { label:'المصروفات', data:barExp, backgroundColor:'rgba(255,107,107,0.75)', borderRadius:8, borderSkipped:false } ] }, options:{ responsive:true, scales:{ x:{ grid:{display:false}, ticks:{font:{family:'Tajawal',size:11}}}, y:{ beginAtZero:true, grid:{color:'#f5f5f8'}, ticks:{font:{family:'Tajawal',size:11}, callback:v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3)+'K':v}} }, plugins:{ legend:{ position:'bottom', labels:{font:{family:'Tajawal',size:12},usePointStyle:true,padding:15}}, tooltip:{ rtl:true, callbacks:{label:ctx=>' '+ctx.dataset.label+': '+fmt(ctx.raw)}}}} });

    // Breakdown
    const bEl = document.getElementById('expBreakdown');
    if (catLabels.length===0) { bEl.innerHTML='<div class="empty"><i class="fa-solid fa-chart-bar"></i><p>لا توجد مصروفات</p></div>'; return; }
    const totalExp = catData.reduce((a,b)=>a+b,0);
    const sorted = catLabels.map((l,i)=>({label:l,amount:catData[i],color:colors[i]})).sort((a,b)=>b.amount-a.amount);
    bEl.innerHTML = sorted.map(item=>{
        const pct=((item.amount/totalExp)*100).toFixed(1);
        return `<div class="txn"><div class="txn-left"><div class="txn-ico" style="background:${item.color}18;color:${item.color}"><i class="fa-solid fa-tag"></i></div><div class="txn-det"><h4>${item.label}</h4><p>${pct}% من إجمالي المصروفات</p></div></div><div class="txn-val minus">${isPrivate?HIDE:fmt(item.amount)}</div></div>`;
    }).join('');
}

// ============================================
// EXPORT FILTERS
// ============================================
function setExpAcc(val,btn) { expAcc=val; btn.parentElement.querySelectorAll('.f-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
function setExpPeriod(val,btn) { expPeriod=val; btn.parentElement.querySelectorAll('.f-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }

function getExportData() {
    let list = [...TXN];
    if (expAcc!=='all') list=list.filter(t=>t.account===expAcc);
    const now = new Date();
    if (expPeriod==='month') {
        const cm=now.getMonth()+1, cy=now.getFullYear();
        list=list.filter(t=>{const p=(t.date||'').split('/');return p.length>=3&&parseInt(p[1])===cm&&parseInt(p[2])===cy;});
    } else if (expPeriod==='3months') {
        const ago=new Date(now.getFullYear(),now.getMonth()-3,1);
        list=list.filter(t=>{const p=(t.date||'').split('/');if(p.length>=3){const d=new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));return d>=ago;}return false;});
    }
    return list;
}

// ============================================
// EXPORT PDF
// ============================================
function exportPDF(reportType) {
    toast('جاري إنشاء التقرير...','info');
    const area = document.getElementById('pdfArea');
    const data = getExportData();
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'});

    let totalInc=0, totalExp=0, catMap={};
    data.forEach(t=>{ if(t.type==='دخول') totalInc+=t.amount; else if(t.type==='خروج'){totalExp+=t.amount; catMap[t.category]=(catMap[t.category]||0)+t.amount;}});

    let html = `<div class="pdf-head"><h2>📊 محفظة محمد عزب</h2><p>تقرير مالي - ${dateStr}</p><p style="font-size:10px;margin-top:2px">${expAcc!=='all'?'حساب: '+expAcc+' | ':''}${expPeriod==='all'?'كل الفترات':expPeriod==='month'?'الشهر الحالي':'آخر 3 شهور'}</p></div>`;

    if (reportType==='full'||reportType==='transactions') {
        if (reportType==='full') {
            html+=`<div class="pdf-stats"><div class="pdf-stat"><div class="pl">إجمالي الدخل</div><div class="pv clr-green">${fmt(totalInc)}</div></div><div class="pdf-stat"><div class="pl">إجمالي المصروفات</div><div class="pv clr-red">${fmt(totalExp)}</div></div><div class="pdf-stat"><div class="pl">صافي الرصيد</div><div class="pv" style="color:${(totalInc-totalExp)>=0?'var(--success)':'var(--danger)'}">${fmt(totalInc-totalExp)}</div></div><div class="pdf-stat"><div class="pl">عدد العمليات</div><div class="pv">${data.length}</div></div></div>`;
            const cats=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
            if(cats.length>0){ html+='<div class="pdf-sec-title">📋 المصروفات حسب التصنيف</div><table><tr><th>التصنيف</th><th>المبلغ</th><th>النسبة</th></tr>'; cats.forEach(([cat,amt])=>{html+=`<tr><td>${cat}</td><td class="clr-red">${fmt(amt)}</td><td>${totalExp>0?((amt/totalExp)*100).toFixed(1):'0'}%</td></tr>`;}); html+='</table>'; }
        }
        html+=`<div class="pdf-sec-title">📝 تفاصيل المعاملات (${data.length})</div>`;
        if(data.length>0){ html+='<table><tr><th>التاريخ</th><th>النوع</th><th>التصنيف</th><th>الطرف</th><th>الحساب</th><th>المبلغ</th></tr>';[...data].reverse().forEach(t=>{const cls=t.type==='دخول'?'clr-green':t.type==='خروج'?'clr-red':'';const sign=t.type==='دخول'?'+':t.type==='خروج'?'-':'⇄';html+=`<tr><td>${t.date}</td><td>${t.type}</td><td>${t.category}</td><td>${t.person}</td><td>${t.account}</td><td class="${cls}">${sign} ${fmt(t.amount)}</td></tr>`;});html+='</table>';} else { html+='<p style="text-align:center;color:#a4a6b3;padding:15px">لا توجد معاملات</p>'; }
    }

    if (reportType==='full'||reportType==='debts') {
        let dList=DEBTS; if(expAcc!=='all') dList=DEBTS.filter(d=>d.account===expAcc);
        html+='<div class="pdf-sec-title">🤝 السلف والتمويل</div>';
        if(dList.length>0){ let tOwed=0,tPaid=0; html+='<table><tr><th>الاسم</th><th>النوع</th><th>المبلغ</th><th>النسبة</th><th>المسدد</th><th>المتبقي</th><th>الحالة</th></tr>';dList.forEach(d=>{const rem=d.amount-d.paid;tOwed+=d.amount;tPaid+=d.paid;html+=`<tr><td><strong>${d.person}</strong></td><td>${d.debtType}</td><td>${fmt(d.amount)}</td><td>${d.percentage>0?d.percentage+'%':'-'}</td><td class="clr-green">${fmt(d.paid)}</td><td class="clr-red">${fmt(rem)}</td><td>${d.status==='مسدد'?'✅':'🔴'} ${d.status}</td></tr>`;});html+=`<tr style="background:#f0f0f5;font-weight:700"><td colspan="2">الإجمالي</td><td>${fmt(tOwed)}</td><td></td><td class="clr-green">${fmt(tPaid)}</td><td class="clr-red">${fmt(tOwed-tPaid)}</td><td></td></tr></table>`;} else { html+='<p style="text-align:center;color:#a4a6b3;padding:15px">لا توجد سلف</p>'; }
    }

    html+=`<div class="pdf-footer"><p>تم إنشاء هذا التقرير تلقائياً من محفظة محمد عزب</p><p>${dateStr} - ${now.toLocaleTimeString('ar-EG')}</p></div>`;
    area.innerHTML = html;

    const fileName = reportType==='debts'?'تقرير_السلف':reportType==='transactions'?'كشف_حساب':'تقرير_شامل';
    html2pdf().set({ margin:[10,10,10,10], filename:fileName+'_'+now.toLocaleDateString('en-GB').replace(/\//g,'-')+'.pdf', image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} }).from(area).save().then(()=>{ toast('تم تحميل التقرير 📄 ✅'); area.innerHTML=''; }).catch(err=>{ console.error(err); toast('خطأ في التصدير','err'); });
}

// ============================================
// EXPORT CSV
// ============================================
function exportCSV() {
    const data = getExportData();
    if(data.length===0){toast('لا توجد بيانات','err');return;}

    let csv='\uFEFF'; csv+='التاريخ,الوقت,الحساب,النوع,التصنيف,الطرف,المبلغ,ملاحظات\n';
    let totalIn=0, totalOut=0;
    data.forEach(t=>{ csv+=[t.date,t.time,t.account,t.type,t.category,t.person,t.amount,t.notes].map(v=>'"'+(v||'')+'"').join(',')+'\n'; if(t.type==='دخول')totalIn+=t.amount;else if(t.type==='خروج')totalOut+=t.amount; });
    csv+='\n"","","","","إجمالي الدخل","","'+totalIn+'",""\n';
    csv+='"","","","","إجمالي المصروفات","","'+totalOut+'",""\n';
    csv+='"","","","","الصافي","","'+(totalIn-totalOut)+'",""\n';

    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const link=document.createElement('a');
    link.href=URL.createObjectURL(blob);
    link.download='معاملات_'+new Date().toLocaleDateString('en-GB').replace(/\//g,'-')+'.csv';
    document.body.appendChild(link);link.click();document.body.removeChild(link);
    toast('تم تحميل Excel 📊 ✅');
}

// ============================================
// SWIPE TO REFRESH
// ============================================
let touchY = 0;
document.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; });
document.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientY - touchY;
    if (diff > 150 && window.scrollY === 0) loadData();
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-bg').forEach(m => m.classList.remove('open'));
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openModal('modalTxn'); }
});

// ============================================
// 🚀 INIT
// ============================================
(function init() {
    // تحقق من تسجيل دخول محفوظ
    if (!checkSavedLogin()) {
        // لو مفيش - اعرض شاشة الدخول
        document.getElementById('loginScreen').style.display = 'flex';
    }
})();