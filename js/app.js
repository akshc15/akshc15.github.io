// DevPath — Main App Logic

// ═══════════════════════════
// PROGRESS SYSTEM
// ═══════════════════════════
const Progress = {

  // Get all saved progress
  get() {
    return JSON.parse(localStorage.getItem('devpath') || '{}');
  },

  // Save progress
  save(data) {
    localStorage.setItem('devpath', JSON.stringify(data));
  },

  // Add XP points
  addXP(amount) {
    const data = this.get();
    data.xp = (data.xp || 0) + amount;
    this.save(data);
    this.updateUI();
    this.showXPToast(amount);
  },

  // Mark a mission complete
  complete(track, missionId, xp) {
    const data = this.get();
    if (!data.done) data.done = {};
    if (!data.done[track]) data.done[track] = [];
    if (!data.done[track].includes(missionId)) {
      data.done[track].push(missionId);
      data.xp = (data.xp || 0) + xp;
      // Update streak
      const today = new Date().toDateString();
      if (data.lastDate !== today) {
        const yesterday = new Date(
          Date.now() - 86400000
        ).toDateString();
        data.streak = data.lastDate === yesterday
          ? (data.streak || 0) + 1
          : 1;
        data.lastDate = today;
      }
      this.save(data);
      this.updateUI();
      this.showComplete(xp);
    }
  },

  // Check if mission is done
  isDone(track, missionId) {
    const data = this.get();
    return data.done?.[track]?.includes(missionId) || false;
  },

  // Get track progress percentage
  trackPercent(track, total) {
    const data = this.get();
    const done = data.done?.[track]?.length || 0;
    return Math.round((done / total) * 100);
  },

  // Update all UI elements
  updateUI() {
    const data = this.get();
    const xp = data.xp || 0;
    const streak = data.streak || 0;

    // Update nav badges
    const xpEl = document.getElementById('nav-xp');
    const streakEl = document.getElementById('nav-streak');
    if (xpEl) xpEl.textContent = xp.toLocaleString();
    if (streakEl) streakEl.textContent = streak;

    // Update progress bars
    const tracks = {
      linux: 15, git: 12, docker: 15,
      kubernetes: 18, terraform: 14, ansible: 12
    };
    Object.entries(tracks).forEach(([track, total]) => {
      const bar = document.getElementById('pb-' + track);
      const pct = document.getElementById('pct-' + track);
      const percent = this.trackPercent(track, total);
      if (bar) bar.style.width = percent + '%';
      if (pct) pct.textContent = percent + '%';
    });
  },

  // Reset all progress
  reset() {
    if (confirm('Reset all progress? This cannot be undone.')) {
      localStorage.removeItem('devpath');
      location.reload();
    }
  }
};

// ═══════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════
function showToast(msg, type = 'default') {
  const colors = {
    default: '#1d1d1f',
    success: '#34c759',
    error:   '#ff3b30',
    info:    '#0071e3'
  };
  const t = document.createElement('div');
  t.style.cssText = `
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type]};
    color: white;
    font-family: -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    padding: 12px 24px;
    border-radius: 980px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: fadeIn 0.3s both;
    white-space: nowrap;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

Progress.showXPToast = function(amount) {
  showToast('⚡ +' + amount + ' XP earned!', 'success');
};

Progress.showComplete = function(xp) {
  showToast('✅ Mission complete! +' + xp + ' XP', 'success');
};

// ═══════════════════════════
// COPY COMMAND HELPER
// ═══════════════════════════
function copyCmd(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.color = '#34c759';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.color = '';
    }, 1500);
  });
}

// ═══════════════════════════
// STEP COMPLETION
// ═══════════════════════════
function completeStep(stepId, btn) {
  // Mark step done visually
  const row = btn.closest('.step-body');
  if (row) {
    row.style.borderColor = 'rgba(52,199,89,0.3)';
    row.style.background = 'rgba(52,199,89,0.03)';
  }
  // Change step number to checkmark
  const num = btn.closest('.step-row')
    ?.querySelector('.step-num');
  if (num) {
    num.textContent = '✓';
    num.classList.add('done');
  }
  // Hide the button
  btn.style.display = 'none';

  // Show verify box
  const verify = document.getElementById('verify-' + stepId);
  if (verify) {
    verify.style.display = 'block';
    verify.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Save to localStorage
  const saved = JSON.parse(
    localStorage.getItem('devpath-steps') || '[]'
  );
  if (!saved.includes(stepId)) {
    saved.push(stepId);
    localStorage.setItem('devpath-steps', JSON.stringify(saved));
  }

  // Check if mission can be completed
  checkMissionReady();
}

// ═══════════════════════════
// MISSION READY CHECK
// ═══════════════════════════
function checkMissionReady() {
  const completeBtn = document.getElementById('mission-complete-btn');
  if (!completeBtn) return;
  const totalSteps = parseInt(
    completeBtn.dataset.steps || '3'
  );
  const saved = JSON.parse(
    localStorage.getItem('devpath-steps') || '[]'
  );
  const missionId = completeBtn.dataset.mission;
  const doneSteps = saved.filter(s =>
    s.startsWith(missionId + '-')
  ).length;
  if (doneSteps >= Math.min(totalSteps, 2)) {
    completeBtn.disabled = false;
    completeBtn.style.opacity = '1';
  }
}

// ═══════════════════════════
// QUIZ ANSWER
// ═══════════════════════════
function answerQuiz(btn, chosen, correct, quizId) {
  const container = document.getElementById(quizId);
  if (!container) return;
  const opts = container.querySelectorAll('.quiz-opt');
  const letters = ['A', 'B', 'C', 'D'];
  opts.forEach((opt, i) => {
    opt.style.pointerEvents = 'none';
    opt.style.cursor = 'default';
    if (letters[i] === correct) {
      opt.style.borderColor = 'rgba(52,199,89,0.4)';
      opt.style.background = 'rgba(52,199,89,0.05)';
      opt.style.color = '#34c759';
      opt.querySelector('.quiz-letter').style.background = '#34c759';
      opt.querySelector('.quiz-letter').style.color = 'white';
    } else if (letters[i] === chosen && chosen !== correct) {
      opt.style.borderColor = 'rgba(255,59,48,0.4)';
      opt.style.background = 'rgba(255,59,48,0.05)';
      opt.style.color = '#ff3b30';
      opt.querySelector('.quiz-letter').style.background = '#ff3b30';
      opt.querySelector('.quiz-letter').style.color = 'white';
    }
  });

  // Show explanation
  const explain = document.getElementById(quizId + '-explain');
  if (explain) explain.style.display = 'block';

  // Award XP for correct
  if (chosen === correct) {
    Progress.addXP(10);
    showToast('✅ Correct! +10 XP', 'success');
  } else {
    showToast('Not quite — correct answer highlighted', 'info');
  }
}

// ═══════════════════════════
// VM STATUS
// ═══════════════════════════
const VM = {
  running: false,
  interval: null,
  mins: 0,

  start() {
    this.running = true;
    const dot = document.getElementById('vm-dot');
    const status = document.getElementById('vm-status');
    if (dot) { dot.style.background = '#34c759'; }
    if (status) status.textContent = 'Running';
    this.interval = setInterval(() => {
      this.mins++;
      const h = Math.floor(this.mins / 60);
      const m = this.mins % 60;
      const uptime = document.getElementById('vm-uptime');
      if (uptime) uptime.textContent = h + 'h ' + m + 'm';
    }, 1000);
    showToast('VM starting... (~60 seconds)', 'info');
  },

  stop() {
    this.running = false;
    clearInterval(this.interval);
    const dot = document.getElementById('vm-dot');
    const status = document.getElementById('vm-status');
    if (dot) { dot.style.background = '#ff3b30'; }
    if (status) status.textContent = 'Stopped';
    showToast('VM stopped. Cost saved! 💰', 'success');
  }
};

// ═══════════════════════════
// INIT ON PAGE LOAD
// ═══════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  Progress.updateUI();

  // Restore completed steps
  const saved = JSON.parse(
    localStorage.getItem('devpath-steps') || '[]'
  );
  saved.forEach(stepId => {
    const verify = document.getElementById('verify-' + stepId);
    if (verify) verify.style.display = 'block';
  });

  // Scroll animations
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card, .step-body').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    observer.observe(el);
  });
});