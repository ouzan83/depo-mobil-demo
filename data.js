/* VERİ KATMANI
 * Şu an DEMO: veriler tarayıcıda (localStorage) tutulur.
 * Firebase'e geçerken yalnızca bu dosya değişir; app.js aynı fonksiyonları çağırmaya devam eder.
 *
 * Durum değerleri masaüstü ile aynıdır: "Bekliyor" | "Bulundu" | "Kayıp"
 */
const DB = (() => {
  const KEY = "depo-demo-v1";
  const PEOPLE = ["Ahmet Yılmaz", "Ayşe Kaya", "Mehmet Demir", "Fatma Çelik"];
  const ITEMS = [
    ["TAI-100001", "Dizüstü Bilgisayar", "Lenovo", "T14", "PF3A91XZ"],
    ["TAI-100002", "Monitör 24\"", "Dell", "P2422H", "CN0K4421"],
    ["TAI-100003", "Yazıcı Lazer", "HP", "M404dn", "VNB3K12044"],
    ["TAI-100004", "Telsiz El Tipi", "Motorola", "DP4400", "MOT88213"],
    ["TAI-100005", "Multimetre", "Fluke", "117", "FLK2290417"],
    ["TAI-100006", "Matkap Şarjlı", "Bosch", "GSR 18V", "BSH7712093"],
    ["TAI-100007", "Barkod Okuyucu", "Zebra", "DS2208", "ZBR5530071"],
    ["TAI-100008", "Etiket Yazıcı", "Zebra", "ZT230", "ZTL4400918"],
    ["TAI-100009", "Tablet", "Samsung", "Tab A8", "SMT1100342"],
    ["TAI-100010", "Osiloskop", "Rigol", "DS1054Z", "RGL0099321"],
    ["TAI-100011", "Lehim İstasyonu", "Weller", "WE1010", "WLR3310045"],
    ["TAI-100012", "Güç Kaynağı", "Keysight", "E3631A", "KSG6612078"],
    ["TAI-100013", "Dizüstü Bilgisayar", "HP", "ProBook 450", "5CD2214KQ1"],
    ["TAI-100014", "Masaüstü Bilgisayar", "Dell", "OptiPlex 7090", "DLL9900123"],
    ["TAI-100015", "Ağ Anahtarı", "Cisco", "SG350-28", "CSC4410087"],
    ["TAI-100016", "El Feneri", "Fenix", "PD36R", "FNX0021876"],
    ["TAI-100017", "Torpido Anahtar Seti", "Stanley", "STMT73795", "STN1120934"],
    ["TAI-100018", "Termal Kamera", "Flir", "E6", "FLR7701239"],
    ["TAI-100019", "Laptop Çantası", "Targus", "TBC002", "TRG0001223"],
    ["TAI-100020", "UPS 1000VA", "APC", "BX1000", "APC3318420"],
    ["TAI-100021", "Projeksiyon", "Epson", "EB-X49", "EPS5523091"],
    ["TAI-100022", "Telefon IP", "Yealink", "T46U", "YLK0098812"],
    ["TAI-100023", "Kaynak Makinesi", "Lincoln", "Invertec 140", "LNC8810045"],
    ["TAI-100024", "Test Kablosu Seti", "Fluke", "TL71", "FLK0044120"],
    ["TAI-100025", "Dizüstü Bilgisayar", "Lenovo", "L15", "PF4B22KL"],
    ["TAI-100026", "Monitör 27\"", "LG", "27UL500", "LG0227781"],
    ["TAI-100027", "Taşınabilir Disk 2TB", "WD", "Elements", "WD2233019"],
    ["TAI-100028", "Alet Çantası", "Bosch", "Professional", "BSH0099231"],
    ["TAI-100029", "Telsiz Araç Tipi", "Motorola", "DM4600", "MOT44128"],
    ["TAI-100030", "Hassas Terazi", "Ohaus", "PX224", "OHS6612087"]
  ];
  const SHELVES = ["A-01", "A-02", "A-03", "B-01", "B-02", "B-03", "C-01", "C-02"];

  function seed() {
    const malzemeler = ITEMS.map((it, i) => ({
      TAINo: it[0], ProductName: it[1], Producer: it[2], ComponentNo: it[3], SerialNo: it[4],
      Depositary: PEOPLE[i % PEOPLE.length], ShelfNo: SHELVES[i % SHELVES.length]
    }));
    const donem = { ID: 1, Yil: new Date().getFullYear(), BitisTarihi: null, Durum: "Aktif" };
    const kalemler = malzemeler.map(m => ({
      DonemID: 1, TAINo: m.TAINo, MalzemeAdi: m.ProductName, ZimmetSahibi: m.Depositary,
      Durum: "Bekliyor", KontrolTarihi: null, KontrolEden: null
    }));
    return { malzemeler, donem, kalemler };
  }

  function load() {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {}
    const s = seed(); save(s); return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  const tr = s => (s || "").toString().toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const norm = s => (s || "").toString().trim().toUpperCase().replace(/\s+/g, "");
  const delay = ms => new Promise(r => setTimeout(r, ms));

  return {
    isDemo: true,

    async login(sicil, parola) {
      await delay(250);
      if (!sicil || parola !== "demo") throw new Error("Sicil veya parola hatalı (demo parolası: demo)");
      return { sicil: String(sicil).trim(), ad: "Demo Kullanıcı" };
    },

    async getDonem() { await delay(60); return load().donem; },

    async listPersons() {
      await delay(60);
      return [...new Set(load().kalemler.map(k => k.ZimmetSahibi))].sort((a, b) => a.localeCompare(b, "tr"));
    },

    async listKalem(person) {
      await delay(60);
      const s = load();
      return s.kalemler
        .filter(k => !person || k.ZimmetSahibi === person)
        .map(k => {
          const m = s.malzemeler.find(x => x.TAINo === k.TAINo) || {};
          return { ...k, ShelfNo: m.ShelfNo || "", SerialNo: m.SerialNo || "", Producer: m.Producer || "" };
        });
    },

    /** TAI NO ile kalemi bulur (barkod yedek anahtar değildir). */
    async findKalem(tai) {
      await delay(40);
      const s = load(), t = norm(tai);
      const k = s.kalemler.find(x => norm(x.TAINo) === t);
      if (!k) return null;
      const m = s.malzemeler.find(x => x.TAINo === k.TAINo) || {};
      return { ...k, ShelfNo: m.ShelfNo || "", SerialNo: m.SerialNo || "", Producer: m.Producer || "" };
    },

    async setDurum(tai, durum, kontrolEden) {
      await delay(60);
      const s = load();
      const k = s.kalemler.find(x => norm(x.TAINo) === norm(tai));
      if (!k) throw new Error("Kalem bulunamadı");
      k.Durum = durum;
      k.KontrolTarihi = durum === "Bekliyor" ? null : new Date().toISOString();
      k.KontrolEden = durum === "Bekliyor" ? null : kontrolEden;
      save(s);
      return k;
    },

    async search(q) {
      await delay(60);
      const s = load(), t = tr(q).trim();
      if (!t) return [];
      const words = t.split(/\s+/);
      return s.malzemeler.filter(m => {
        const hay = tr([m.TAINo, m.ProductName, m.Producer, m.ComponentNo, m.SerialNo, m.Depositary, m.ShelfNo].join(" "));
        return words.every(w => hay.includes(w));
      }).map(m => {
        const k = s.kalemler.find(x => x.TAINo === m.TAINo);
        return { ...m, Durum: k ? k.Durum : null };
      });
    },

    async resetDemo() { save(seed()); }
  };
})();
