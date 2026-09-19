/* MiroxAI — Firebase shared + ban polling */

const FIREBASE_URL = "https://miroxlink-default-rtdb.firebaseio.com";

const PLANS = {
  free: { id:"free", label:"Free", tagline:"Get started", price:0, gamepass:null,
    perks:["50 responses / day","5 images per 5 hours","10 image visions / day","Both models","Silent 5s video"] },
    pro: { id:"pro", label:"Pro", tagline:"For builders", price:250, gamepass:"1982144889",
      perks:["500 responses / day","Unlimited images","Unlimited vision","Both AI models","Unlimited 5s silent videos"] },
      ultimate: { id:"ultimate", label:"Ultimate", tagline:"Maximum power", price:1200, gamepass:"1983380864",
        perks:["3,000 responses / day","Unlimited everything","Ultimate reasoning model","Priority quality","Everything in Pro"] }
};

const STORE = {
  chats:"mx_chats", user:"mx_user", tier:"mx_tier", orders:"mx_orders",
  appearance:"mx_app", personal:"mx_pers", behavior:"mx_beh",
  keys:"mx_keys", adminKeys:"mx_akeys", broadcast:"mx_bc", wasBanned:"mx_was_banned",
};

const readJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const getChats = () => readJSON(STORE.chats, []);
const setChats = v => writeJSON(STORE.chats, v);
const getUser  = () => readJSON(STORE.user, null);
const setUser  = v => writeJSON(STORE.user, v);
const getTier  = () => readJSON(STORE.tier, "free");
const setTier  = v => writeJSON(STORE.tier, v);
const getOrders = () => readJSON(STORE.orders, []);
const setOrders = v => writeJSON(STORE.orders, v);
const getAppearance = () => readJSON(STORE.appearance, { mode:"light", accent:"warm", corners:"soft", font:"system", density:"normal" });
const setAppearance = v => writeJSON(STORE.appearance, v);
const getPersonal = () => readJSON(STORE.personal, { userName:"", friendship:"bestie", persona:"" });
const setPersonal = v => writeJSON(STORE.personal, v);
const getBehavior = () => readJSON(STORE.behavior, { confirmDelete:true, replyStyle:"balanced", reasoning:"auto" });
const setBehavior = v => writeJSON(STORE.behavior, v);
const getKeys = () => readJSON(STORE.keys, { pollinations:"", huggingface:"", airouteToken:"", airouteBase:"" });
const setKeys = v => writeJSON(STORE.keys, v);
const getAdminKeys = () => readJSON(STORE.adminKeys, { pollinations:"", huggingface:"", airouteToken:"", airouteBase:"" });
const setAdminKeys = v => writeJSON(STORE.adminKeys, v);

// ============ Firebase ============
const fdb = {
  url(p = "") { return FIREBASE_URL.replace(/\/$/, "") + "/" + p.replace(/^\//, "") + ".json"; },
  async get(p) {
    try {
      const r = await fetch(this.url(p), { cache: "no-store" });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  },
  async put(p, d) {
    try {
      const r = await fetch(this.url(p), { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
      if (!r.ok) return { __error:`${r.status}` };
      return await r.json();
    } catch (e) { return { __error: String(e.message || e) }; }
  },
  async post(p, d) {
    try {
      const r = await fetch(this.url(p), { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
      if (!r.ok) return { __error:`${r.status}` };
      return await r.json();
    } catch (e) { return { __error: String(e.message || e) }; }
  },
  async patch(p, d) {
    try {
      const r = await fetch(this.url(p), { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
      if (!r.ok) return { __error:`${r.status}` };
      return await r.json();
    } catch (e) { return { __error: String(e.message || e) }; }
  },
  async del(p) { try { await fetch(this.url(p), { method:"DELETE" }); } catch {} }
};

// ============ Ban polling ============
async function checkBanStatus() {
  const u = getUser();
  if (!u || !u.name) return;
  const ban = await fdb.get(`bans/${encodeURIComponent(u.name)}`);
  const isBanned = !!(ban && ban.reason);
  const wasBanned = localStorage.getItem(STORE.wasBanned) === "1";

  if (isBanned && !wasBanned) {
    localStorage.setItem(STORE.wasBanned, "1");
    writeJSON("mx_ban_info", ban);
    location.href = "banned.html";
    return;
  }
  if (!isBanned && wasBanned) {
    localStorage.setItem(STORE.wasBanned, "0");
    alert("✅ You have been unbanned. Reloading…");
    location.reload();
    return;
  }
}

// ============ User logs ============
async function logUserHeartbeat() {
  const u = getUser();
  if (!u || !u.name) return;
  const ua = navigator.userAgent;
  const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? (/iPad|Tablet/i.test(ua) ? "Tablet" : "Mobile") : "Desktop";
  await fdb.put(`users/${encodeURIComponent(u.name)}`, {
    name: u.name,
    uid: u.name,
    device,
    ua: ua.slice(0, 200),
                lastSeen: Date.now(),
                tier: getTier(),
  });
}

// ============ Chat log ============
async function logChatToCloud(entry) {
  await fdb.post("chatlogs", {
    ...entry,
    ts: Date.now(),
  });
}

// ============ Image log ============
async function logImageToCloud(entry) {
  await fdb.post("imagelogs", {
    ...entry,
    ts: Date.now(),
  });
}

// ============ Orders ============
async function fetchAllOrdersCloud() {
  const remote = await fdb.get("orders");
  if (!remote) return [];
  return Object.entries(remote).map(([id, o]) => ({ id, ...o }));
}
async function fetchMyOrdersCloud() {
  const all = await fetchAllOrdersCloud();
  const me = getUser()?.name || "anonymous";
  return all.filter(o => o.user === me);
}
async function saveOrderCloud(order) {
  const list = getOrders(); list.unshift(order);
  try { setOrders(list.slice(0, 100)); } catch {}
  const r = await fdb.put(`orders/${order.id}`, order);
  return r && r.__error ? { ok:false, error:r.__error } : { ok:true };
}

function effectiveKeys() {
  const a = getAdminKeys(), u = getKeys();
  return {
    pollinations: a.pollinations || u.pollinations || "",
    huggingface:  a.huggingface  || u.huggingface  || "",
    airouteToken: a.airouteToken || u.airouteToken || "",
    airouteBase:  a.airouteBase  || u.airouteBase  || "",
  };
}

function applyAppearance() {
  const a = getAppearance();
  document.documentElement.setAttribute("data-mode", a.mode);
  document.documentElement.setAttribute("data-accent", a.accent);
  document.documentElement.setAttribute("data-corners", a.corners);
  document.documentElement.setAttribute("data-font", a.font);
  document.documentElement.setAttribute("data-density", a.density);
  const hlDark = document.getElementById("hljs-dark"), hlLight = document.getElementById("hljs-light");
  if (hlDark && hlLight) { hlDark.disabled = a.mode !== "dark"; hlLight.disabled = a.mode === "dark"; }
  document.querySelectorAll("#modeOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === a.mode));
  document.querySelectorAll("#accentSwatches .swatch").forEach(s => s.classList.toggle("active", s.dataset.accent === a.accent));
  document.querySelectorAll("#cornersOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.corners === a.corners));
  document.querySelectorAll("#fontOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.font === a.font));
  document.querySelectorAll("#densityOptions .option-btn").forEach(b => b.classList.toggle("active", b.dataset.density === a.density));
}

async function applyBroadcast() {
  let b = readJSON(STORE.broadcast, null);
  const remote = await fdb.get("broadcast");
  if (remote && remote.message) { b = remote; writeJSON(STORE.broadcast, remote); }
  const banner = document.getElementById("broadcastBanner");
  if (!b || !b.message || sessionStorage.getItem("mx_bc_dismissed") === String(b.ts)) { banner.style.display = "none"; return; }
  banner.className = "broadcast-banner " + (b.type || "info");
  document.getElementById("broadcastText").textContent = b.message;
  banner.style.display = "flex";
  document.getElementById("broadcastClose").onclick = () => {
    sessionStorage.setItem("mx_bc_dismissed", String(b.ts));
    banner.style.display = "none";
  };
}

window.addEventListener("load", async () => {
  setTimeout(() => document.getElementById("loadingScreen").classList.add("hidden"), 400);
  applyAppearance();
  await applyBroadcast();
  await checkBanStatus();
  loadUser(); loadTierUI(); loadHistory();
  await renderMyOrders();
  hydrateSettings();
  await logUserHeartbeat();
  setInterval(checkBanStatus, 3000);
  setInterval(logUserHeartbeat, 30000);
});

// ============ Modals ============
const openModal = id => document.getElementById(id)?.classList.add("open");
const closeModal = id => document.getElementById(id)?.classList.remove("open");
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.dataset.close)));
document.querySelectorAll(".modal-overlay").forEach(o => o.addEventListener("click", e => { if (e.target === o) o.classList.remove("open"); }));
document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".modal-overlay.open").forEach(o => o.classList.remove("open")); });

// ============ Sidebar ============
const sidebar = document.getElementById("sidebar"), sidebarScrim = document.getElementById("sidebarScrim");
const openSidebar = () => { sidebar.classList.add("open"); sidebarScrim.classList.add("open"); };
const closeSidebar = () => { sidebar.classList.remove("open"); sidebarScrim.classList.remove("open"); };
document.getElementById("hamburgerBtn").addEventListener("click", openSidebar);
document.getElementById("sidebarCloseBtn").addEventListener("click", closeSidebar);
sidebarScrim.addEventListener("click", closeSidebar);

// ============ User ============
let __user = null;
function loadUser() {
  __user = getUser();
  document.getElementById("userChipLabel").textContent = __user ? __user.name : "Sign in";
}
document.getElementById("userChip").addEventListener("click", () => { if (!__user) openModal("loginModal"); });
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = document.getElementById("loginName").value.trim();
  if (!name) return;
  __user = { name }; setUser(__user); loadUser();
  const p = getPersonal(); p.userName = name; setPersonal(p);
  closeModal("loginModal");
  await logUserHeartbeat();
  await checkBanStatus();
  await renderMyOrders();
});

// ============ Tier ============
function loadTierUI() {
  const t = getTier(), plan = PLANS[t] || PLANS.free;
  document.getElementById("tierLabel").textContent = `${plan.label} plan`;
  document.getElementById("tierMeta").textContent = t === "free" ? "Running in your browser" : "Active subscription";
  const icon = document.querySelector(".tier-chip-icon");
  if (icon) icon.style.background = t === "ultimate" ? "linear-gradient(135deg,#8b5cf6,#6d28d9)"
    : t === "pro" ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
    : "linear-gradient(135deg,var(--accent),var(--accent-hover))";
}
document.getElementById("upgradeBtn").addEventListener("click", () => { openModal("plansModal"); renderPlans(); renderMyOrders(); });

// ============ History ============
const chat = document.getElementById("chat");
const historyList = document.getElementById("historyList");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const searchInput = document.getElementById("chatSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
let currentConversationId = null;
const escapeHtml = s => { const d = document.createElement("div"); d.textContent = String(s); return d.innerHTML; };
const scrollToBottom = () => { chat.scrollTop = chat.scrollHeight; };
const isNearBottom = () => chat.scrollHeight - chat.scrollTop - chat.clientHeight < 150;

function loadHistory(query) {
  const chats = getChats();
  const q = (query || "").toLowerCase().trim();
  const list = q ? chats.filter(c => c.title.toLowerCase().includes(q) || c.messages.some(m => m.text.toLowerCase().includes(q))) : chats;
  historyList.innerHTML = "";
  if (!list.length) { historyList.innerHTML = `<li class="history-empty">${q ? "No chats matched." : "No conversations yet"}</li>`; return; }
  list.sort((a, b) => b.updated - a.updated).forEach(c => {
    const li = document.createElement("li");
    li.className = "history-item" + (c.id === currentConversationId ? " active" : "");
    li.innerHTML = `<i class="ri-chat-3-line"></i><div><span>${escapeHtml(c.title)}</span></div><button class="history-delete"><i class="ri-delete-bin-line"></i></button>`;
    li.addEventListener("click", e => {
      if (e.target.closest(".history-delete")) return;
      openConversation(c.id);
      if (window.innerWidth <= 860) closeSidebar();
    });
      li.querySelector(".history-delete").addEventListener("click", e => {
        e.stopPropagation();
        const behavior = getBehavior();
        if (behavior.confirmDelete && !confirm("Delete this chat?")) return;
        setChats(getChats().filter(x => x.id !== c.id));
        if (currentConversationId === c.id) startNewChat();
        loadHistory(searchInput.value);
      });
      historyList.appendChild(li);
  });
}
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  clearSearchBtn.classList.toggle("visible", !!q);
  loadHistory(q);
});
clearSearchBtn.addEventListener("click", () => { searchInput.value = ""; clearSearchBtn.classList.remove("visible"); loadHistory(""); });
function openConversation(id) {
  const c = getChats().find(x => x.id === id); if (!c) return;
  currentConversationId = c.id;
  chatTitle.textContent = c.title;
  chatSubtitle.textContent = "";
  chat.innerHTML = "";
  c.messages.forEach(m => addMessage(m.text, m.role === "user" ? "user" : "ai"));
}
function startNewChat() {
  currentConversationId = null;
  chat.innerHTML = "";
  addMessage("Hello, I'm MiroxAI. Chat with me.", "ai");
  chatTitle.textContent = "New chat";
  chatSubtitle.textContent = "";
  loadHistory(searchInput.value);
}
document.getElementById("newChatBtn").addEventListener("click", () => { startNewChat(); if (window.innerWidth <= 860) closeSidebar(); });
document.getElementById("editTitleBtn").addEventListener("click", () => {
  const cur = chatTitle.textContent;
  const next = prompt("Rename this chat", cur);
  if (!next || !next.trim()) return;
  chatTitle.textContent = next.trim();
  if (currentConversationId) {
    const chats = getChats(); const c = chats.find(x => x.id === currentConversationId);
    if (c) { c.title = next.trim(); setChats(chats); loadHistory(searchInput.value); }
  }
});

// ============ Rendering ============
function renderMarkdown(container, text) {
  if (!window.marked || !window.DOMPurify) { container.textContent = text; return; }
  const raw = marked.parse(text, { breaks: true, gfm: true });
  container.innerHTML = DOMPurify.sanitize(raw, { ADD_ATTR: ["target"] });
  container.querySelectorAll("a").forEach(a => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
  if (window.hljs) container.querySelectorAll("pre code").forEach(b => { try { hljs.highlightElement(b); } catch {} });
}
function buildMessage(text, sender) {
  const m = document.createElement("div");
  m.className = `message ${sender}`;
  const a = document.createElement("div");
  if (sender === "ai") { a.className = "avatar ai-avatar"; a.innerHTML = `<img src="logo.png" alt="">`; }
  else { a.className = "avatar user-avatar"; a.innerHTML = `<i class="ri-user-3-line"></i>`; }
  m.appendChild(a);
  const w = document.createElement("div"); w.className = "bubble-wrap";
  const b = document.createElement("div"); b.className = "bubble";
  if (sender === "ai") renderMarkdown(b, text); else b.textContent = text;
  w.appendChild(b); m.appendChild(w); chat.appendChild(m);
  return { message: m, bubble: b, wrap: w };
}
function addMessage(text, sender) { const r = buildMessage(text, sender); scrollToBottom(); return r; }
function addThinking() {
  document.getElementById("thinkingMessage")?.remove();
  const m = document.createElement("div");
  m.className = "message ai"; m.id = "thinkingMessage";
  m.innerHTML = `<div class="avatar ai-avatar"><img src="logo.png" alt=""></div>
  <div class="bubble-wrap"><div class="bubble"><div class="thinking">
  <span class="thinking-word"><span>T</span><span>h</span><span>i</span><span>n</span><span>k</span><span>i</span><span>n</span><span>g</span></span>
  <span class="thinking-dots"><span></span><span></span><span></span></span>
  </div></div></div>`;
  chat.appendChild(m); scrollToBottom();
}
function removeThinking() { document.getElementById("thinkingMessage")?.remove(); }

// ============ Attachments ============
const fileInput = document.getElementById("fileInput"), attachBtn = document.getElementById("attachBtn");
const attachmentPreview = document.getElementById("attachmentPreview"), attachmentName = document.getElementById("attachmentName");
const removeAttachmentBtn = document.getElementById("removeAttachmentBtn");
const attThumb = document.getElementById("attThumb"), attIcon = document.getElementById("attIcon"), attSpinner = document.getElementById("attSpinner");
let pendingAttachment = null;
attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0]; if (!file) return;
  attachmentPreview.style.display = "flex";
  attSpinner.style.display = "inline-flex"; attIcon.style.display = "none"; attThumb.style.display = "none";
  attachmentName.textContent = `Reading ${file.name}…`;
  if (file.type.startsWith("image/")) {
    const r = new FileReader();
    r.onload = () => {
      attSpinner.style.display = "none"; attThumb.src = r.result; attThumb.style.display = "block";
      attachmentName.textContent = file.name;
      pendingAttachment = { name: file.name, content: r.result, type: "image" };
    };
    r.readAsDataURL(file);
  } else {
    if (file.size > 2 * 1024 * 1024) { addMessage("That file is over 2MB.", "ai"); clearAttachment(); return; }
    const r = new FileReader();
    r.onload = () => {
      const content = String(r.result);
      attSpinner.style.display = "none"; attIcon.style.display = "inline-flex";
      attachmentName.textContent = `${file.name} · ${(content.length / 1024).toFixed(1)} KB`;
      pendingAttachment = { name: file.name, content, type: "text" };
    };
    r.readAsText(file);
  }
  fileInput.value = "";
});
function clearAttachment() {
  pendingAttachment = null;
  attachmentPreview.style.display = "none";
  if (attThumb) { attThumb.src = ""; attThumb.style.display = "none"; }
  if (attIcon) attIcon.style.display = "none";
}
removeAttachmentBtn.addEventListener("click", clearAttachment);

// ============ AI ============
const POLLINATIONS_CHAT = "https://text.pollinations.ai/openai";
const POLLINATIONS_IMG  = "https://image.pollinations.ai/prompt/";
const HF_ROUTER_URL     = "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL          = "Qwen/Qwen2.5-Coder-32B-Instruct:fastest";

let currentModel = "mirox-gen1";
document.querySelectorAll(".model-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".model-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active"); currentModel = chip.dataset.model;
  });
});

function buildSystemPrompt() {
  const p = getPersonal(), b = getBehavior();
  const styles = {
    bestie:"You're their best friend — warm, casual, hype them up.",
    supportive:"You're a caring, supportive friend — encouraging and kind.",
    casual:"You're a chill friend — relaxed, laid back, no formality.",
    witty:"You're a witty friend — clever humor, punchy, still helpful."
  };
  const parts = [
    `You are MiroxAI, the user's personal AI friend. ${styles[p.friendship] || styles.bestie}`,
    "Be helpful. Use markdown. For code, always output the complete file. Use ```file:path.ext``` fences for project files."
  ];
  if (p.userName) parts.push(`The user's name is ${p.userName}.`);
  if (p.persona) parts.push(`Extra: ${p.persona}`);
  if (b.replyStyle === "concise") parts.push("Keep replies short.");
  if (b.replyStyle === "detailed") parts.push("Give thorough, detailed answers.");
  return parts.join(" ");
}

async function callPollinations(messages, apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const modelId = currentModel === "mirox-ultra-v1" ? "openai" : "openai-fast";
  const res = await fetch(POLLINATIONS_CHAT, {
    method:"POST", headers,
    body: JSON.stringify({ model:modelId, messages:[{role:"system",content:buildSystemPrompt()}, ...messages], stream:true, private:true })
  });
  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  return res;
}
async function callHF(messages, apiKey) {
  if (!apiKey) throw new Error("No HF token");
  const res = await fetch(HF_ROUTER_URL, {
    method:"POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}` },
    body: JSON.stringify({ model:HF_MODEL, messages:[{role:"system",content:buildSystemPrompt()}, ...messages], stream:true, max_tokens:4096, temperature:0.7 })
  });
  if (!res.ok) throw new Error(`HF ${res.status}`);
  return res;
}
async function callChatAI(messages) {
  const keys = effectiveKeys();
  try { return await callPollinations(messages, keys.pollinations); }
  catch (e) { console.warn("Pollinations failed:", e.message); }
  if (keys.huggingface) {
    try { return await callHF(messages, keys.huggingface); }
    catch (e) { console.warn("HF failed:", e.message); }
  }
  throw new Error("All AI providers failed. Add a key in Settings → Keys.");
}

// ============ Image Studio ============
const RATIO_SIZES = { "1:1":[1024,1024], "3:4":[896,1152], "4:3":[1152,896], "16:9":[1280,720] };
const STYLE_SUFFIX = { photo:"photorealistic", illustration:"digital illustration", anime:"anime style", "3d":"3D render" };
let selectedStyle = "", selectedRatio = "1:1";
document.querySelectorAll("#styleChips .chip").forEach(c => c.addEventListener("click", () => {
  document.querySelectorAll("#styleChips .chip").forEach(x => x.classList.remove("active"));
  c.classList.add("active"); selectedStyle = c.dataset.style || "";
}));
document.querySelectorAll("#ratioChips .chip").forEach(c => c.addEventListener("click", () => {
  document.querySelectorAll("#ratioChips .chip").forEach(x => x.classList.remove("active"));
  c.classList.add("active"); selectedRatio = c.dataset.ratio || "1:1";
}));
function buildImageUrl(prompt, style, ratio, sizeOverride) {
  let full = prompt;
  if (style && STYLE_SUFFIX[style]) full += `, ${STYLE_SUFFIX[style]}`;
  const [w, h] = sizeOverride ? [sizeOverride, sizeOverride] : (RATIO_SIZES[ratio] || RATIO_SIZES["1:1"]);
  const keys = effectiveKeys();
  let url = `${POLLINATIONS_IMG}${encodeURIComponent(full)}?width=${w}&height=${h}&nologo=true&seed=${Math.floor(Math.random()*1e9)}`;
  if (keys.pollinations) url += `&token=${encodeURIComponent(keys.pollinations)}`;
  return url;
}
document.getElementById("generateImageBtn").addEventListener("click", () => {
  const prompt = document.getElementById("imagePromptInput").value.trim();
  const status = document.getElementById("imageStudioStatus");
  const gallery = document.getElementById("imageGallery");
  if (!prompt) { status.textContent = "Describe what you want first."; return; }
  status.textContent = "Generating…";
  const card = document.createElement("div"); card.className = "gallery-card";
  card.innerHTML = `<div class="gallery-skeleton"></div>`; gallery.prepend(card);
  const url = buildImageUrl(prompt, selectedStyle, selectedRatio);
  const started = Date.now();
  const img = new Image();
  img.onload = () => {
    card.innerHTML = `<img src="${url}" alt="${escapeHtml(prompt)}">`;
    status.textContent = "Done ✅";
    logImageToCloud({ user: getUser()?.name || "anonymous", prompt, url, ok: true, ms: Date.now() - started });
  };
  img.onerror = () => {
    card.innerHTML = `<div class="gallery-error"><i class="ri-error-warning-line"></i><span>Failed</span></div>`;
    status.textContent = "Generation failed.";
    logImageToCloud({ user: getUser()?.name || "anonymous", prompt, url, ok: false, ms: Date.now() - started });
  };
  img.src = url;
});

// ============ Video Studio ============
const videoLoader = document.getElementById("videoLoader"), videoLoaderPct = document.getElementById("videoLoaderPct");
const videoLoaderBar = document.getElementById("videoLoaderBar"), videoLoaderStatus = document.getElementById("videoLoaderStatus");
const videoLoaderSub = document.getElementById("videoLoaderSub"), videoRingFg = document.getElementById("videoRingFg");
const videoResult = document.getElementById("videoResult"), videoPlayer = document.getElementById("videoPlayer");
const videoDownloadLink = document.getElementById("videoDownloadLink");
const RING_CIRC = 326.7256;
function setVideoProgress(pct, status, sub) {
  pct = Math.max(0, Math.min(100, pct));
  if (videoRingFg) videoRingFg.style.strokeDashoffset = String(RING_CIRC * (1 - pct / 100));
  if (videoLoaderPct) videoLoaderPct.textContent = Math.round(pct) + "%";
  if (videoLoaderBar) videoLoaderBar.style.width = pct + "%";
  if (videoLoaderStatus && status !== undefined) videoLoaderStatus.textContent = status;
  if (videoLoaderSub && sub !== undefined) videoLoaderSub.textContent = sub;
}
function waitPaint() { return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res()))); }
function loadImg(src, ms = 15000) {
  return new Promise((res, rej) => {
    const img = new Image(); let done = false;
    const t = setTimeout(() => { if (!done) { done = true; rej(new Error("timeout")); } }, ms);
    img.onload = () => { if (done) return; done = true; clearTimeout(t); res(img); };
    img.onerror = () => { if (done) return; done = true; clearTimeout(t); rej(new Error("decode")); };
    img.crossOrigin = "anonymous"; img.src = src;
  });
}
async function buildVideo(frames, fps, size, onP) {
  const imgs = [];
  for (let i = 0; i < frames.length; i++) {
    try { imgs.push(await loadImg(frames[i])); } catch {}
    if (onP) onP("load", i+1, frames.length);
  }
  if (imgs.length < 2) throw new Error("Not enough frames");
  const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
  const ctx = cv.getContext("2d", { alpha:false });
  ctx.fillStyle = "#000"; ctx.fillRect(0,0,size,size); ctx.drawImage(imgs[0],0,0,size,size);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9"
  : (MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm");
  const stream = cv.captureStream(fps);
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType:mime, videoBitsPerSecond:2500000 });
  const stopped = new Promise((res, rej) => { rec.onstop = () => res(); rec.onerror = e => rej(e); });
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  await waitPaint(); rec.start(200);
  const delay = Math.max(120, Math.round(1000/fps));
  for (let i = 0; i < imgs.length; i++) {
    ctx.drawImage(imgs[i], 0, 0, size, size);
    await waitPaint();
    await new Promise(r => setTimeout(r, delay));
    if (onP) onP("render", i+1, imgs.length);
  }
  await new Promise(r => setTimeout(r, 600));
  rec.stop(); await stopped;
  return new Blob(chunks, { type:mime });
}
document.getElementById("generateVideoBtn").addEventListener("click", async () => {
  const p = document.getElementById("videoPromptInput").value.trim();
  const st = document.getElementById("videoStudioStatus");
  const btn = document.getElementById("generateVideoBtn");
  if (!p) { st.textContent = "Describe the video first."; return; }
  btn.disabled = true; st.textContent = "";
  videoResult.style.display = "none"; videoLoader.style.display = "flex";
  setVideoProgress(2, "Generating frames…", "0/8");
  const N = 8, SIZE = 384;
  const motions = ["wide shot","zoom in","pan left","pan right","medium shot","close-up","pull back","wide shot"];
  const frames = new Array(N).fill(null); let done = 0;
  await Promise.all(motions.map((m, i) => new Promise(res => {
    const url = buildImageUrl(`${p}, ${m}, frame ${i+1}/${N}, cinematic`, "", "1:1", SIZE);
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { frames[i] = url; done++; setVideoProgress(5+(done/N)*40, "Generating frames…", `${done}/${N}`); res(); };
    img.onerror = () => { done++; res(); };
    img.src = url;
  })));
  const ok = frames.filter(Boolean);
  if (ok.length < 2) { videoLoader.style.display = "none"; st.textContent = "Video failed."; btn.disabled = false; return; }
  setVideoProgress(50, "Assembling…", `${ok.length} frames`);
  try {
    const blob = await buildVideo(ok, 4, SIZE, (stage, n, t) => {
      if (stage === "load") setVideoProgress(50+(n/t)*20, `Loading ${n}/${t}…`, "");
      if (stage === "render") setVideoProgress(70+(n/t)*30, `Rendering ${n}/${t}…`, "WebM");
    });
    setVideoProgress(100, "Done ✅", "");
    await new Promise(r => setTimeout(r, 350));
    const url = URL.createObjectURL(blob);
    videoPlayer.src = url; videoDownloadLink.href = url;
    videoLoader.style.display = "none"; videoResult.style.display = "flex";
    st.textContent = "5s silent video (sound will come soon).";
  } catch (e) { videoLoader.style.display = "none"; st.textContent = "Video failed: " + e.message; }
  finally { btn.disabled = false; }
});

// ============ Send ============
let isReplying = false;
async function sendMessage(userText) {
  if (isReplying) return;
  isReplying = true;
  document.getElementById("sendBtn").disabled = true;

  if (/^\/image\s+/i.test(userText)) { isReplying = false; document.getElementById("sendBtn").disabled = false; openModal("imageModal"); document.getElementById("imagePromptInput").value = userText.replace(/^\/image\s+/i, ""); return; }
  if (/^\/video\s+/i.test(userText)) { isReplying = false; document.getElementById("sendBtn").disabled = false; openModal("videoModal"); document.getElementById("videoPromptInput").value = userText.replace(/^\/video\s+/i, ""); return; }
  if (/^\/plans?\b/i.test(userText)) { isReplying = false; document.getElementById("sendBtn").disabled = false; openModal("plansModal"); renderPlans(); renderMyOrders(); return; }

  const attachment = pendingAttachment; clearAttachment();
  let msgForModel = userText;
  if (attachment && attachment.type !== "image") msgForModel = `Attached "${attachment.name}":\n\n\`\`\`\n${attachment.content.slice(0, 12000)}\n\`\`\`\n\nRequest:\n${userText}`;
  addMessage(userText || (attachment?.type === "image" ? "(image)" : ""), "user");
  addThinking(); chatSubtitle.textContent = "Thinking…";

  const chats = getChats();
  let c = currentConversationId ? chats.find(x => x.id === currentConversationId) : null;
  if (!c) {
    c = { id: crypto.randomUUID(), title: userText.slice(0, 48) || "New chat", updated: Date.now(), messages: [] };
    chats.push(c); currentConversationId = c.id; chatTitle.textContent = c.title;
  }

  const apiMessages = c.messages.slice(-6).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
  if (attachment?.type === "image") {
    apiMessages.push({ role:"user", content:[
      { type:"text", text: userText || "Describe this image." },
      { type:"image_url", image_url:{ url: attachment.content } }
    ]});
  } else {
    apiMessages.push({ role: "user", content: msgForModel });
  }

  const start = performance.now();
  try {
    const res = await callChatAI(apiMessages);
    removeThinking();
    const { bubble } = buildMessage("", "ai");
    bubble.innerHTML = '<span class="stream-cursor"></span>';

    const reader = res.body.getReader(), decoder = new TextDecoder();
    let buffer = "", fullText = "", firstToken = true;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim(); buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const obj = JSON.parse(payload);
          const delta = obj.choices?.[0]?.delta?.content || "";
          if (delta) {
            if (firstToken) { firstToken = false; chatSubtitle.textContent = `thinking · ${Math.round(performance.now() - start)}ms`; }
            fullText += delta;
            renderMarkdown(bubble, fullText);
            const cur = document.createElement("span"); cur.className = "stream-cursor"; bubble.appendChild(cur);
            if (isNearBottom()) scrollToBottom();
          }
        } catch {}
      }
    }
    const totalMs = Math.round(performance.now() - start);
    bubble.querySelectorAll(".stream-cursor").forEach(x => x.remove());
    renderMarkdown(bubble, fullText || "(empty reply)");
    c.messages.push({ role:"user", text:userText });
    c.messages.push({ role:"ai", text:fullText });
    c.updated = Date.now();
    setChats(chats); loadHistory(searchInput.value);
    chatSubtitle.textContent = `done · ${totalMs}ms`;
    logChatToCloud({
      user: getUser()?.name || "anonymous",
                   model: currentModel,
                   userMsg: userText.slice(0, 500),
                   aiMsg: fullText.slice(0, 1500),
                   ms: totalMs,
                   vision: attachment?.type === "image",
    });
  } catch (err) {
    removeThinking();
    addMessage(`Error: ${err.message}`, "ai");
    chatSubtitle.textContent = "";
  } finally { isReplying = false; document.getElementById("sendBtn").disabled = false; }
}
document.getElementById("composerForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (!text && !pendingAttachment) return;
  input.value = "";
  sendMessage(text || "(see attached file)");
});

// ============ Voice ============
const micBtn = document.getElementById("micBtn");
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SR) {
  recognition = new SR();
  recognition.continuous = false; recognition.interimResults = true; recognition.lang = "en-US";
  recognition.onresult = e => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; document.getElementById("messageInput").value = t; };
  recognition.onend = () => micBtn.classList.remove("active");
  recognition.onerror = () => micBtn.classList.remove("active");
}
micBtn.addEventListener("click", () => {
  if (!recognition) { addMessage("Voice input isn't supported in this browser.", "ai"); return; }
  if (micBtn.classList.contains("active")) { recognition.stop(); return; }
  micBtn.classList.add("active");
  try { recognition.start(); } catch { micBtn.classList.remove("active"); }
});

// ============ Rail — Admin redirects ============
document.getElementById("imageModeBtn").addEventListener("click", () => openModal("imageModal"));
document.getElementById("videoModeBtn").addEventListener("click", () => openModal("videoModal"));
document.getElementById("plansModeBtn").addEventListener("click", () => { openModal("plansModal"); renderPlans(); renderMyOrders(); });
document.getElementById("aboutBtn").addEventListener("click", () => openModal("aboutModal"));
document.getElementById("adminRailBtn").addEventListener("click", () => { location.href = "admin.html"; });
document.getElementById("settingsBtn").addEventListener("click", () => openSettings());

// ============ Settings ============
function openSettings(tab) { openModal("settingsModal"); hydrateSettings(); if (tab) switchSettingsTab(tab); }
function switchSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  document.querySelectorAll(".settings-pane").forEach(p => p.classList.toggle("active", p.dataset.pane === tab));
}
document.querySelectorAll(".settings-tab").forEach(t => t.addEventListener("click", () => switchSettingsTab(t.dataset.tab)));
function hydrateSettings() {
  const a = getAppearance(), p = getPersonal(), b = getBehavior(), k = getKeys();
  document.querySelectorAll("#modeOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.mode === a.mode));
  document.querySelectorAll("#accentSwatches .swatch").forEach(x => x.classList.toggle("active", x.dataset.accent === a.accent));
  document.querySelectorAll("#cornersOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.corners === a.corners));
  document.querySelectorAll("#fontOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.font === a.font));
  document.querySelectorAll("#densityOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.density === a.density));
  document.getElementById("setUserName").value = p.userName || "";
  document.querySelectorAll("#friendshipOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.friendship === (p.friendship || "bestie")));
  document.getElementById("setPersona").value = p.persona || "";
  document.getElementById("setConfirmDelete").checked = !!b.confirmDelete;
  document.querySelectorAll("#replyStyleOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.style === b.replyStyle));
  document.getElementById("keyPollinations").value = k.pollinations || "";
  document.getElementById("keyHuggingface").value = k.huggingface || "";
  document.getElementById("keyAirouteToken").value = k.airouteToken || "";
  document.getElementById("keyAirouteBase").value = k.airouteBase || "";
}
document.querySelectorAll("#modeOptions .option-btn").forEach(b => b.addEventListener("click", () => { const a = getAppearance(); a.mode = b.dataset.mode; setAppearance(a); applyAppearance(); }));
document.querySelectorAll("#accentSwatches .swatch").forEach(s => s.addEventListener("click", () => { const a = getAppearance(); a.accent = s.dataset.accent; setAppearance(a); applyAppearance(); }));
document.querySelectorAll("#cornersOptions .option-btn").forEach(b => b.addEventListener("click", () => { const a = getAppearance(); a.corners = b.dataset.corners; setAppearance(a); applyAppearance(); }));
document.querySelectorAll("#fontOptions .option-btn").forEach(b => b.addEventListener("click", () => { const a = getAppearance(); a.font = b.dataset.font; setAppearance(a); applyAppearance(); }));
document.querySelectorAll("#densityOptions .option-btn").forEach(b => b.addEventListener("click", () => { const a = getAppearance(); a.density = b.dataset.density; setAppearance(a); applyAppearance(); }));
let personalTimer = null;
function savePersonalDebounced() {
  clearTimeout(personalTimer);
  personalTimer = setTimeout(() => {
    const p = getPersonal();
    p.userName = document.getElementById("setUserName").value.trim();
    p.persona = document.getElementById("setPersona").value.trim();
    setPersonal(p);
    if (p.userName) { __user = { ...(__user||{}), name:p.userName }; setUser(__user); loadUser(); }
  }, 400);
}
document.getElementById("setUserName").addEventListener("input", savePersonalDebounced);
document.getElementById("setPersona").addEventListener("input", savePersonalDebounced);
document.querySelectorAll("#friendshipOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const p = getPersonal(); p.friendship = b.dataset.friendship; setPersonal(p);
  document.querySelectorAll("#friendshipOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
}));
document.getElementById("setConfirmDelete").addEventListener("change", e => { const b = getBehavior(); b.confirmDelete = e.target.checked; setBehavior(b); });
document.querySelectorAll("#replyStyleOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const cur = getBehavior(); cur.replyStyle = b.dataset.style; setBehavior(cur);
  document.querySelectorAll("#replyStyleOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
}));
document.getElementById("saveKeysBtn").addEventListener("click", () => {
  setKeys({
    pollinations: document.getElementById("keyPollinations").value.trim(),
          huggingface: document.getElementById("keyHuggingface").value.trim(),
          airouteToken: document.getElementById("keyAirouteToken").value.trim(),
          airouteBase: document.getElementById("keyAirouteBase").value.trim()
  });
  const s = document.getElementById("keysSaveStatus");
  s.style.color = "#16a34a"; s.textContent = "Saved ✅";
  setTimeout(() => s.textContent = "", 2000);
});

// ============ Plans ============
function renderPlans() {
  const grid = document.getElementById("plansGrid");
  const currentTier = getTier();
  grid.innerHTML = Object.values(PLANS).map(p => {
    const isCurrent = currentTier === p.id, featured = p.id === "pro";
    const priceHtml = p.price > 0 ? `R$ ${p.price}` : `<span style="color:var(--text-muted);font-weight:700">Free</span>`;
    let btn;
    if (p.id === "free") btn = `<div class="plan-buy disabled">Free forever</div>`;
    else if (isCurrent) btn = `<div class="plan-buy disabled">Current plan</div>`;
    else btn = `<button class="plan-buy" data-buy="${p.id}">Buy for R$ ${p.price}</button>`;
    return `<div class="plan-card${featured ? " featured" : ""}${isCurrent ? " current" : ""}">
    ${isCurrent ? '<span class="plan-badge current">Current</span>' : (featured ? '<span class="plan-badge">Popular</span>' : "")}
    <div class="plan-name">${p.label}</div>
    <div class="plan-tagline">${p.tagline}</div>
    <div class="plan-price">${priceHtml}</div>
    <ul class="plan-perks">${p.perks.map(x => `<li><i class="ri-check-line"></i><span>${x}</span></li>`).join("")}</ul>
    ${btn}</div>`;
  }).join("");
  grid.querySelectorAll("[data-buy]").forEach(b => b.addEventListener("click", () => openBuy(b.dataset.buy)));
}
let buyingPlan = null, pendingProof = null;
function openBuy(planId) {
  buyingPlan = PLANS[planId];
  if (!buyingPlan || buyingPlan.price === 0) return;
  document.getElementById("buyTitle").textContent = `Buy ${buyingPlan.label}`;
  document.getElementById("buySub").textContent = `Pay R$ ${buyingPlan.price} via Roblox gamepass, then upload a screenshot of your receipt.`;
  document.getElementById("buyPrice").textContent = `R$ ${buyingPlan.price}`;
  const link = document.getElementById("gamepassLink");
  if (buyingPlan.gamepass) { link.href = `https://www.roblox.com/game-pass/${buyingPlan.gamepass}`; link.style.display = "flex"; }
    else link.style.display = "none";
    pendingProof = null;
  document.getElementById("proofPreviewWrap").style.display = "none";
  document.getElementById("proofStatus").textContent = "";
  document.getElementById("submitProofBtn").disabled = true;
  closeModal("plansModal"); openModal("buyModal");
}
const proofZone = document.getElementById("proofUploadZone");
const proofInput = document.getElementById("proofFileInput");
proofZone.addEventListener("click", () => proofInput.click());
proofZone.addEventListener("dragover", e => { e.preventDefault(); proofZone.classList.add("drag"); });
proofZone.addEventListener("dragleave", () => proofZone.classList.remove("drag"));
proofZone.addEventListener("drop", e => { e.preventDefault(); proofZone.classList.remove("drag"); if (e.dataTransfer.files.length) handleProofFile(e.dataTransfer.files[0]); });
proofInput.addEventListener("change", () => { if (proofInput.files.length) handleProofFile(proofInput.files[0]); proofInput.value = ""; });
async function handleProofFile(file) {
  if (!file.type.startsWith("image/")) { document.getElementById("proofStatus").textContent = "Choose an image."; return; }
  if (file.size > 20 * 1024 * 1024) { document.getElementById("proofStatus").textContent = "Over 20MB."; return; }
  document.getElementById("proofStatus").textContent = "Compressing…";
  try {
    const dataUrl = await compressImage(file, 900, 0.75);
    const kb = Math.round((dataUrl.length * 0.75) / 1024);
    pendingProof = dataUrl;
    document.getElementById("proofPreview").src = dataUrl;
    document.getElementById("proofPreviewWrap").style.display = "block";
    document.getElementById("proofPreviewSize").textContent = `${file.name} · ${kb} KB`;
    document.getElementById("proofStatus").textContent = "Screenshot ready.";
    document.getElementById("submitProofBtn").disabled = false;
  } catch { document.getElementById("proofStatus").textContent = "Couldn't process."; }
}
document.getElementById("proofRemoveBtn").addEventListener("click", () => {
  pendingProof = null; document.getElementById("proofPreviewWrap").style.display = "none";
  document.getElementById("submitProofBtn").disabled = true;
  document.getElementById("proofStatus").textContent = "";
});
function compressImage(file, maxDim = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > maxDim || h > maxDim) { const s = Math.min(maxDim / w, maxDim / h); w = Math.round(w * s); h = Math.round(h * s); }
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, w, h);
        cx.drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
document.getElementById("submitProofBtn").addEventListener("click", async () => {
  if (!pendingProof || !buyingPlan) return;
  const btn = document.getElementById("submitProofBtn");
  btn.disabled = true; btn.textContent = "Submitting…";
  const order = {
    id: crypto.randomUUID(),
                                                           planId: buyingPlan.id, planLabel: buyingPlan.label, price: buyingPlan.price,
                                                           proof: pendingProof, user: __user?.name || "anonymous",
                                                           submittedAt: Date.now(), status: "pending", adminNote: ""
  };
  const r = await saveOrderCloud(order);
  if (!r.ok) {
    document.getElementById("proofStatus").style.color = "#dc2626";
    document.getElementById("proofStatus").textContent = "Sync failed: " + r.error;
    btn.disabled = false; btn.textContent = "Submit for verification";
    return;
  }
  pendingProof = null; buyingPlan = null;
  closeModal("buyModal"); openModal("plansModal");
  renderPlans(); await renderMyOrders();
  btn.textContent = "Submit for verification";
});
async function renderMyOrders() {
  const wrap = document.getElementById("myOrders");
  if (!wrap) return;
  wrap.innerHTML = `<h4>Loading orders…</h4>`;
  const cloud = await fetchMyOrdersCloud();
  if (!cloud.length) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = `<h4>Your orders (${cloud.length})</h4>` + cloud.map(o => `
  <div class="order-item">
  <img class="order-thumb" src="${o.proof}" alt="">
  <div class="order-info">
  <div class="order-title">${escapeHtml(o.planLabel)} · R$ ${o.price}</div>
  <div class="order-meta">Submitted ${new Date(o.submittedAt).toLocaleString()}</div>
  ${o.adminNote ? `<div class="order-meta">Note: ${escapeHtml(o.adminNote)}</div>` : ""}
  </div>
  <span class="order-status ${o.status}">${o.status}</span>
  </div>`).join("");
}
