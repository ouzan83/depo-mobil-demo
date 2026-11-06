/* Kamera ile barkod/QR okuma.
 * 1) Tarayıcının yerleşik BarcodeDetector'ı varsa onu kullanır (Android Chrome: hızlı).
 * 2) Yoksa ZXing kütüphanesini (lib/zxing.min.js) yükleyip onu kullanır (iPhone Safari vb.).
 * Kamera yalnızca HTTPS veya localhost üzerinde açılır.
 */
const Scanner = (() => {
  let stream = null, running = false, rafId = 0, zxingReader = null;
  const FORMATS = ["code_128", "code_39", "code_93", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar", "qr_code", "data_matrix"];
  const ZXING_URL = "lib/zxing.min.js";

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (window.ZXing) return res();
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Okuyucu kütüphanesi yüklenemedi"));
      document.head.appendChild(s);
    });
  }

  async function start(video, onCode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      throw new Error("Kamera bu bağlantıda kullanılamıyor (HTTPS gerekir)");
    running = true;

    if ("BarcodeDetector" in window) {
      let formats = FORMATS;
      try {
        const sup = await BarcodeDetector.getSupportedFormats();
        formats = FORMATS.filter(f => sup.includes(f));
      } catch (e) {}
      const detector = new BarcodeDetector({ formats });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false
      });
      video.srcObject = stream;
      await video.play();
      let busy = false;
      const tick = async () => {
        if (!running) return;
        if (!busy && video.readyState >= 2) {
          busy = true;
          try {
            const codes = await detector.detect(video);
            if (codes.length) onCode(codes[0].rawValue);
          } catch (e) {}
          busy = false;
        }
        rafId = requestAnimationFrame(tick);
      };
      tick();
      return;
    }

    await loadScript(ZXING_URL);
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    zxingReader = new ZXing.BrowserMultiFormatReader(hints);
    await zxingReader.decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" } }, audio: false }, video,
      (result) => { if (result && running) onCode(result.getText()); }
    );
  }

  function stop(video) {
    running = false;
    cancelAnimationFrame(rafId);
    if (zxingReader) { try { zxingReader.reset(); } catch (e) {} zxingReader = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (video) video.srcObject = null;
  }

  return { start, stop };
})();
