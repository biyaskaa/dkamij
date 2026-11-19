(() => {
  const ITER = 250000;
  const KEY_STORE = "dkamij-key";
  const V = "8";
  const form = document.getElementById("lock-form");
  const input = document.getElementById("pw");
  const err = document.getElementById("lock-error");
  const btn = document.getElementById("lock-btn");
  const enc = new TextEncoder();
  let vault = null, aesKey = null;

  const normalize = s => s.toLowerCase().replace(/\s+/g, "").replace(/ё/g, "е");

  const fetchBin = async name => {
    const r = await fetch(`${name}.bin?v=${V}`);
    if (!r.ok) throw new Error("vault");
    return new Uint8Array(await r.arrayBuffer());
  };
  const getVault = async () => (vault = vault || await fetchBin("vault"));

  async function deriveRaw(password, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, 256);
    return new Uint8Array(bits);
  }

  const open = (bytes) => crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, aesKey, bytes.slice(12));

  // медиа (голосовое, песни) расшифровываются только при первом нажатии «играть»
  const mediaCache = {};
  window.loadMedia = (name, type = "audio/mpeg") => mediaCache[name] || (mediaCache[name] = (async () => {
    const plain = await open(await fetchBin(name));
    return URL.createObjectURL(new Blob([plain], { type }));
  })());

  async function openWithRaw(raw) {
    const v = await getVault();
    aesKey = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    const plain = await open(v.slice(16));
    const P = JSON.parse(new TextDecoder().decode(plain));
    window.LOVE = P.data;
    // весь сайт (разметка, стили, код) хранится зашифрованным и собирается только здесь
    const st = document.createElement("style");
    st.textContent = P.app.css;
    document.head.appendChild(st);
    document.getElementById("lock").insertAdjacentHTML("beforebegin", P.app.html);
    const sc = document.createElement("script");
    sc.textContent = P.app.js;
    document.body.appendChild(sc);
    document.body.classList.remove("locked");
    document.getElementById("lock").remove();
    document.title = P.data.couple || document.title;
    window.startSite();
  }

  // iOS разрешает звук только после нажатия: «разогреваем» плеер прямо в момент нажатия
  const SILENT = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAACAAAA/oAR0dHR0dHR0dHR0dHYmJiYmJiYmJiYmJifHx8fHx8fHx8fHx8fJaWlpaWlpaWlpaWlrGxsbGxsbGxsbGxsbHLy8vLy8vLy8vLy8vl5eXl5eXl5eXl5eXl////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQC1AAAAAAAAAP6yysejgAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
  function primeAudio() {
    try {
      if (!window.bgAudio) window.bgAudio = new Audio();
      const a = window.bgAudio;
      if (a.dataset.primed) return;
      a.src = SILENT;
      const p = a.play();
      if (p && p.then) p.then(() => { a.dataset.primed = "1"; }).catch(() => {});
    } catch (e) {}
  }
  window.primeAudio = primeAudio;

  const toHex = a => Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  const fromHex = h => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));

  if (!window.crypto || !crypto.subtle) {
    err.textContent = "Этот браузер не может открыть сайт. Открой ссылку в Safari или Chrome.";
    btn.disabled = true;
    return;
  }

  try {
    const saved = localStorage.getItem(KEY_STORE);
    if (saved) openWithRaw(fromHex(saved)).catch(() => localStorage.removeItem(KEY_STORE));
  } catch (e) {}

  form.addEventListener("submit", async e => {
    e.preventDefault();
    primeAudio();
    err.textContent = "";
    btn.disabled = true;
    btn.textContent = "Открываю…";
    try {
      const v = await getVault();
      const raw = await deriveRaw(normalize(input.value), v.slice(0, 16));
      await openWithRaw(raw);
      try { localStorage.setItem(KEY_STORE, toHex(raw)); } catch (e2) {}
    } catch (ex) {
      err.textContent = ex && ex.message === "vault"
        ? "Не получилось загрузить сайт. Проверь интернет и попробуй ещё раз."
        : "Пароль не подошёл. Попробуй ещё раз.";
      btn.disabled = false;
      btn.textContent = "Открыть";
      input.select();
    }
  });
})();
