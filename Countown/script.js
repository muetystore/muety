/**
 * MUETY — SAREES FOR YOUR STORY
 * Interactive Grand Launch & Countdown Engine
 * Target Launch: Sunday, October 18, 2026 08:00:00 IST (Asia/Kolkata UTC+05:30)
 */

document.addEventListener('DOMContentLoaded', () => {
  initLaunchGate();
  initCountdown();
  initParticleBackground();
  initFireworksEngine();
  initLookbookModal();
  initNewsletterForm();
});

/* ==========================================================================
   CENTRALIZED LAUNCH GATE & STORE REVEAL SYSTEM
   ========================================================================== */
const OFFICIAL_LAUNCH_ISO = '2026-10-18T08:00:00+05:30';

const launchGateState = {
  status: 'PRE_LAUNCH', // 'PRE_LAUNCH' | 'LIVE'
  launchAt: OFFICIAL_LAUNCH_ISO,
  launchTimestamp: new Date(OFFICIAL_LAUNCH_ISO).getTime(),
  serverTimeOffset: 0,
  storeUrl: '',
  isVerifiedWithServer: false,
  isStoreRevealed: false
};

let countdownTargetTimestamp = launchGateState.launchTimestamp;
let isAudioMuted = true;
let audioCtx = null;
let countdownTimerId = null;
let selectedTimezone = 'IST';

async function initLaunchGate() {
  await checkServerLaunchState();
  // Poll server state every 30 seconds to synchronize client clock & detect launch
  setInterval(checkServerLaunchState, 30000);
}

async function checkServerLaunchState() {
  try {
    const apiEndpoint = (window.location.protocol === 'file:' || !window.location.host)
      ? 'http://localhost:3000/api/launch-status'
      : '/api/launch-status';

    const res = await fetch(apiEndpoint, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      launchGateState.isVerifiedWithServer = true;
      launchGateState.status = data.status || 'PRE_LAUNCH';
      if (data.launchAt) launchGateState.launchAt = data.launchAt;
      if (data.launchTimestamp) {
        launchGateState.launchTimestamp = data.launchTimestamp;
        countdownTargetTimestamp = data.launchTimestamp;
      }
      if (typeof data.serverTimestamp === 'number') {
        launchGateState.serverTimeOffset = data.serverTimestamp - Date.now();
      }
      if (data.storeUrl) launchGateState.storeUrl = data.storeUrl;

      if (launchGateState.status === 'LIVE') {
        handleLiveStoreReveal(false);
      }
    }
  } catch (err) {
    // Fail-closed fallback: compare server-offset/local time against official IST launch timestamp
    const now = Date.now() + launchGateState.serverTimeOffset;
    if (now >= launchGateState.launchTimestamp) {
      launchGateState.status = 'LIVE';
      handleLiveStoreReveal(false);
    } else {
      launchGateState.status = 'PRE_LAUNCH';
    }
  }
}

function handleLiveStoreReveal(isZeroCountdownTransition = false) {
  if (launchGateState.isStoreRevealed) return;

  const celebrationBanner = document.getElementById('countdownEndCelebration');
  const launchPill = document.getElementById('launchDatePill');

  if (celebrationBanner) celebrationBanner.classList.remove('hidden');

  if (launchPill) {
    launchPill.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
        <line x1="9" y1="9" x2="9.01" y2="9"></line>
        <line x1="15" y1="9" x2="15.01" y2="9"></line>
      </svg>
      <span>Grand Launch: <strong>🎊 CELEBRATION IS LIVE NOW! 🎊</strong></span>
    `;
  }

  const targetStoreUrl = launchGateState.storeUrl || getFallbackStoreDestination();

  if (isZeroCountdownTransition) {
    // Zero countdown reached while user is watching
    playCelebrationFanfare();
    triggerGrandFireworksCelebration(true);

    // Allow 3.2 seconds for celebration before redirecting/revealing store
    setTimeout(() => {
      executeStoreNavigation(targetStoreUrl);
    }, 3200);
  } else {
    // Visitor arrived after launch moment
    executeStoreNavigation(targetStoreUrl);
  }
}

function getFallbackStoreDestination() {
  if (window.location.protocol === 'file:' || !window.location.host) {
    return null; // Local file preview mode - remain on page with live banner
  }
  return window.location.origin + '/store';
}

function executeStoreNavigation(targetUrl) {
  if (!targetUrl) return;
  launchGateState.isStoreRevealed = true;
  try {
    if (window.location.href !== targetUrl && window.location.pathname !== '/store') {
      window.location.href = targetUrl;
    }
  } catch (err) {
    console.error('Failed to navigate to store:', err);
    showStoreFallbackNotice();
  }
}

function showStoreFallbackNotice() {
  const overlay = document.getElementById('storeFallbackOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

/* ==========================================================================
   1. ADVANCED REAL-TIME COUNTDOWN TIMER & PROGRESS ENGINE
   ========================================================================== */
function initCountdown() {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  const ringDays = document.getElementById('ringDays');
  const ringHours = document.getElementById('ringHours');
  const ringMinutes = document.getElementById('ringMinutes');
  const ringSeconds = document.getElementById('ringSeconds');

  const CIRCUMFERENCE = 2 * Math.PI * 54; // 339.292

  if (ringDays) ringDays.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  if (ringHours) ringHours.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  if (ringMinutes) ringMinutes.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  if (ringSeconds) ringSeconds.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;

  let countdownEnded = false;
  let initialTotalDays = Math.max(1, Math.ceil((countdownTargetTimestamp - Date.now()) / (1000 * 60 * 60 * 24)));

  function updateClock() {
    const now = Date.now() + launchGateState.serverTimeOffset;
    const distance = countdownTargetTimestamp - now;

    if (distance <= 0) {
      setDigitVal(daysEl, 0);
      setDigitVal(hoursEl, 0);
      setDigitVal(minutesEl, 0);
      setDigitVal(secondsEl, 0);

      setRingOffset(ringDays, 1, CIRCUMFERENCE);
      setRingOffset(ringHours, 1, CIRCUMFERENCE);
      setRingOffset(ringMinutes, 1, CIRCUMFERENCE);
      setRingOffset(ringSeconds, 1, CIRCUMFERENCE);

      if (!countdownEnded) {
        countdownEnded = true;
        launchGateState.status = 'LIVE';
        handleLiveStoreReveal(true);
      }
      return;
    } else {
      countdownEnded = false;
    }

    // Precise Time Calculations (Fixed Minutes Math Bug!)
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Update Digits with Pulse Animation
    setDigitVal(daysEl, days);
    setDigitVal(hoursEl, hours);
    setDigitVal(minutesEl, minutes);
    setDigitVal(secondsEl, seconds);

    // Audio Tick on Second pulse if unmuted
    if (!isAudioMuted && distance > 0) {
      playTickSound();
    }

    // Update SVG Progress Rings
    const daysFraction = Math.min(days / Math.max(30, initialTotalDays), 1);
    const hoursFraction = hours / 24;
    const minutesFraction = minutes / 60;
    const secondsFraction = seconds / 60;

    setRingOffset(ringDays, daysFraction, CIRCUMFERENCE);
    setRingOffset(ringHours, hoursFraction, CIRCUMFERENCE);
    setRingOffset(ringMinutes, minutesFraction, CIRCUMFERENCE);
    setRingOffset(ringSeconds, secondsFraction, CIRCUMFERENCE);
  }

  function setDigitVal(el, num) {
    if (!el) return;
    const padded = padZero(num);
    if (el.innerText !== padded) {
      el.innerText = padded;
      el.classList.remove('tick-pop');
      void el.offsetWidth; // force reflow for CSS animation restart
      el.classList.add('tick-pop');
    }
  }

  function setRingOffset(ringElement, fraction, circumference) {
    if (!ringElement) return;
    const offset = circumference - (fraction * circumference);
    ringElement.style.strokeDashoffset = offset;
  }

  function padZero(num) {
    return num < 10 ? '0' + num : '' + num;
  }

  // Clear existing timer if any
  if (countdownTimerId) clearInterval(countdownTimerId);

  updateClock();
  countdownTimerId = setInterval(updateClock, 1000);

  // Initialize interactive controls & modals
  initCountdownTools();
  updateTimezoneDisplay();
}

/* Audio Synthesizer via Web Audio API */
function playTickSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch (e) {}
}

function playCelebrationFanfare() {
  if (isAudioMuted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }, idx * 130);
    });
  } catch (e) {}
}

/* Interactive Countdown Control Toolbar & Modals */
function initCountdownTools() {
  const btnCalendar = document.getElementById('btnCalendar');
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const tzSelect = document.getElementById('tzSelect');

  // Calendar Modal elements
  const calendarModal = document.getElementById('calendarModal');
  const closeCalendarModal = document.getElementById('closeCalendarModal');
  const btnDownloadIcs = document.getElementById('btnDownloadIcs');
  const btnGoogleCalendar = document.getElementById('btnGoogleCalendar');

  // Sound Toggle Button
  btnSoundToggle?.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    const soundIcon = document.getElementById('soundIcon');
    const soundLabel = document.getElementById('soundLabel');
    if (isAudioMuted) {
      btnSoundToggle.classList.remove('active');
      if (soundIcon) soundIcon.innerText = '🔇';
      if (soundLabel) soundLabel.innerText = 'Audio Off';
    } else {
      btnSoundToggle.classList.add('active');
      if (soundIcon) soundIcon.innerText = '🔊';
      if (soundLabel) soundLabel.innerText = 'Audio On';
      playTickSound(); // test tick
    }
  });

  // Timezone Selector
  tzSelect?.addEventListener('change', (e) => {
    selectedTimezone = e.target.value;
    updateTimezoneDisplay();
  });

  // Calendar Modal Triggers
  btnCalendar?.addEventListener('click', () => {
    calendarModal?.classList.remove('hidden');
  });

  closeCalendarModal?.addEventListener('click', () => calendarModal?.classList.add('hidden'));

  btnDownloadIcs?.addEventListener('click', () => downloadIcsFile());
  btnGoogleCalendar?.addEventListener('click', () => openGoogleCalendar());
}

function updateTimezoneDisplay() {
  const textEl = document.getElementById('launchDateText');
  if (!textEl) return;

  const targetDate = new Date(countdownTargetTimestamp);

  let formattedDateStr = '';
  if (selectedTimezone === 'IST') {
    formattedDateStr = 'Sunday, October 18, 2026 • 8:00 AM IST';
    if (countdownTargetTimestamp !== new Date(OFFICIAL_LAUNCH_ISO).getTime()) {
      formattedDateStr = targetDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }) + ' IST';
    }
  } else if (selectedTimezone === 'LOCAL') {
    formattedDateStr = targetDate.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) + ' (Your Local Time)';
  } else if (selectedTimezone === 'UTC') {
    formattedDateStr = targetDate.toUTCString();
  } else if (selectedTimezone === 'EST') {
    formattedDateStr = targetDate.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }) + ' EST';
  } else if (selectedTimezone === 'PST') {
    formattedDateStr = targetDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'full', timeStyle: 'short' }) + ' PST';
  }

  textEl.innerHTML = `Grand Launch: <strong>${formattedDateStr}</strong>`;
}

function downloadIcsFile() {
  const targetDate = new Date(countdownTargetTimestamp);
  const isoStart = targetDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endDate = new Date(targetDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
  const isoEnd = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Muety Sarees//Grand Launch Countdown//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
SUMMARY:Muety Sarees Grand Diwali Launch (Flat 50% Offer)
DESCRIPTION:Grand Launch of Muety — Sarees For Your Story. Flat 50% Diwali Launch discount on pure Kanjivaram and Banarasi handloom silk sarees!
LOCATION:https://muety.com
DTSTART:${isoStart}
DTEND:${isoEnd}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'Muety_Grand_Launch_Reminder.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  document.getElementById('calendarModal')?.classList.add('hidden');
}

function openGoogleCalendar() {
  const targetDate = new Date(countdownTargetTimestamp);
  const isoStart = targetDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endDate = new Date(targetDate.getTime() + 2 * 60 * 60 * 1000);
  const isoEnd = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Muety Sarees Grand Diwali Launch & 50% Offer')}&dates=${isoStart}/${isoEnd}&details=${encodeURIComponent('Flat 50% Diwali Discount on Pure Silk Kanjivaram & Banarasi Sarees!')}&location=${encodeURIComponent('https://muety.com')}`;
  window.open(url, '_blank');
  document.getElementById('calendarModal')?.classList.add('hidden');
}

/* ==========================================================================
   2. GOLDEN DUST & SPARKLE CANVAS PARTICLES
   ========================================================================== */
function initParticleBackground() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = Math.min(Math.floor(width / 18), 75);
  const particles = [];

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.2 + 0.6;
      this.speedY = Math.random() * 0.4 + 0.15;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.7 + 0.2;
      this.twinkleSpeed = Math.random() * 0.02 + 0.008;
      this.hue = Math.random() > 0.3 ? 43 : 340; // 43=Gold, 340=Crimson Rose
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX;
      this.opacity += Math.sin(Date.now() * this.twinkleSpeed) * 0.015;

      if (this.opacity < 0.1) this.opacity = 0.1;
      if (this.opacity > 0.9) this.opacity = 0.9;

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.hue === 43 
        ? `rgba(242, 219, 131, ${this.opacity})` 
        : `rgba(212, 175, 55, ${this.opacity * 0.8})`;
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   3. LOOKBOOK QUICK VIEW MODAL
   ========================================================================== */
const collectionDetailsData = {
  kanjivaram: {
    title: "The Royal Kanjivaram Heirlooms",
    tag: "Handloom Pure Mulberry Silk",
    image: "assets/images/kanjivaram.jpg",
    desc: "Woven in the temple city of Kanchipuram using 3-ply twisted silk and interlocking 'Korvai' border technique. Features authentic 24kt gold-dipped silver zari motifs representing the auspicious peacock (Mayil) and sacred lotus.",
    highlights: ["100% Pure Mulberry Silk Mark Certified", "Authentic Tested Real Gold Zari", "Hand-tasseled contrast Pallu", "Exclusive 1 of 1 Weave Edition"]
  },
  banarasi: {
    title: "The Crimson Empress Banarasi",
    tag: "Heritage Varanasi Katan Silk",
    image: "assets/images/hero.jpg",
    desc: "A signature masterpiece crafted on traditional pit looms over 45 days. The intricate Shikargah floral jaal and royal red hue reflect the majesty of imperial Indian weddings and festive opulence.",
    highlights: ["Pure Katan Silk Handloom", "Intricate Kadwa Zari Weave Technique", "Heirloom Grade Bridal Trousseau", "Complimentary Custom Blouse Styling"]
  },
  organza: {
    title: "Rose Whisper Tissue Organza",
    tag: "Contemporary Festive Luxe",
    image: "assets/images/organza.jpg",
    desc: "Delicately sheer yet shimmering with metallic tissue warps, finished with artisanal cutwork borders and handcrafted sequin highlights. Effortless draping tailored for twilight receptions and festive soirees.",
    highlights: ["Featherweight Breathable Drape", "Subtle Metallic Rose Gold Sheen", "Artisan Scallop Cutwork Border", "Modern Minimalist Silhouette"]
  }
};

function initLookbookModal() {
  const modal = document.getElementById('lookbookModal');
  const detailsContainer = document.getElementById('lookbookModalDetails');
  const closeBtn = document.getElementById('closeLookbookModal');

  document.querySelectorAll('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.getAttribute('data-collection') || 'banarasi';
      const data = collectionDetailsData[type];
      if (!data || !detailsContainer) return;

      detailsContainer.innerHTML = `
        <img src="${data.image}" alt="${data.title}" class="lookbook-modal-img">
        <div class="lookbook-modal-info">
          <span class="collection-tag">${data.tag}</span>
          <h3 class="collection-title" style="font-size: 1.8rem; margin-bottom: 12px;">${data.title}</h3>
          <p class="collection-desc" style="margin-bottom: 20px;">${data.desc}</p>
          <ul style="list-style: none; margin-bottom: 24px;">
            ${data.highlights.map(h => `<li style="margin-bottom: 8px; font-size: 0.85rem; color: #E8D8C5;">✦ ${h}</li>`).join('')}
          </ul>
          <button class="btn-royal-primary" onclick="closeLookbook()" style="text-align: center; justify-content: center; cursor: pointer;">
            Close Preview
          </button>
        </div>
      `;

      modal.classList.remove('hidden');
    });
  });

  closeBtn?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
}

function closeLookbook() {
  document.getElementById('lookbookModal')?.classList.add('hidden');
}

/* ==========================================================================
   5. INTERACTIVE SIGNATURE DRAPE FINDER (QUIZ)
   ========================================================================== */
let quizAnswers = {};

window.selectQuizOption = function(step, val) {
  quizAnswers[`step${step}`] = val;

  const currentStepEl = document.getElementById(`quizStep${step}`);
  const nextStepEl = document.getElementById(`quizStep${step + 1}`);

  if (currentStepEl) currentStepEl.classList.remove('active');

  if (nextStepEl) {
    nextStepEl.classList.add('active');
  } else {
    showQuizResult();
  }
};

function showQuizResult() {
  const resultBox = document.getElementById('quizResult');
  const resultTitle = document.getElementById('resultTitle');
  const resultDesc = document.getElementById('resultDesc');

  let title = "The Crimson Empress Banarasi";
  let desc = "Your affinity for grand celebrations and royal regal vibes calls for our flagship handloom Katan silk with intricate zardozi golden borders.";

  if (quizAnswers.step2 === 'heavy' || quizAnswers.step1 === 'wedding' || quizAnswers.step3 === 'emerald') {
    title = "The Imperial Kanjivaram Heirloom";
    desc = "Perfect for timeless ceremonies. Pure mulberry silk with heavy korvai temple borders and 24k gold zari motifs that will be treasured for generations.";
  } else if (quizAnswers.step2 === 'crisp' || quizAnswers.step1 === 'cocktail' || quizAnswers.step3 === 'pastels') {
    title = "Rose Whisper Tissue Organza";
    desc = "A dreamy match for modern sophistication. Featherlight translucent sheen accented with subtle scalloped sequin craftsmanship.";
  }

  if (resultTitle) resultTitle.innerText = title;
  if (resultDesc) resultDesc.innerText = desc;
  if (resultBox) resultBox.classList.remove('hidden');
}

window.restartQuiz = function() {
  quizAnswers = {};
  document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
  document.getElementById('quizStep1')?.classList.add('active');
  document.getElementById('quizResult')?.classList.add('hidden');
};

/* ==========================================================================
   6. SPECTACULAR FIREWORKS & CELEBRATION ENGINE
   ========================================================================== */
let fireworksCanvas = null;
let fireworksCtx = null;
let fireworks = [];
let fireworkParticles = [];
let fireworksInterval = null;
let isFireworksLoopActive = false;

const FIREWORK_COLORS = [
  '#FFD700', // Royal 24K Gold
  '#FFF275', // Champagne Sparkle
  '#FF0844', // Imperial Crimson
  '#FF4E50', // Radiant Festive Rose
  '#E056FD', // Royal Violet
  '#00F2FE', // Electric Cyan Shimmer
  '#00E676', // Emerald Jewel Green
  '#FF9100'  // Festive Diya Saffron
];

function initFireworksEngine() {
  fireworksCanvas = document.getElementById('fireworksCanvas');
  if (!fireworksCanvas) return;
  fireworksCtx = fireworksCanvas.getContext('2d');

  function resizeFireworks() {
    if (!fireworksCanvas) return;
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
  }
  resizeFireworks();
  window.addEventListener('resize', resizeFireworks);
}

class FireworkRocket {
  constructor(startX, startY, targetX, targetY, color) {
    this.x = startX;
    this.y = startY;
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.distanceToTarget = Math.hypot(targetX - startX, targetY - startY);
    this.distanceTraveled = 0;
    this.coordinates = [];
    this.coordinateCount = 3;
    while (this.coordinateCount--) {
      this.coordinates.push([this.x, this.y]);
    }
    this.angle = Math.atan2(targetY - startY, targetX - startX);
    this.speed = 4;
    this.acceleration = 1.05;
    this.color = color;
  }

  update(index) {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);

    this.speed *= this.acceleration;
    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    this.distanceTraveled = Math.hypot(this.x - this.startX, this.y - this.startY);

    if (this.distanceTraveled >= this.distanceToTarget) {
      explodeFirework(this.targetX, this.targetY, this.color);
      fireworks.splice(index, 1);
    } else {
      this.x += vx;
      this.y += vy;
    }
  }

  draw() {
    if (!fireworksCtx) return;
    fireworksCtx.beginPath();
    fireworksCtx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
    fireworksCtx.lineTo(this.x, this.y);
    fireworksCtx.strokeStyle = this.color;
    fireworksCtx.lineWidth = 2.5;
    fireworksCtx.stroke();
  }
}

class FireworkParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.coordinates = [];
    this.coordinateCount = 5;
    while (this.coordinateCount--) {
      this.coordinates.push([this.x, this.y]);
    }
    this.angle = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 8 + 2;
    this.friction = 0.95;
    this.gravity = 0.08;
    this.alpha = 1;
    this.decay = Math.random() * 0.015 + 0.012;
    this.color = color;
  }

  update(index) {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);
    this.speed *= this.friction;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed + this.gravity;
    this.alpha -= this.decay;

    if (this.alpha <= this.decay) {
      fireworkParticles.splice(index, 1);
    }
  }

  draw() {
    if (!fireworksCtx) return;
    fireworksCtx.beginPath();
    fireworksCtx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
    fireworksCtx.lineTo(this.x, this.y);
    fireworksCtx.strokeStyle = this.color;
    fireworksCtx.lineWidth = Math.max(1, this.alpha * 3);
    fireworksCtx.globalAlpha = Math.max(0, this.alpha);
    fireworksCtx.shadowBlur = 12;
    fireworksCtx.shadowColor = this.color;
    fireworksCtx.stroke();
    fireworksCtx.shadowBlur = 0;
  }
}

function explodeFirework(x, y, color) {
  const count = 75;
  for (let i = 0; i < count; i++) {
    fireworkParticles.push(new FireworkParticle(x, y, color));
  }

  // Confetti burst via canvas-confetti
  if (typeof window.confetti === 'function') {
    const originX = x / window.innerWidth;
    const originY = y / window.innerHeight;
    window.confetti({
      particleCount: 40,
      spread: 70,
      origin: { x: originX, y: originY },
      colors: ['#FFD700', '#FF2A6D', '#FFF6D6', '#FFA500', '#00F2FE', '#00E676']
    });
  }
}

function launchSingleFirework() {
  if (!fireworksCanvas) return;
  const startX = Math.random() * fireworksCanvas.width * 0.8 + fireworksCanvas.width * 0.1;
  const startY = fireworksCanvas.height;
  const targetX = Math.random() * fireworksCanvas.width * 0.8 + fireworksCanvas.width * 0.1;
  const targetY = Math.random() * (fireworksCanvas.height * 0.45) + fireworksCanvas.height * 0.08;
  const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

  fireworks.push(new FireworkRocket(startX, startY, targetX, targetY, color));

  if (!isFireworksLoopActive) {
    isFireworksLoopActive = true;
    loopFireworks();
  }
}

function loopFireworks() {
  if (!fireworksCtx || !fireworksCanvas) return;

  if (fireworks.length === 0 && fireworkParticles.length === 0 && !fireworksInterval) {
    fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    isFireworksLoopActive = false;
    return;
  }

  requestAnimationFrame(loopFireworks);

  fireworksCtx.globalCompositeOperation = 'destination-out';
  fireworksCtx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  fireworksCtx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
  fireworksCtx.globalCompositeOperation = 'lighter';

  let i = fireworks.length;
  while (i--) {
    fireworks[i].draw();
    fireworks[i].update(i);
  }

  let j = fireworkParticles.length;
  while (j--) {
    fireworkParticles[j].draw();
    fireworkParticles[j].update(j);
  }
}

function triggerGrandFireworksCelebration(isPermanent = false) {
  // Show celebratory completion banner in UI
  const celebrationBanner = document.getElementById('countdownEndCelebration');
  if (celebrationBanner) {
    celebrationBanner.classList.remove('hidden');
  }

  // Update launch date pill text to celebratory message
  const launchPill = document.getElementById('launchDatePill');
  if (launchPill) {
    launchPill.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
        <line x1="9" y1="9" x2="9.01" y2="9"></line>
        <line x1="15" y1="9" x2="15.01" y2="9"></line>
      </svg>
      <span>Grand Launch: <strong>🎊 CELEBRATION IS LIVE NOW! 🎊</strong></span>
    `;
  }

  // Multi-burst fireworks launches
  launchSingleFirework();
  setTimeout(launchSingleFirework, 220);
  setTimeout(launchSingleFirework, 480);
  setTimeout(launchSingleFirework, 750);

  if (fireworksInterval) clearInterval(fireworksInterval);
  fireworksInterval = setInterval(launchSingleFirework, 650);

  if (!isPermanent) {
    // If testing via demo button, run for 10 seconds
    setTimeout(() => {
      clearInterval(fireworksInterval);
      fireworksInterval = null;
    }, 10000);
  }
}

/* ==========================================================================
   7. NEWSLETTER SUBSCRIPTION ENGINE
   ========================================================================== */
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  const emailInput = document.getElementById('newsletterEmail');
  const submitBtn = document.getElementById('newsletterSubmitBtn');
  const statusMsg = document.getElementById('newsletterStatus');

  if (!form || !emailInput || !submitBtn || !statusMsg) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset status
    statusMsg.innerText = '';
    statusMsg.className = 'newsletter-status-msg';

    const rawEmail = emailInput.value || '';
    const trimmedEmail = rawEmail.trim();

    // 1. Empty email validation
    if (!trimmedEmail) {
      showStatus('Please enter your email address.', 'status-error');
      emailInput.focus();
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showStatus('Please enter a valid email address.', 'status-error');
      emailInput.focus();
      return;
    }

    // 3. Submitting State
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    emailInput.disabled = true;
    submitBtn.innerHTML = '<span>Signing Up...</span>';
    showStatus('Signing Up...', 'status-info');

    try {
      const apiEndpoint = (window.location.protocol === 'file:' || !window.location.host)
        ? 'http://localhost:3000/api/newsletter/subscribe'
        : '/api/newsletter/subscribe';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: trimmedEmail })
      });

      const data = await response.json();

      if (response.ok && data.success && data.status === 'subscribed') {
        showStatus(data.message || "You're subscribed! Thank you for joining Muety.", 'status-success');
        // Clear input only on successful new subscription
        emailInput.value = '';
      } else if (data.status === 'already_subscribed') {
        showStatus(data.message || "You're already subscribed!", 'status-info');
        // Do NOT clear email field for already subscribed
      } else if (data.status === 'invalid_email') {
        showStatus(data.message || "Please enter a valid email address.", 'status-error');
        // Do NOT clear email field
      } else {
        showStatus(data.message || "Something went wrong. Please try again.", 'status-error');
        // Do NOT clear email field
      }

    } catch (err) {
      console.error('Newsletter submission error:', err);
      showStatus('Something went wrong. Please try again.', 'status-error');
      // Do NOT clear email field
    } finally {
      // Re-enable elements
      submitBtn.disabled = false;
      emailInput.disabled = false;
      submitBtn.innerHTML = originalBtnContent;
    }
  });

  function showStatus(text, className) {
    if (!statusMsg) return;
    statusMsg.innerText = text;
    statusMsg.className = `newsletter-status-msg ${className}`;
  }
}
