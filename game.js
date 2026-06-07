class Team {
  constructor({ id, name, diamonds, color, wins = [], itemPriorities = {} }) {
    this.id = id;
    this.name = name;
    this.diamonds = diamonds;
    this.color = color;
    this.wins = Array.isArray(wins) ? wins : [];
    this.itemPriorities = typeof itemPriorities === 'object' ? itemPriorities : {};
  }

  addWin(itemId) {
    this.wins.push(itemId);
  }

  setItemPriority(itemId, priority) {
    if (priority === null || priority === undefined) {
      delete this.itemPriorities[itemId];
    } else {
      this.itemPriorities[itemId] = priority;
    }
  }

  getItemPriority(itemId) {
    return this.itemPriorities[itemId] || null;
  }

  calculateScore() {
    let score = 0;
    this.wins.forEach(itemId => {
      const priority = this.getItemPriority(itemId);
      if (priority === 1) score += 4;
      else if (priority === 2) score += 3;
      else if (priority === 3) score += 2;
      else score += 1;
    });
    return score;
  }
}

class Round {
  constructor({ id, bids, started = false, done = false, topCandidates = null, winnerTeamId = null, winningBid = null, winnerName = null }) {
    this.id = id;
    this.started = started;
    this.done = done;
    this.bids = Array.isArray(bids) ? bids : Array(TEAM_COUNT).fill(null);
    this.topCandidates = topCandidates;
    this.winnerTeamId = winnerTeamId;
    this.winningBid = winningBid;
    this.winnerName = winnerName;
  }

  getBid(teamId) {
    return this.bids[teamId];
  }

  setBid(teamId, value) {
    this.bids[teamId] = value;
  }
}

class AuctionState {
  constructor({ currentRound = null, teams = [], rounds = [], log = [], priorityConfirmed = false } = {}) {
    this.currentRound = currentRound;
    this.teams = teams.map(team => new Team(team));
    this.rounds = rounds.map(round => new Round(round));
    this.log = Array.isArray(log) ? log : [];
    this.priorityConfirmed = priorityConfirmed === true;
  }

  static fresh() {
    return new AuctionState({
      teams: Array.from({ length: TEAM_COUNT }, (_, i) => ({
        id: i,
        name: TEAM_NAMES[i] || `Team ${String.fromCharCode(65 + i)}`,
        diamonds: START_DIAMONDS,
        color: teamColors[i % teamColors.length],
        wins: [],
        itemPriorities: {}
      })),
      currentRound: null,
      rounds: Array.from({ length: ROUND_COUNT }, (_, i) => ({
        id: i + 1,
        started: false,
        done: false,
        bids: Array(TEAM_COUNT).fill(null),
        topCandidates: null,
        winnerTeamId: null,
        winningBid: null,
        winnerName: null
      })),
      log: [],
      priorityConfirmed: false
    });
  }

  static load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return AuctionState.fresh();
      const parsed = JSON.parse(raw);
      if (!parsed?.teams || !parsed?.rounds) return AuctionState.fresh();

      const teams = (parsed.teams || []).slice(0, TEAM_COUNT).map((team, i) => ({
        id: i,
        name: TEAM_NAMES[i] || team.name || `Team ${String.fromCharCode(65 + i)}`,
        diamonds: Number.isFinite(team.diamonds) ? team.diamonds : START_DIAMONDS,
        color: team.color || teamColors[i % teamColors.length],
        wins: Array.isArray(team.wins) ? team.wins : [],
        itemPriorities: typeof team.itemPriorities === 'object' ? team.itemPriorities : {}
      }));

      const rounds = (parsed.rounds || []).slice(0, ROUND_COUNT).map((round, i) => ({
        id: i + 1,
        started: round.started === true,
        done: round.done === true,
        bids: Array.isArray(round.bids) ? round.bids.slice(0, TEAM_COUNT) : Array(TEAM_COUNT).fill(null),
        topCandidates: round.topCandidates || null,
        winnerTeamId: Number.isFinite(round.winnerTeamId) ? round.winnerTeamId : null,
        winningBid: Number.isFinite(round.winningBid) ? round.winningBid : null,
        winnerName: round.winnerName != null ? round.winnerName : null
      }));

      return new AuctionState({
        currentRound: parsed.currentRound,
        teams,
        rounds,
        log: Array.isArray(parsed.log) ? parsed.log : [],
        priorityConfirmed: parsed.priorityConfirmed === true
      });
    } catch {
      return AuctionState.fresh();
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toJSON()));
  }

  toJSON() {
    return {
      currentRound: this.currentRound,
      teams: this.teams.map(team => ({
        id: team.id,
        name: team.name,
        diamonds: team.diamonds,
        color: team.color,
        wins: team.wins,
        itemPriorities: team.itemPriorities
      })),
      rounds: this.rounds.map(round => ({
        id: round.id,
        started: round.started,
        done: round.done,
        bids: round.bids,
        topCandidates: round.topCandidates,
        winnerTeamId: round.winnerTeamId,
        winningBid: round.winningBid,
        winnerName: round.winnerName
      })),
      log: this.log,
      priorityConfirmed: this.priorityConfirmed
    };
  }

  reset() {
    const fresh = AuctionState.fresh();
    this.currentRound = fresh.currentRound;
    this.teams = fresh.teams;
    this.rounds = fresh.rounds;
    this.log = fresh.log;
    this.priorityConfirmed = fresh.priorityConfirmed;
  }

  completedCount() {
    return this.rounds.filter(round => round.done).length;
  }

  gameOver() {
    return this.completedCount() === ROUND_COUNT;
  }

  getRound(roundId) {
    return this.rounds[roundId - 1];
  }

  getTeam(teamId) {
    return this.teams[teamId];
  }
}

class AuctionTimer {
  constructor({ modal, display, status, input, startBtn, resetBtn, closeBtn }) {
    this.modal = modal;
    this.display = display;
    this.status = status;
    this.input = input;
    this.startBtn = startBtn;
    this.resetBtn = resetBtn;
    this.closeBtn = closeBtn;
    this.intervalId = null;
    this.remaining = 120;
    this.running = false;
  }

  formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  parseTime(value) {
    const parts = value.trim().split(":");
    if (parts.length !== 2) return NaN;
    const mins = Number(parts[0]);
    const secs = Number(parts[1]);
    if (!Number.isFinite(mins) || !Number.isFinite(secs) || secs < 0 || secs > 59 || mins < 0) return NaN;
    return mins * 60 + secs;
  }

  updateUI() {
    this.display.textContent = this.formatTime(this.remaining);
    this.status.textContent = this.running ? "運行中" : (this.remaining === 0 ? "時間到！" : "準備就緒");
    this.startBtn.textContent = this.running ? "停止" : "開始";
    this.modal.querySelector(".timer-card").classList.toggle("timer-finish", this.remaining === 0 && !this.running);
  }

  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.updateUI();
  }

  finish() {
    this.stop();
    this.remaining = 0;
    this.status.textContent = "討論結束！";
    this.display.textContent = "00:00";
    this.modal.querySelector(".timer-card").classList.add("timer-finish");
  }

  start() {
    const seconds = this.parseTime(this.input.value || "");
    if (!Number.isFinite(seconds) || seconds <= 0) {
      this.status.textContent = "請輸入有效時間 mm:ss";
      this.modal.querySelector(".timer-card").classList.remove("timer-finish");
      return;
    }
    this.remaining = seconds;
    this.running = true;
    this.updateUI();
    this.intervalId = setInterval(() => {
      this.remaining -= 1;
      if (this.remaining <= 0) {
        this.finish();
      } else {
        this.updateUI();
      }
    }, 1000);
  }

  reset() {
    this.stop();
    const seconds = this.parseTime(this.input.value || "");
    this.remaining = Number.isFinite(seconds) && seconds >= 0 ? seconds : 120;
    this.input.value = this.formatTime(this.remaining);
    this.modal.querySelector(".timer-card").classList.remove("timer-finish");
    this.updateUI();
  }

  open() {
    this.modal.style.display = "flex";
    this.modal.setAttribute("aria-hidden", "false");
    this.input.value = this.formatTime(this.remaining > 0 ? this.remaining : 30);
    this.updateUI();
    this.input.focus();
  }

  close() {
    this.modal.style.display = "none";
    this.modal.setAttribute("aria-hidden", "true");
    this.stop();
  }

  bind() {
    this.startBtn.addEventListener("click", () => {
      this.running ? this.stop() : this.start();
    });
    this.resetBtn.addEventListener("click", () => this.reset());
    this.closeBtn.addEventListener("click", () => this.close());
    this.input.addEventListener("input", () => {
      if (!this.running) {
        const seconds = this.parseTime(this.input.value || "");
        if (Number.isFinite(seconds) && seconds >= 0) {
          this.remaining = seconds;
        }
        this.updateUI();
      }
    });
    this.modal.addEventListener("click", event => {
      if (event.target === this.modal) {
        this.close();
      }
    });
  }
}

class AuctionApp {
  constructor() {
    this.state = AuctionState.load();
    this.elRoundButtons = document.getElementById("roundButtons");
    this.elTeamList = document.getElementById("teamList");
    this.elStatusPill = document.getElementById("statusPill");
    this.elProgressPill = document.getElementById("progressPill");
    this.elRoundTitle = document.getElementById("roundTitle");
    this.elRoundStatePill = document.getElementById("roundStatePill");
    this.elItemName = document.getElementById("itemName");
    this.elItemDesc = document.getElementById("itemDesc");
    this.elMapWrap = document.getElementById("mapWrap");
    this.elItemMap = document.getElementById("itemMap");
    this.elBidInputs = document.getElementById("bidInputs");
    this.elBidHint = document.getElementById("bidHint");
    this.elBidHintPill = document.getElementById("bidHintPill");
    this.elErrorBox = document.getElementById("errorBox");
    this.elBattleBtn = document.getElementById("battleBtn");
    this.elClearBidsBtn = document.getElementById("clearBidsBtn");
    this.elBidBox = document.getElementById("bidBox");
    this.elBattleBox = document.getElementById("battleBox");
    this.elTopGrid = document.getElementById("topGrid");
    this.elWinnerPick = document.getElementById("winnerPick");
    this.elConfirmWinnerBtn = document.getElementById("confirmWinnerBtn");
    this.elLog = document.getElementById("log");
    this.elEndNote = document.getElementById("endNote");
    this.elWinningModal = document.getElementById("winningModal");
    this.elWinningTeamName = document.getElementById("winningTeamName");
    this.resetBtn = document.getElementById("resetBtn");
    this.timerBtn = document.getElementById("timerBtn");
    this.timer = new AuctionTimer({
      modal: document.getElementById("timerModal"),
      display: document.getElementById("timerDisplay"),
      status: document.getElementById("timerStatus"),
      input: document.getElementById("timerInput"),
      startBtn: document.getElementById("timerStartBtn"),
      resetBtn: document.getElementById("timerResetBtn"),
      closeBtn: document.getElementById("timerCloseBtn")
    });
  }

  init() {
    this.timer.bind();
    this.bindActions();
    this.render();
    this.elBattleBtn.disabled = true;
    this.elClearBidsBtn.disabled = true;
  }

  bindActions() {
    this.elBattleBtn.addEventListener("click", () => this.handleBattle());
    this.elConfirmWinnerBtn.addEventListener("click", () => this.handleConfirmWinner());
    this.elClearBidsBtn.addEventListener("click", () => this.handleClearBids());
    this.resetBtn.addEventListener("click", () => this.handleReset());
    this.timerBtn.addEventListener("click", () => this.timer.open());
  }

  showError(message) {
    this.elErrorBox.style.display = "block";
    this.elErrorBox.textContent = message;
  }

  clearError() {
    this.elErrorBox.style.display = "none";
    this.elErrorBox.textContent = "";
  }

  render() {
    this.renderTeams();
    this.renderRoundButtons();
    this.updatePills();
    this.renderLog();
  }

  getItemById(id) {
    return items.find(item => item.id === id);
  }

  renderTeams() {
    this.elTeamList.innerHTML = "";
    this.state.teams.forEach(team => {
      const winsHtml = (team.wins || []).map(itemId => {
        const item = this.getItemById(itemId);
        return item ? `<span class="winBadge" title="Won: ${item.desc}">${item.icon}</span>` : "";
      }).join("");

      const row = document.createElement("div");
      row.className = "teamCard";
      row.innerHTML = `
        <div class="teamTopRow">
          <div class="teamLeft">
            <span class="dot" style="background:${team.color};"></span>
            <div>
              <div style="font-weight:1000;">${team.name}</div>
            </div>
          </div>
          <div class="diamond" title="Diamonds">
            <div class="small">餘額</div>
            <span class="diaIcon" aria-hidden="true"></span>
            <span>${team.diamonds}</span>
          </div>
        </div>

        <div>
          <div class="small" style="margin-bottom:6px;">戰利品</div>
          <div class="winsRow">
            ${winsHtml || `<span class="small">N/A</span>`}
          </div>
        </div>
      `;
      this.elTeamList.appendChild(row);
    });
  }

  renderRoundButtons() {
    this.elRoundButtons.innerHTML = "";
    this.state.rounds.forEach(round => {
      const button = document.createElement("button");
      button.className = "roundBtn";
      button.type = "button";

      const lockedByProgress = round.id > (this.state.completedCount() + 1);
      const disabled = round.done || lockedByProgress;
      const isSkipped = round.done && round.winnerTeamId == null && round.winnerName === "N/A";

      button.setAttribute("aria-disabled", disabled ? "true" : "false");
      button.classList.toggle("done", round.done && !isSkipped);
      button.classList.toggle("skipped", isSkipped);
      button.classList.toggle("active", this.state.currentRound === round.id);

      const item = items[round.id - 1];
      const icon = item?.icon ?? "";
      const roundStatus = isSkipped
        ? "流標"
        : (round.done ? "成交" : (lockedByProgress ? "未拍賣" : (round.started ? "本輪拍賣" : "即將拍賣")));

      button.innerHTML = `
        <div class="icon">${icon}</div>
        <div class="s">${roundStatus}</div>
      `;

      button.addEventListener("click", () => {
        if (disabled) return;
        this.startRound(round.id);
      });

      this.elRoundButtons.appendChild(button);
    });
  }

  renderItem(roundId) {
    const item = items[roundId - 1];
    this.elItemName.textContent = `${item.icon} ${item.desc}`;
    this.elItemDesc.textContent = "";
    this.elItemMap.src = item.mapUrl;
    this.elMapWrap.style.display = "block";
  }

  renderBidInputs(roundId) {
    this.elBidInputs.innerHTML = "";
    const round = this.state.getRound(roundId);

    this.state.teams.forEach(team => {
      const row = document.createElement("div");
      row.className = "bidRow";
      const inputId = `bid-${roundId}-${team.id}`;
      const existing = round.getBid(team.id);

      row.innerHTML = `
        <div class="teamName">
          <span class="dot" style="background:${team.color};"></span>
          <div>
            <div>${team.name}</div>
            <div class="small">Max bid: ${team.diamonds}</div>
          </div>
        </div>
        <div>
          <input id="${inputId}" type="number" min="0" step="1" placeholder="0" ${round.done ? "disabled" : ""} />
        </div>
      `;
      this.elBidInputs.appendChild(row);

      const input = row.querySelector("input");
      if (existing != null) input.value = existing;

      input.addEventListener("input", () => {
        if (this.state.currentRound !== roundId) return;
        this.clearError();
        const raw = input.value;
        if (raw === "") {
          round.setBid(team.id, null);
          this.state.save();
          return;
        }
        const value = this.clampInt(Number(raw));
        round.setBid(team.id, Number.isFinite(value) ? value : null);
        this.state.save();
      });
    });

    this.elBidHint.textContent = round.done ? "Round locked (completed)" : "";
    this.elBattleBtn.textContent = `確認出價`;
    this.elBattleBtn.disabled = round.done;
    this.elClearBidsBtn.disabled = round.done;
    this.elBidHintPill.textContent = round.done ? "Locked" : "Enter bids";
  }

  clampInt(value) {
    return Number.isFinite(value) ? Math.floor(value) : NaN;
  }

  resetBattleUI() {
    this.elBidBox.style.display = "block";
    this.elBattleBox.style.display = "none";
    this.elTopGrid.innerHTML = "";
    this.elWinnerPick.innerHTML = "";
    this.elConfirmWinnerBtn.disabled = true;
  }

  startRound(roundId) {
    const round = this.state.getRound(roundId);
    this.state.currentRound = roundId;
    round.started = true;

    this.clearError();
    this.resetBattleUI();
    this.renderItem(roundId);
    this.renderBidInputs(roundId);
    this.renderRoundButtons();
    this.updatePills();
    this.state.save();

    this.elBattleBtn.disabled = round.done;
    this.elClearBidsBtn.disabled = round.done;
  }

  validateAllBids(roundId) {
    const round = this.state.getRound(roundId);

    for (let teamId = 0; teamId < TEAM_COUNT; teamId++) {
      const bid = round.getBid(teamId);
      const team = this.state.getTeam(teamId);

      if (bid == null || bid === "") {
        return { ok: false, msg: `Please input all 5 team prices before battling.` };
      }
      if (!Number.isFinite(bid) || bid < 0) {
        return { ok: false, msg: `All bids must be whole numbers (0 or higher).` };
      }
      if (bid > team.diamonds) {
        return { ok: false, msg: `${team.name}'s bid (${bid}) exceeds remaining diamonds (${team.diamonds}).` };
      }
      if (bid !== 0 && bid < 20) {
        return { ok: false, msg: `${team.name}'s bid (${bid}) is below the minimum allowed bid (20).` };
      }
    }

    return { ok: true };
  }

  computeTop2WithTies(roundId) {
    const round = this.state.getRound(roundId);
    const bids = this.state.teams.map(team => ({
      teamId: team.id,
      name: team.name,
      color: team.color,
      bid: round.getBid(team.id)
    }));

    const distinct = Array.from(new Set(bids.map(entry => entry.bid))).sort((a, b) => b - a);
    const top1 = distinct[0];
    const top1Count = bids.filter(entry => entry.bid === top1).length;

    let top2 = null;
    if (top1Count === 1 && distinct.length > 1) {
      top2 = distinct[1];
    }

    const candidates = bids
      .filter(entry => entry.bid === top1 || (top2 != null && entry.bid === top2 && entry.bid > 0))
      .sort((a, b) => b.bid - a.bid || a.name.localeCompare(b.name));

    return { candidates, top1, top2 };
  }

  renderCandidatesAndWinnerPick(roundId, info) {
    const round = this.state.getRound(roundId);
    const { candidates } = info;
    this.elTopGrid.innerHTML = "";

    const allTeamsWithBids = this.state.teams.map(team => ({
      ...team,
      bid: round.getBid(team.id)
    })).sort((a, b) => b.bid - a.bid);

    allTeamsWithBids.forEach(team => {
      const card = document.createElement("div");
      card.className = "topCard";
      card.innerHTML = `
        <div class="who" style="display:flex; gap:10px; align-items:center;">
          <span class="dot" style="background:${team.color};"></span>
          <span>${team.name}</span>
        </div>
        <div class="price">Bid: ${team.bid}</div>
      `;
      this.elTopGrid.appendChild(card);
    });

    this.elWinnerPick.innerHTML = `<div class="muted" style="font-weight:1000;">評判選出中標隊伍:</div>`;
    candidates.forEach(candidate => {
      const label = document.createElement("label");
      label.className = "radioPill";
      label.innerHTML = `
        <input type="radio" name="winner" value="${candidate.teamId}" />
        <span style="display:flex; gap:8px; align-items:center;">
          ${candidate.name}
        </span>
      `;
      label.querySelector("input").addEventListener("change", () => {
        this.elConfirmWinnerBtn.disabled = false;
      });
      this.elWinnerPick.appendChild(label);
    });
  }

  renderLog() {
    this.elLog.innerHTML = "";
    (this.state.log || []).slice().reverse().forEach(entry => {
      const div = document.createElement("div");
      div.className = "logItem";
      div.innerHTML = entry;
      this.elLog.appendChild(div);
    });
  }

  lockRound(roundId) {
    const round = this.state.getRound(roundId);
    round.done = true;

    this.resetBattleUI();
    this.renderBidInputs(roundId);
    this.renderRoundButtons();
    this.renderTeams();
    this.updatePills();
    this.state.save();

    if (this.state.gameOver()) {
      this.showFinalLeaderboard();
    }
  }

  addLog(roundId, winnerTeamId, winningBid) {
    const item = items[roundId - 1];
    const winner = this.state.getTeam(winnerTeamId);
    const round = this.state.getRound(roundId);

    const allBidsText = this.state.teams.map(team => `${team.name} 出價 (${round.getBid(team.id)}) 鑽石`).join(" • ");
    const html = `
      <div style="font-weight:1000;">Item ${roundId}: ${item.icon} ${item.desc}</div>
      <div class="muted">出價: ${allBidsText}</div>
      <div style="margin-top:6px;">
        中標者: <b>${winner.name}</b> 支付 <b>${winningBid}</b> 鑽石
      </div>
    `;

    this.state.log.push(html);
    this.state.save();
    this.renderLog();
  }

  addNoWinnerLog(roundId) {
    const item = items[roundId - 1];
    const html = `
      <div style="font-weight:1000;">Item ${roundId}: ${item.icon} ${item.desc}</div>
      <div class="muted">本輪流標</div>
    `;
    this.state.log.push(html);
    this.state.save();
    this.renderLog();
  }

  showFinalLeaderboard() {
    this.elEndNote.style.display = "block";
    this.elEndNote.innerHTML = `
      <div style="font-weight:1000; margin-bottom:6px;">🏁 Finish</div>
    `;
  }

  showWinningEffect(teamName) {
    this.elWinningTeamName.textContent = teamName;
    this.elWinningModal.style.display = "flex";
    this.elWinningModal.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      this.elWinningModal.style.display = "none";
      this.elWinningModal.setAttribute("aria-hidden", "true");
    }, 2000);
  }

  promptNextRound() {
    const nextId = this.state.completedCount() + 1;
    if (nextId <= ROUND_COUNT) {
      this.state.currentRound = null;
      this.state.save();
      this.renderRoundButtons();
      this.updatePills();

      this.elItemName.textContent = "討論時間";
      this.elItemDesc.textContent = "Click Item " + nextId + " to continue.";
      this.elMapWrap.style.display = "none";
      this.elBidInputs.innerHTML = "";
      this.elBidHint.textContent = "Start the next round to enable bid inputs.";
      this.elBattleBtn.disabled = true;
      this.elClearBidsBtn.disabled = true;
      this.resetBattleUI();
    }
  }

  handleBattle() {
    this.clearError();
    if (this.state.currentRound == null) {
      this.showError("Start a round first.");
      return;
    }

    const roundId = this.state.currentRound;
    const round = this.state.getRound(roundId);
    if (round.done) return;

    const result = this.validateAllBids(roundId);
    if (!result.ok) {
      this.showError(result.msg);
      return;
    }

    const allZero = round.bids.every(bid => bid === 0);
    if (allZero) {
      round.winnerTeamId = null;
      round.winnerName = "N/A";
      round.winningBid = 0;
      round.topCandidates = null;

      this.lockRound(roundId);
      this.addNoWinnerLog(roundId);
      this.promptNextRound();
      return;
    }

    const info = this.computeTop2WithTies(roundId);
    round.topCandidates = info;
    this.state.save();

    this.elBattleBox.style.display = "block";
    this.elBidBox.style.display = "none";
    this.elConfirmWinnerBtn.disabled = true;
    this.renderCandidatesAndWinnerPick(roundId, info);
  }

  handleConfirmWinner() {
    this.clearError();
    const roundId = this.state.currentRound;
    if (roundId == null) return;

    const round = this.state.getRound(roundId);
    if (round.done) return;

    const selected = document.querySelector('input[name="winner"]:checked');
    if (!selected) {
      this.showError("Please select a winner from the displayed candidates.");
      return;
    }

    const winnerTeamId = Number(selected.value);
    const winningBid = round.getBid(winnerTeamId);

    if (!Number.isFinite(winningBid)) {
      this.showError("Winning bid is invalid. Please re-enter bids.");
      return;
    }

    const winnerTeam = this.state.getTeam(winnerTeamId);
    if (winningBid > winnerTeam.diamonds) {
      this.showError(`${winnerTeam.name} does not have enough diamonds. Please adjust bids.`);
      return;
    }

    winnerTeam.diamonds -= winningBid;
    const item = items[roundId - 1];
    winnerTeam.addWin(item.id);

    round.winnerTeamId = winnerTeamId;
    round.winningBid = winningBid;

    this.addLog(roundId, winnerTeamId, winningBid);
    this.showWinningEffect(winnerTeam.name);
    this.lockRound(roundId);
    this.promptNextRound();
  }

  handleClearBids() {
    this.clearError();
    if (this.state.currentRound == null) return;

    const round = this.state.getRound(this.state.currentRound);
    if (round.done) return;

    round.bids = Array(TEAM_COUNT).fill(null);
    round.topCandidates = null;
    this.state.save();
    this.renderBidInputs(this.state.currentRound);
    this.resetBattleUI();
  }

  handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    this.state.reset();
    this.clearError();
    this.resetBattleUI();

    this.elItemName.textContent = "討論時間";
    this.elItemDesc.textContent = "點擊編號以顯示拍賣物";
    this.elMapWrap.style.display = "none";
    this.elBidInputs.innerHTML = "";
    this.elBidHint.textContent = "Start a round to enable bid inputs.";
    this.elBattleBtn.disabled = true;
    this.elClearBidsBtn.disabled = true;
    this.elEndNote.style.display = "none";
    this.elEndNote.innerHTML = "";
    this.timer.close();

    this.render();
    this.state.save();
  }

  updatePills() {
    const done = this.state.completedCount();
    this.elProgressPill.textContent = `${done} / ${ROUND_COUNT} 成交`;
    if (done === 0) {
      this.elStatusPill.textContent = "未成交";
    } else if (done < ROUND_COUNT) {
      this.elStatusPill.textContent = `成交 (${done}/${ROUND_COUNT})`;
    } else {
      this.elStatusPill.textContent = "Game finished";
    }

    if (this.state.currentRound == null) {
      this.elRoundTitle.textContent = "拍賣品: —";
      this.elRoundStatePill.textContent = "Idle";
    } else {
      const round = this.state.getRound(this.state.currentRound);
      this.elRoundTitle.textContent = `拍賣品: ${round.id}`;
      this.elRoundStatePill.textContent = round.done ? "Locked" : (round.started ? "Started" : "Idle");
    }
  }
}

new AuctionApp().init();