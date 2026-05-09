/* ================================================================
   🎨 لعبة الألوان بالفرنسية — Jeu des couleurs
   - نطق اسم اللون بالفرنسية (Web Speech API)
   - مؤقّت 10 ثواني + فرصة 10 ثواني إضافية
   - أصوات: فوز (تصفيق + نغمة)، خسارة (بكاء)، تنازل الوقت (تِك-تِك)
================================================================ */

// قائمة الألوان بالفرنسية + قيمة HEX للعرض لاحقاً إذا أردنا
const COLORS = [
  { fr: "Rouge",   hex: "#e53935" },
  { fr: "Bleu",    hex: "#1e88e5" },
  { fr: "Jaune",   hex: "#fdd835" },
  { fr: "Vert",    hex: "#43a047" },
  { fr: "Orange",  hex: "#fb8c00" },
  { fr: "Violet",  hex: "#8e24aa" },
  { fr: "Rose",    hex: "#ec407a" },
  { fr: "Noir",    hex: "#212121" },
  { fr: "Blanc",   hex: "#f5f5f5" },
  { fr: "Marron",  hex: "#6d4c41" },
  { fr: "Gris",    hex: "#757575" },
  { fr: "Bleu ciel", hex: "#4fc3f7" }
];

// الحالة
const state = {
  current: null,        // اللون الحالي
  timeLeft: 10,
  timer: null,
  bonusGiven: false,    // هل تم استخدام فرصة الـ 10 ثواني الإضافية؟
  inGame: false,
  score: { win: 0, lose: 0 }
};

// ================== الصوت (Web Audio API) ==================
let audioCtx = null;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// نغمة بسيطة
function tone(freq, duration = 0.2, type = "sine", gain = 0.2, when = 0) {
  const ctx = ac();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(ctx.destination);
  const t = ctx.currentTime + when;
  osc.start(t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.stop(t + duration + 0.02);
}

// صوت الفوز: لحن صاعد + "تصفيق" عبر ضوضاء قصيرة
function playWinSound() {
  // لحن صاعد
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => tone(f, 0.18, "triangle", 0.25, i * 0.15));
  // تصفيق (ضوضاء)
  setTimeout(() => clapBurst(6), 700);
}

function clapBurst(count = 5) {
  const ctx = ac();
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        // ضوضاء تتلاشى
        data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2000;
      src.connect(filter).connect(g).connect(ctx.destination);
      src.start();
    }, i * 110);
  }
}

// صوت البكاء (نغمة متموّجة نازلة)
function playCrySound() {
  const ctx = ac();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = 420;

  // اهتزاز (يعطي إحساس البكاء "وا وا")
  lfo.frequency.value = 5;
  lfoGain.gain.value = 60;
  lfo.connect(lfoGain).connect(osc.frequency);

  g.gain.value = 0.3;
  osc.connect(g).connect(ctx.destination);

  const t = ctx.currentTime;
  osc.start(t); lfo.start(t);

  // انحدار تدريجي للتردد
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.linearRampToValueAtTime(220, t + 1.4);
  g.gain.setValueAtTime(0.35, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

  osc.stop(t + 1.7); lfo.stop(t + 1.7);
}

// صوت "تِك" كل ثانية في الوقت الإضافي (تنازلي)
function tickSound() {
  tone(900, 0.05, "square", 0.1);
}

// نطق اسم اللون بالفرنسية
function speakFrench(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = 0.9;
    u.pitch = 1.05;
    // اختيار صوت فرنسي إن وُجد
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("fr"));
    if (frVoice) u.voice = frVoice;
    window.speechSynthesis.speak(u);
  } catch (e) { console.warn(e); }
}

// تأكد من تحميل الأصوات (بعض المتصفحات تحمّلها بشكل غير متزامن)
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
}

// ================== واجهة الألوان ==================
function buildGrid() {
  const grid = document.getElementById("colorsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  // ترتيب عشوائي لكل دخول للصفحة
  const shuffled = [...COLORS].sort(() => Math.random() - 0.5);
  shuffled.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "color-btn";
    btn.textContent = c.fr;
    btn.dataset.fr = c.fr;
    btn.dataset.hex = c.hex;
    btn.addEventListener("click", () => startChallenge(c));
    grid.appendChild(btn);
  });
}

// ================== التحدي ==================
function startChallenge(color) {
  if (state.inGame) return;
  state.inGame = true;
  state.current = color;
  state.bonusGiven = false;

  // عرض النافذة
  document.getElementById("currentColor").textContent = color.fr;
  document.getElementById("overlay").classList.add("show");
  document.getElementById("secondChance").classList.add("hidden");
  document.getElementById("winScreen").classList.add("hidden");
  document.getElementById("mainActions").classList.remove("hidden");

  // نطق الكلمة ثم بدء المؤقّت
  speakFrench(color.fr);
  // انتظار بسيط حتى ينتهي النطق تقريباً
  setTimeout(() => startTimer(10), 300);
}

// حالة المؤقّت
function startTimer(seconds) {
  clearInterval(state.timer);
  state.timeLeft = seconds;
  updateTimerUI(seconds, seconds);
  state.timer = setInterval(() => {
    state.timeLeft--;
    updateTimerUI(state.timeLeft, seconds);
    if (state.timeLeft <= 3 && state.timeLeft > 0) tickSound();
    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      onTimeUp();
    }
  }, 1000);
}

function updTimerColor(fg, ratio) {
  fg.classList.remove("warning", "danger");
  if (ratio <= 0.33) fg.classList.add("danger");
  else if (ratio <= 0.66) fg.classList.add("warning");
}

function updateTimerUI(left, total) {
  const fg = document.getElementById("timerFg");
  const txt = document.getElementById("timerText");
  const CIRC = 2 * Math.PI * 54; // 339.292
  const ratio = Math.max(0, left / total);
  fg.style.strokeDashoffset = (CIRC * (1 - ratio)).toFixed(2);
  updTimerColor(fg, ratio);
  txt.textContent = Math.max(0, left);
}

// انتهى الوقت
function onTimeUp() {
  if (!state.bonusGiven) {
    // أول مرة: اعرض نافذة البكاء + زر الـ 10 ثواني الإضافية
    playCrySound();
    document.getElementById("mainActions").classList.add("hidden");
    document.getElementById("secondChance").classList.remove("hidden");
  } else {
    // انتهى الوقت الإضافي أيضاً -> خسارة نهائية
    state.score.lose++;
    saveScore();
    renderScore();
    playCrySound();
    // إغلاق تلقائي بعد لحظة
    setTimeout(() => closeGame(true), 1500);
  }
}

// زر "فرصة +10 ثواني"
function giveBonusTime() {
  state.bonusGiven = true;
  document.getElementById("secondChance").classList.add("hidden");
  document.getElementById("mainActions").classList.remove("hidden");
  // أعد نطق الكلمة كتذكير
  speakFrench(state.current.fr);
  setTimeout(() => startTimer(10), 250);
}

// زر "Vainqueur"
function declareWin() {
  if (!state.inGame) return;
  clearInterval(state.timer);
  state.score.win++;
  saveScore();
  renderScore();

  document.getElementById("mainActions").classList.add("hidden");
  document.getElementById("secondChance").classList.add("hidden");
  document.getElementById("winScreen").classList.remove("hidden");

  playWinSound();
  // نطق تهنئة بالفرنسية
  setTimeout(() => speakFrench("Bravo ! Tu as gagné !"), 400);
}

// إعادة نطق اللون
function speakCurrent() {
  if (state.current) speakFrench(state.current.fr);
}

// إغلاق النافذة
function closeGame(force) {
  clearInterval(state.timer);
  state.inGame = false;
  state.current = null;
  document.getElementById("overlay").classList.remove("show");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ================== النتائج ==================
function saveScore() {
  localStorage.setItem("colorGameScore", JSON.stringify(state.score));
}
function loadScore() {
  try {
    const s = JSON.parse(localStorage.getItem("colorGameScore") || "{}");
    state.score.win = s.win || 0;
    state.score.lose = s.lose || 0;
  } catch (e) {}
}
function renderScore() {
  const w = document.getElementById("scoreWin");
  const l = document.getElementById("scoreLose");
  if (w) w.textContent = state.score.win;
  if (l) l.textContent = state.score.lose;
}
function resetScore() {
  state.score = { win: 0, lose: 0 };
  saveScore();
  renderScore();
}

// ================== الترجمة (عربية/فرنسية) ==================
const gameI18n = {
  ar: {
    subTitle: "لعبة الألوان — Jeu des couleurs",
    gTitle: "🎨 لعبة الألوان بالفرنسية",
    gChoose: "اختر كلمة لون:",
    modalLabel: "ابحث عن اللون:",
    btnWin: "🏆 Vainqueur",
    btnRepeat: "🔊 إعادة الاستماع",
    chanceText: "انتهى الوقت! هل تريد 10 ثواني إضافية؟",
    btnBonus: "⏱️ +10 ثواني",
    btnGiveUp: "استسلام",
    winText: "Bravo ! أحسنت، لقد فزت!",
    btnContinue: "متابعة",
    btnReset: "إعادة العدّ"
  },
  fr: {
    subTitle: "Jeu des couleurs",
    gTitle: "🎨 Jeu des couleurs en français",
    gChoose: "Choisis un nom de couleur :",
    modalLabel: "Cherche la couleur :",
    btnWin: "🏆 Vainqueur",
    btnRepeat: "🔊 Répéter",
    chanceText: "Temps écoulé ! Veux-tu 10 secondes de plus ?",
    btnBonus: "⏱️ +10 secondes",
    btnGiveUp: "Abandonner",
    winText: "Bravo ! Tu as gagné !",
    btnContinue: "Continuer",
    btnReset: "Réinitialiser"
  }
};

function applyGameLang() {
  const cur = localStorage.getItem("lang") || "ar";
  const t = gameI18n[cur] || gameI18n.ar;
  Object.entries(t).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
  // الوصف يحتوي HTML، نبقيه عربياً كما هو؛ عند الفرنسية نستبدله
  const desc = document.getElementById("gDesc");
  if (desc) {
    desc.innerHTML = cur === "fr"
      ? `Clique sur un nom de couleur. Il sera prononcé en français, puis tu as <strong>10 secondes</strong> pour trouver cette couleur dans la classe. Si tu la trouves, appuie sur <strong>Vainqueur</strong> 🏆. Sinon, tu auras <strong>10 secondes</strong> de plus comme dernière chance.`
      : `اضغط على اسم اللون. سيتم نطقه بالفرنسية، ثم لديك <strong>10 ثواني</strong> للبحث عن هذا اللون في القسم. إذا وجدته اضغط <strong>Vainqueur</strong> 🏆، وإن انتهى الوقت ستحصل على <strong>10 ثواني إضافية</strong> كفرصة أخيرة.`;
  }
}

// ================== تشغيل ==================
document.addEventListener("DOMContentLoaded", () => {
  buildGrid();
  loadScore();
  renderScore();
  applyGameLang();

  // إعادة تطبيق الترجمة عند تبديل اللغة (لأن toggleLang في app.js)
  const origToggle = window.toggleLang;
  if (typeof origToggle === "function") {
    window.toggleLang = function () {
      origToggle();
      applyGameLang();
    };
  }

  // تفعيل السياق الصوتي عند أول تفاعل (سياسة المتصفحات)
  document.body.addEventListener("click", () => ac(), { once: true });
});
