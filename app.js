(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = iso => iso ? new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "—";
  const SESSION_KEY = "depo-session";

  let user = null, person = "", statusFilter = "", kalemler = [], scanMode = "zimmet";
  let lastCode = "", lastAt = 0, openTai = null;

  /* ---------- yardımcılar ---------- */
  let toastT;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200);
  }
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
  function beep(ok) {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = ok ? 880 : 240; g.gain.value = .08;
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (ok ? .1 : .25));
    } catch (e) {}
  }

  /* ---------- giriş ---------- */
  function showLogin() { $("loginView").hidden = false; $("appView").hidden = true; $("demoHint").hidden = !DB.isDemo; }
  async function showApp() {
    $("loginView").hidden = true; $("appView").hidden = false; $("demoBanner").hidden = !DB.isDemo;
    const d = await DB.getDonem();
    $("donemInfo").textContent = d ? `${d.Yil} dönemi · ${d.Durum}` : "Aktif dönem yok";
    const people = await DB.listPersons();
    $("personSel").innerHTML = `<option value="">Tüm zimmet sahipleri</option>` +
      people.map(p => `<option>${esc(p)}</option>`).join("");
    $("personSel").value = person;
    await refreshKalem();
  }

  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault(); $("loginErr").textContent = "";
    try {
      user = await DB.login($("sicil").value, $("parola").value);
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e2) {}
      $("parola").value = "";
      showApp();
    } catch (err) { $("loginErr").textContent = err.message; }
  });
  $("logoutBtn").onclick = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    user = null; $("menu").hidden = true; showLogin();
  };
  $("resetBtn").onclick = async () => {
    $("menu").hidden = true;
    if (!confirm("Demo verisi sıfırlansın mı?")) return;
    await DB.resetDemo(); await refreshKalem(); toast("Demo verisi sıfırlandı");
  };
  $("menuBtn").onclick = e => { e.stopPropagation(); $("menu").hidden = !$("menu").hidden; };
  document.addEventListener("click", () => $("menu").hidden = true);
  $("resetBtn").hidden = !DB.isDemo;

  /* ---------- sekmeler ---------- */
  document.querySelectorAll(".tabbar button").forEach(b => b.onclick = () => {
    document.querySelectorAll(".tabbar button").forEach(x => x.classList.toggle("on", x === b));
    document.querySelectorAll(".tab").forEach(t => t.hidden = t.id !== b.dataset.tab);
    $("screenTitle").textContent = b.dataset.tab === "tabZimmet" ? "Zimmet Kontrolü" : "Malzeme Ara";
  });

  /* ---------- zimmet listesi ---------- */
  async function refreshKalem(flashTai) {
    kalemler = await DB.listKalem(person);
    const found = kalemler.filter(k => k.Durum === "Bulundu").length;
    const lost = kalemler.filter(k => k.Durum === "Kayıp").length;
    const wait = kalemler.length - found - lost;
    $("cFound").textContent = found; $("cLost").textContent = lost; $("cWait").textContent = wait;
    $("progBar").style.width = kalemler.length ? ((found + lost) / kalemler.length * 100) + "%" : "0";
    renderKalem(flashTai);
  }
  function renderKalem(flashTai) {
    const rows = kalemler.filter(k => !statusFilter || k.Durum === statusFilter);
    $("kalemEmpty").hidden = rows.length > 0;
    $("kalemList").innerHTML = rows.map(k => `
      <li class="item ${esc(k.Durum)} ${k.TAINo === flashTai ? "flash" : ""}" data-tai="${esc(k.TAINo)}">
        <div class="top"><span class="tai">${esc(k.TAINo)}</span><span class="st">${esc(k.Durum)}</span></div>
        <div class="name">${esc(k.MalzemeAdi)}</div>
        <div class="meta">${esc(k.ZimmetSahibi)}${k.ShelfNo ? " · Raf " + esc(k.ShelfNo) : ""}</div>
      </li>`).join("");
  }
  $("personSel").onchange = e => { person = e.target.value; refreshKalem(); };
  $("statusFilter").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    statusFilter = b.dataset.f;
    document.querySelectorAll("#statusFilter button").forEach(x => x.classList.toggle("on", x === b));
    renderKalem();
  };
  $("kalemList").onclick = e => { const li = e.target.closest(".item"); if (li) openSheet(li.dataset.tai); };

  /* ---------- durum penceresi ---------- */
  function openSheet(tai) {
    const k = kalemler.find(x => x.TAINo === tai); if (!k) return;
    openTai = tai;
    $("shName").textContent = `${k.TAINo} · ${k.MalzemeAdi}`;
    $("shInfo").innerHTML = `
      <dt>Zimmet sahibi</dt><dd>${esc(k.ZimmetSahibi)}</dd>
      <dt>Raf</dt><dd>${esc(k.ShelfNo || "—")}</dd>
      <dt>Üretici</dt><dd>${esc(k.Producer || "—")}</dd>
      <dt>Seri no</dt><dd>${esc(k.SerialNo || "—")}</dd>
      <dt>Durum</dt><dd>${esc(k.Durum)}</dd>
      <dt>Kontrol</dt><dd>${fmtDate(k.KontrolTarihi)}${k.KontrolEden ? " · " + esc(k.KontrolEden) : ""}</dd>`;
    $("sheet").hidden = false;
  }
  const closeSheet = () => { $("sheet").hidden = true; openTai = null; };
  $("shClose").onclick = closeSheet;
  document.querySelector(".sheet-bg").onclick = closeSheet;
  document.querySelector(".sheet-actions").onclick = async e => {
    const b = e.target.closest("button"); if (!b || !openTai) return;
    const tai = openTai; closeSheet();
    try { await DB.setDurum(tai, b.dataset.d, user ? user.sicil : ""); toast(`${tai}: ${b.dataset.d}`); await refreshKalem(tai); }
    catch (err) { toast(err.message); }
  };

  /* ---------- kamera ---------- */
  function showResult(kind, html) {
    const r = $("scanResult"); r.className = "scan-result" + (kind ? " " + kind : "");
    r.innerHTML = html; r.hidden = false;
  }
  async function openScanner(mode) {
    scanMode = mode; lastCode = ""; lastAt = 0;
    $("scanner").hidden = false; $("scanResult").hidden = true; $("scanErr").hidden = true;
    $("scanTitle").textContent = mode === "zimmet" ? "Zimmet kontrolü — barkodu okutun" : "Malzeme ara — barkodu okutun";
    try { await Scanner.start($("video"), onCode); }
    catch (err) {
      $("scanErr").textContent = (err && err.name === "NotAllowedError")
        ? "Kamera izni verilmedi. Tarayıcı ayarlarından izin verin veya TAI NO'yu elle girin."
        : (err && err.message) || "Kamera açılamadı";
      $("scanErr").hidden = false;
    }
  }
  function closeScanner() { Scanner.stop($("video")); $("scanner").hidden = true; }
  $("scanBtn").onclick = () => openScanner("zimmet");
  $("scanSearchBtn").onclick = () => openScanner("search");
  $("scanClose").onclick = async () => { closeScanner(); if (scanMode === "zimmet") await refreshKalem(); };
  $("manualForm").onsubmit = e => {
    e.preventDefault(); const v = $("manualInput").value.trim(); if (!v) return;
    $("manualInput").value = ""; lastCode = ""; onCode(v);
  };

  async function onCode(raw) {
    const code = String(raw || "").trim(); if (!code) return;
    const now = Date.now();
    if (code === lastCode && now - lastAt < 2500) return;   // aynı barkodu arka arkaya sayma
    lastCode = code; lastAt = now;

    if (scanMode === "search") {
      closeScanner(); $("q").value = code; runSearch(); return;
    }
    const k = await DB.findKalem(code);
    if (!k) { buzz([80, 60, 80]); beep(false); showResult("bad", `<b>Listede yok</b>${esc(code)} bu dönemin zimmet listesinde bulunamadı`); return; }
    if (k.Durum === "Bulundu") {
      buzz(60); beep(false);
      showResult("warn", `<b>Zaten bulundu</b>${esc(k.TAINo)} · ${esc(k.MalzemeAdi)}<br><small>${esc(k.ZimmetSahibi)} · ${fmtDate(k.KontrolTarihi)}</small>`);
      return;
    }
    try {
      await DB.setDurum(k.TAINo, "Bulundu", user ? user.sicil : "");
      const other = person && k.ZimmetSahibi !== person;
      buzz(other ? [40, 40, 40] : 40); beep(true);
      showResult(other ? "warn" : "", `<b>${other ? "Bulundu — başka kişiye zimmetli" : "Bulundu ✔"}</b>${esc(k.TAINo)} · ${esc(k.MalzemeAdi)}<br><small>${esc(k.ZimmetSahibi)}${k.ShelfNo ? " · Raf " + esc(k.ShelfNo) : ""}</small>`);
    } catch (err) { showResult("bad", `<b>Kaydedilemedi</b>${esc(err.message)}`); }
  }

  /* ---------- arama ---------- */
  let searchT;
  async function runSearch() {
    const q = $("q").value.trim();
    if (!q) { $("searchList").innerHTML = ""; $("searchInfo").textContent = "Aramak için yazın veya kamera ile okutun."; return; }
    const rows = await DB.search(q);
    $("searchInfo").textContent = rows.length ? `${rows.length} sonuç` : "Sonuç bulunamadı";
    $("searchList").innerHTML = rows.slice(0, 100).map(m => `
      <li class="item ${esc(m.Durum || "")}" style="cursor:default">
        <div class="top"><span class="tai">${esc(m.TAINo)}</span>${m.Durum ? `<span class="st">${esc(m.Durum)}</span>` : ""}</div>
        <div class="name">${esc(m.ProductName)}</div>
        <div class="meta">${esc(m.Producer)} ${esc(m.ComponentNo)} · Seri: ${esc(m.SerialNo)}</div>
        <div class="meta">👤 ${esc(m.Depositary)} · Raf ${esc(m.ShelfNo || "—")}</div>
      </li>`).join("");
  }
  $("q").addEventListener("input", () => { clearTimeout(searchT); searchT = setTimeout(runSearch, 200); });
  $("searchInfo").textContent = "Aramak için yazın veya kamera ile okutun.";

  /* ---------- başlangıç ---------- */
  try { user = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { user = null; }
  user ? showApp() : showLogin();

  if ("serviceWorker" in navigator && location.protocol !== "file:")
    navigator.serviceWorker.register("sw.js").catch(() => {});
})();
