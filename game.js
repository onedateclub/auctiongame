(() => {
  function freshState(){
    return {
      teams: Array.from({length: TEAM_COUNT}, (_, i) => ({
        id: i,
        name: TEAM_NAMES[i] || `Team ${String.fromCharCode(65 + i)}`,
        diamonds: START_DIAMONDS,
        color: teamColors[i % teamColors.length],
        wins: [] // item ids won
      })),
      currentRound: null,
      rounds: Array.from({length: ROUND_COUNT}, (_, i) => ({
        id: i + 1,
        started: false,
        done: false,
        bids: Array(TEAM_COUNT).fill(null),
        topCandidates: null, // candidates (top 2 prices incl ties)
        winnerTeamId: null,
        winningBid: null,
        winnerName: null
      })),
      log: []
    };
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return freshState();
      const parsed = JSON.parse(raw);
      if(!parsed?.teams || !parsed?.rounds) return freshState();

	  // Force constant team names even if old saved data had custom names
	  parsed.teams = (parsed.teams || []).slice(0, TEAM_COUNT);
	  for (let i = 0; i < TEAM_COUNT; i++) {
		if (!parsed.teams[i]) {
			parsed.teams[i] = { id: i, diamonds: START_DIAMONDS, color: teamColors[i % teamColors.length], wins: [] };
			}
		parsed.teams[i].name = TEAM_NAMES[i] || `Team ${String.fromCharCode(65 + i)}`;
	}

      return parsed;
    }catch{
      return freshState();
    }
  }

  const state = loadState();
  const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  // Elements
  const elRoundButtons = document.getElementById("roundButtons");
  const elTeamList = document.getElementById("teamList");
  const elStatusPill = document.getElementById("statusPill");
  const elProgressPill = document.getElementById("progressPill");
  const elRoundTitle = document.getElementById("roundTitle");
  const elRoundStatePill = document.getElementById("roundStatePill");
  const elItemName = document.getElementById("itemName");
  const elItemDesc = document.getElementById("itemDesc");
  const elMapWrap = document.getElementById("mapWrap");
  const elItemMap = document.getElementById("itemMap");
  const elBidInputs = document.getElementById("bidInputs");
  const elBidHint = document.getElementById("bidHint");
  const elBidHintPill = document.getElementById("bidHintPill");
  const elErrorBox = document.getElementById("errorBox");
  const elBattleBtn = document.getElementById("battleBtn");
  const elClearBidsBtn = document.getElementById("clearBidsBtn");
  const elBidBox = document.getElementById("bidBox");
  const elBattleBox = document.getElementById("battleBox");
  const elTopGrid = document.getElementById("topGrid");
  const elWinnerPick = document.getElementById("winnerPick");
  const elConfirmWinnerBtn = document.getElementById("confirmWinnerBtn");
  const elLog = document.getElementById("log");
  const elEndNote = document.getElementById("endNote");
  const resetBtn = document.getElementById("resetBtn");
  const timerBtn = document.getElementById("timerBtn");
  const timerModal = document.getElementById("timerModal");
  const timerCloseBtn = document.getElementById("timerCloseBtn");
  const timerInput = document.getElementById("timerInput");
  const timerStartBtn = document.getElementById("timerStartBtn");
  const timerResetBtn = document.getElementById("timerResetBtn");
  const timerDisplay = document.getElementById("timerDisplay");
  const timerStatus = document.getElementById("timerStatus");

  let timerInterval = null;
  let timerRemaining = 120;
  let timerRunning = false;

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const parseTime = (value) => {
    const parts = value.trim().split(":");
    if(parts.length !== 2) return NaN;
    const mins = Number(parts[0]);
    const secs = Number(parts[1]);
    if(!Number.isFinite(mins) || !Number.isFinite(secs) || secs < 0 || secs > 59 || mins < 0) return NaN;
    return mins * 60 + secs;
  };

  const updateTimerUI = () => {
    timerDisplay.textContent = formatTime(timerRemaining);
    timerStatus.textContent = timerRunning ? "運行中" : (timerRemaining === 0 ? "時間到！" : "準備就緒");
    timerStartBtn.textContent = timerRunning ? "停止" : "開始";
    timerModal.querySelector(".timer-card").classList.toggle("timer-finish", timerRemaining === 0 && !timerRunning);
  };

  const stopTimer = () => {
    timerRunning = false;
    if(timerInterval){
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateTimerUI();
  };

  const finishTimer = () => {
    stopTimer();
    timerRemaining = 0;
    timerStatus.textContent = "討論結束！";
    timerDisplay.textContent = "00:00";
    timerModal.querySelector(".timer-card").classList.add("timer-finish");
  };

  const startTimer = () => {
    const seconds = parseTime(timerInput.value || "");
    if(!Number.isFinite(seconds) || seconds <= 0){
      timerStatus.textContent = "請輸入有效時間 mm:ss";
      timerModal.querySelector(".timer-card").classList.remove("timer-finish");
      return;
    }
    timerRemaining = seconds;
    timerRunning = true;
    updateTimerUI();
    timerInterval = setInterval(() => {
      timerRemaining -= 1;
      if(timerRemaining <= 0){
        finishTimer();
      } else {
        updateTimerUI();
      }
    }, 1000);
  };

  const resetTimer = () => {
    stopTimer();
    const seconds = parseTime(timerInput.value || "");
    timerRemaining = Number.isFinite(seconds) && seconds >= 0 ? seconds : 120;
    timerInput.value = formatTime(timerRemaining);
    timerModal.querySelector(".timer-card").classList.remove("timer-finish");
    updateTimerUI();
  };

  const openTimer = () => {
    timerModal.style.display = "flex";
    timerModal.setAttribute("aria-hidden", "false");
    timerInput.value = formatTime(timerRemaining > 0 ? timerRemaining : 30);
    updateTimerUI();
    timerInput.focus();
  };

  const closeTimer = () => {
    timerModal.style.display = "none";
    timerModal.setAttribute("aria-hidden", "true");
    stopTimer();
  };

  timerBtn.addEventListener("click", openTimer);
  timerCloseBtn.addEventListener("click", closeTimer);
  timerResetBtn.addEventListener("click", resetTimer);
  timerStartBtn.addEventListener("click", () => {
    timerRunning ? stopTimer() : startTimer();
  });
  timerInput.addEventListener("input", () => {
    if(!timerRunning){
      const seconds = parseTime(timerInput.value || "");
      if(Number.isFinite(seconds) && seconds >= 0){
        timerRemaining = seconds;
      }
      updateTimerUI();
    }
  });
  timerModal.addEventListener("click", (event) => {
    if(event.target === timerModal){
      closeTimer();
    }
  });
  
  function showError(msg){
    elErrorBox.style.display = "block";
    elErrorBox.textContent = msg;
  }
  function clearError(){
    elErrorBox.style.display = "none";
    elErrorBox.textContent = "";
  }

  const clampInt = (v) => Number.isFinite(v) ? Math.floor(v) : NaN;

  const completedCount = () => state.rounds.filter(r => r.done).length;
  const gameOver = () => completedCount() === ROUND_COUNT;

  function updatePills(){
    const done = completedCount();
    elProgressPill.textContent = `${done} / ${ROUND_COUNT} 成交`;

    if(done === 0) elStatusPill.textContent = "未成交";
    else if(done < ROUND_COUNT) elStatusPill.textContent = `成交 (${done}/${ROUND_COUNT})`;
    else elStatusPill.textContent = "Game finished";

    if(state.currentRound == null){
      elRoundTitle.textContent = "拍賣品: —";
      elRoundStatePill.textContent = "Idle";
    }else{
      const r = state.rounds[state.currentRound - 1];
      elRoundTitle.textContent = `拍賣品: ${r.id}`;
      elRoundStatePill.textContent = r.done ? "Locked" : (r.started ? "Started" : "Idle");
    }
  }

  function getItemById(id){
    return items.find(x => x.id === id);
  }

  function renderTeams(){
    elTeamList.innerHTML = "";
    state.teams.forEach(t => {
      const winsHtml = (t.wins || []).map(itemId => {
        const it = getItemById(itemId);
        return it ? `<span class="winBadge" title="Won: ${it.name}">${it.icon}</span>` : "";
      }).join("");

      const row = document.createElement("div");
      row.className = "teamCard";
      row.innerHTML = `
        <div class="teamTopRow">
          <div class="teamLeft">
            <span class="dot" style="background:${t.color};"></span>
            <div>
              <div style="font-weight:1000;">${t.name}</div>
            </div>
          </div>
          <div class="diamond" title="Diamonds">
            <div class="small">餘額</div>
            <span class="diaIcon" aria-hidden="true"></span>
            <span>${t.diamonds}</span>
          </div>
        </div>

        <div>
          <div class="small" style="margin-bottom:6px;">戰利品</div>
          <div class="winsRow">
            ${winsHtml || `<span class="small">N/A</span>`}
          </div>
        </div>
      `;
      elTeamList.appendChild(row);
    });
  }

  function renderRoundButtons(){
    elRoundButtons.innerHTML = "";
    state.rounds.forEach(r => {
      const btn = document.createElement("button");
      btn.className = "roundBtn";
      btn.type = "button";

      // Only next round is startable
      const lockedByProgress = r.id > (completedCount() + 1);
      const disabled = r.done || lockedByProgress;

      const isSkipped = r.done && r.winnerTeamId == null && r.winnerName === "N/A";
      btn.setAttribute("aria-disabled", disabled ? "true" : "false");
      btn.classList.toggle("done", r.done && !isSkipped);
      btn.classList.toggle("skipped", isSkipped);
      btn.classList.toggle("active", state.currentRound === r.id);
      
      // Get icon from constant
	    const miniitem = items[r.id-1];
	    const icon = miniitem?.icon ?? ""; 

      const roundStatus = isSkipped
        ? "流標"
        : (r.done ? "成交" : (lockedByProgress ? "未拍賣" : (r.started ? "本輪拍賣" : "即將拍賣")));
      btn.innerHTML = `
	    <div class="icon">${icon}</div>
        <div class="s">${roundStatus}</div>
      `;

      btn.addEventListener("click", () => {
        if(disabled) return;
        startRound(r.id);
      });

      elRoundButtons.appendChild(btn);
    });
  }

  function renderItem(roundId){
    const item = items[roundId - 1];
    elItemName.textContent = `${item.icon} ${item.desc}`;
    elItemDesc.textContent = '';
	  elItemMap.src = item.mapUrl;
	  elMapWrap.style.display = "block";

  }

  function renderBidInputs(roundId){
    elBidInputs.innerHTML = "";
    const round = state.rounds[roundId - 1];

    state.teams.forEach((t) => {
      const row = document.createElement("div");
      row.className = "bidRow";

      const inputId = `bid-${roundId}-${t.id}`;
      const existing = round.bids[t.id];

      row.innerHTML = `
        <div class="teamName">
          <span class="dot" style="background:${t.color};"></span>
          <div>
            <div>${t.name}</div>
            <div class="small">Max bid: ${t.diamonds}</div>
          </div>
        </div>
        <div>
          <input id="${inputId}" type="number" min="0" step="1" placeholder="0" ${round.done ? "disabled" : ""} />
        </div>
      `;
      elBidInputs.appendChild(row);

      const input = row.querySelector("input");
      if(existing != null) input.value = existing;

      input.addEventListener("input", () => {
        if(state.currentRound !== roundId) return;
        clearError();
        const raw = input.value;
        if(raw === ""){
          round.bids[t.id] = null;
          saveState();
          return;
        }
        const v = clampInt(Number(raw));
        round.bids[t.id] = Number.isFinite(v) ? v : null;
        saveState();
      });
    });

    elBidHint.textContent = round.done ? "Round locked (completed)" : "";
    elBattleBtn.textContent = `確認出價`;
    elBattleBtn.disabled = round.done;
    elClearBidsBtn.disabled = round.done;
    elBidHintPill.textContent = round.done ? "Locked" : "Enter bids";
  }

  function resetBattleUI(){
    elBidBox.style.display = "block";
    elBattleBox.style.display = "none";
    elTopGrid.innerHTML = "";
    elWinnerPick.innerHTML = "";
    elConfirmWinnerBtn.disabled = true;
  }

  function startRound(roundId){
    const round = state.rounds[roundId - 1];
    state.currentRound = roundId;
    round.started = true;

    clearError();
    resetBattleUI();
    renderItem(roundId);
    renderBidInputs(roundId);
    renderRoundButtons();
    updatePills();
    saveState();

    elBattleBtn.disabled = round.done;
    elClearBidsBtn.disabled = round.done;
  }

  function validateAllBids(roundId){
    const round = state.rounds[roundId - 1];

    for(let teamId = 0; teamId < TEAM_COUNT; teamId++){
      const bid = round.bids[teamId];

      if(bid == null || bid === ""){
        return { ok:false, msg:`Please input all 5 team prices before battling.` };
      }
      if(!Number.isFinite(bid) || bid < 0){
        return { ok:false, msg:`All bids must be whole numbers (0 or higher).` };
      }
      if(bid > state.teams[teamId].diamonds){
        return { ok:false, msg:`${state.teams[teamId].name}'s bid (${bid}) exceeds remaining diamonds (${state.teams[teamId].diamonds}).` };
      }
    }
    return { ok:true };
  }

  /**
   * Tie-aware "Top 2 price":
   * - Find distinct bid values in descending order
   * - Take best value (top1) and second distinct value (top2) if exists
   * - Include all teams whose bid == top1 OR bid == top2
   * - If no second distinct value, include all teams in top1 (could be everyone)
   */
  function computeTop2WithTies(roundId) {
    const round = state.rounds[roundId - 1];

    const bids = state.teams.map(t => ({
      teamId: t.id,
      name: t.name,
      color: t.color,
      bid: round.bids[t.id]
    }));

    // Get distinct bid values sorted descending
    const distinct = Array.from(new Set(bids.map(b => b.bid))).sort((a, b) => b - a);
    const top1 = distinct[0];

    // Count how many teams have top1
    const top1Count = bids.filter(b => b.bid === top1).length;

    // If top1 has 2 or more candidates → DO NOT return top2
    let top2 = null;
    if (top1Count === 1 && distinct.length > 1) {
      top2 = distinct[1];
    }

    // Filter candidates
    const candidates = bids
      .filter(b =>
        b.bid === top1 ||
        (top2 != null && b.bid === top2 && b.bid > 0)
      )
      .sort((a, b) => b.bid - a.bid || a.name.localeCompare(b.name));

    return { candidates, top1, top2 };
  }


  function renderCandidatesAndWinnerPick(roundId, info){
    const { candidates, top1, top2 } = info;
    const round = state.rounds[roundId - 1];
    elTopGrid.innerHTML = "";

    const allTeamsWithBids = state.teams.map(t => ({
      ...t,
      bid: round.bids[t.id]
    })).sort((a, b) => b.bid - a.bid);

    allTeamsWithBids.forEach((t, index) => {
      const rank = index + 1;
      const card = document.createElement("div");
      card.className = "topCard";
      card.innerHTML = `
        <div class="who" style="display:flex; gap:10px; align-items:center;">
          <span class="dot" style="background:${t.color};"></span>
          <span>${t.name}</span>
        </div>
        <div class="price">Bid: ${t.bid}</div>
      `;
      elTopGrid.appendChild(card);
    });

    elWinnerPick.innerHTML = `<div class="muted" style="font-weight:1000;">評判選出中標隊伍:</div>`;
    candidates.forEach(c => {
      const label = document.createElement("label");
      label.className = "radioPill";
      label.innerHTML = `
        <input type="radio" name="winner" value="${c.teamId}" />
        <span style="display:flex; gap:8px; align-items:center;">
          ${c.name}
        </span>
      `;
      label.querySelector("input").addEventListener("change", () => {
        elConfirmWinnerBtn.disabled = false;
      });
      elWinnerPick.appendChild(label);
    });
  }

  function renderLog(){
    elLog.innerHTML = "";
    (state.log || []).slice().reverse().forEach(entry => {
      const div = document.createElement("div");
      div.className = "logItem";
      div.innerHTML = entry;
      elLog.appendChild(div);
    });
  }

  function lockRound(roundId){
    const round = state.rounds[roundId - 1];
    round.done = true;

    resetBattleUI();
    renderBidInputs(roundId);
    renderRoundButtons();
    renderTeams();
    updatePills();
    saveState();

    if(gameOver()){
      showFinalLeaderboard();
    }
  }

  function addLog(roundId, winnerTeamId, winningBid, candidates){
    const item = items[roundId - 1];
    const winner = state.teams[winnerTeamId];
    const round = state.rounds[roundId - 1];

    const candText = candidates.map(c => `${c.name} : (${c.bid}) 鑽石`).join(" • ");
    const allBidsText = state.teams.map(t => `${t.name} 出價 (${round.bids[t.id]}) 鑽石`).join(" • ");

    const html = `
      <div style="font-weight:1000;">Item ${roundId}: ${item.icon} ${item.desc}</div>
      <div class="muted">出價: ${allBidsText}</div>
      <!--<div class="muted">出線隊伍: ${candText}</div>-->
      <div style="margin-top:6px;">
        中標者: <b>${winner.name}</b> 支付 <b>${winningBid}</b> 鑽石
        <!--剩餘: <b>${winner.diamonds}</b>-->
      </div>
    `;
    state.log = state.log || [];
    state.log.push(html);
    saveState();
    renderLog();
  }

  function addNoWinnerLog(roundId){
    const item = items[roundId - 1];
    const html = `
      <div style="font-weight:1000;">Item ${roundId}: ${item.icon} ${item.desc}</div>
      <div class="muted">本輪流標</div>
    `;
    state.log = state.log || [];
    state.log.push(html);
    saveState();
    renderLog();
  }

  function showFinalLeaderboard(){

    elEndNote.style.display = "block";
    elEndNote.innerHTML = `
      <div style="font-weight:1000; margin-bottom:6px;">🏁 Finish</div>
    `;
  }

  function promptNextRound(){
    const nextId = completedCount() + 1;
    if(nextId <= ROUND_COUNT){
      state.currentRound = null;
      saveState();
      renderRoundButtons();
      updatePills();

      elItemName.textContent = "討論時間";
      elItemDesc.textContent = "Click Item " + nextId + " to continue.";
      elMapWrap.style.display = "none";
      elBidInputs.innerHTML = "";
      elBidHint.textContent = "Start the next round to enable bid inputs.";
      elBattleBtn.disabled = true;
      elClearBidsBtn.disabled = true;
      resetBattleUI();
    }
  }

  // Actions
  elBattleBtn.addEventListener("click", () => {
    clearError();

    if(state.currentRound == null){
      showError("Start a round first.");
      return;
    }
    const roundId = state.currentRound;
    const round = state.rounds[roundId - 1];
    if(round.done) return;

    const v = validateAllBids(roundId);
    if(!v.ok){
      showError(v.msg);
      return;
    }

    const allZero = round.bids.every(bid => bid === 0);
    if(allZero){
      round.winnerTeamId = null;
      round.winnerName = "N/A";
      round.winningBid = 0;
      round.topCandidates = null;

      lockRound(roundId);
      addNoWinnerLog(roundId);
      promptNextRound();
      return;
    }

    const info = computeTop2WithTies(roundId);
    round.topCandidates = info;
    saveState();

    elBattleBox.style.display = "block";
    elBidBox.style.display = "none";
    elConfirmWinnerBtn.disabled = true;
    renderCandidatesAndWinnerPick(roundId, info);
  });

  elConfirmWinnerBtn.addEventListener("click", () => {
    clearError();
    const roundId = state.currentRound;
    if(roundId == null) return;

    const round = state.rounds[roundId - 1];
    if(round.done) return;

    const selected = document.querySelector('input[name="winner"]:checked');
    if(!selected){
      showError("Please select a winner from the displayed candidates.");
      return;
    }

    const winnerTeamId = Number(selected.value);
    const winningBid = round.bids[winnerTeamId];

    if(!Number.isFinite(winningBid)){
      showError("Winning bid is invalid. Please re-enter bids.");
      return;
    }

    const winnerTeam = state.teams[winnerTeamId];
    if(winningBid > winnerTeam.diamonds){
      showError(`${winnerTeam.name} does not have enough diamonds. Please adjust bids.`);
      return;
    }

    // Deduct diamonds
    winnerTeam.diamonds -= winningBid;

    // Record win icon
    const item = items[roundId - 1];
    winnerTeam.wins = winnerTeam.wins || [];
    winnerTeam.wins.push(item.id);

    // Save round result
    round.winnerTeamId = winnerTeamId;
    round.winningBid = winningBid;

    const candidates = round.topCandidates?.candidates || [];
    addLog(roundId, winnerTeamId, winningBid, candidates);
    lockRound(roundId);
    promptNextRound();
  });

  elClearBidsBtn.addEventListener("click", () => {
    clearError();
    if(state.currentRound == null) return;

    const roundId = state.currentRound;
    const round = state.rounds[roundId - 1];
    if(round.done) return;

    round.bids = Array(TEAM_COUNT).fill(null);
    round.topCandidates = null;
    saveState();
    renderBidInputs(roundId);
    resetBattleUI();
  });

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    const s = freshState();
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, s);

    clearError();
    resetBattleUI();

    elItemName.textContent = "討論時間";
    elItemDesc.textContent = "點擊編號以顯示拍賣物";
    elMapWrap.style.display = "none";
    elBidInputs.innerHTML = "";
    elBidHint.textContent = "Start a round to enable bid inputs.";
    elBattleBtn.disabled = true;
    elClearBidsBtn.disabled = true;

    elEndNote.style.display = "none";
    elEndNote.innerHTML = "";
    closeTimer();

    renderTeams();
    renderRoundButtons();
    updatePills();
    renderLog();
    saveState();
  });

  // Init
  function init(){
    renderTeams();
    renderRoundButtons();
    updatePills();
    renderLog();

    // Keep simple: user clicks Start Round to reopen.
    elBattleBtn.disabled = true;
    elClearBidsBtn.disabled = true;
  }
  init();
})();