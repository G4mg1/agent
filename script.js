/* MiroxAI — full-featured pure JS (background + extensions + call + responsive) */

// ============================================================
// CONSTANTS
// ============================================================
const ADMIN_PASSWORD = "2010";

const PLANS = {
  free: { id:"free", label:"Free", tagline:"Get started", price:0, gamepass:null,
    perks:["50 responses / day","5 images per 5 hours","10 image visions / day","Both models","Silent 5s video"] },
  pro: { id:"pro", label:"Pro", tagline:"For builders", price:250, gamepass:"1982144889",
    perks:["500 responses / day","Unlimited images","Unlimited vision","Both AI models","Unlimited 5s silent videos"] },
  ultimate: { id:"ultimate", label:"Ultimate", tagline:"Maximum power", price:1200, gamepass:"1983380864",
    perks:["3,000 responses / day","Unlimited everything","Ultimate reasoning model","Priority quality","Everything in Pro"] }
};

const STORE = {
  chats:      "miroxai_chats_v1",
  user:       "miroxai_user_v1",
  tier:       "miroxai_tier_v1",
  orders:     "miroxai_orders_v1",
  appearance: "miroxai_appearance_v1",
  personal:   "miroxai_personal_v1",
  behavior:   "miroxai_behavior_v1",
  keys:       "miroxai_keys_v1",
  adminKeys:  "miroxai_adminkeys_v1",
  broadcast:  "miroxai_broadcast_v1",
  background: "miroxai_bg_v1",
  extensions: "miroxai_ext_v1",
  voice:      "miroxai_voice_v1",
  railPref:   "miroxai_rail_v1",
};

const readJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? fb; } catch { return fb; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(e); } };

const getChats  = () => readJSON(STORE.chats, []);
const setChats  = v => writeJSON(STORE.chats, v);
const getUser   = () => readJSON(STORE.user, null);
const setUser   = v => writeJSON(STORE.user, v);
const getTier   = () => readJSON(STORE.tier, "free");
const setTier   = v => writeJSON(STORE.tier, v);
const getOrders = () => readJSON(STORE.orders, []);
const setOrders = v => writeJSON(STORE.orders, v);
const getAppearance = () => readJSON(STORE.appearance, { mode:"light", accent:"warm", corners:"soft", font:"system", density:"normal" });
const setAppearance = v => writeJSON(STORE.appearance, v);
const getPersonal   = () => readJSON(STORE.personal, { userName:"", friendship:"bestie", persona:"" });
const setPersonal   = v => writeJSON(STORE.personal, v);
const getBehavior   = () => readJSON(STORE.behavior, { confirmDelete:true, replyStyle:"balanced", reasoning:"auto" });
const setBehavior   = v => writeJSON(STORE.behavior, v);
const getKeys       = () => readJSON(STORE.keys, { pollinations:"", huggingface:"", airouteToken:"", airouteBase:"" });
const setKeys       = v => writeJSON(STORE.keys, v);
const getAdminKeys  = () => readJSON(STORE.adminKeys, { pollinations:"", huggingface:"", airouteToken:"", airouteBase:"" });
const setAdminKeys  = v => writeJSON(STORE.adminKeys, v);
const getBg         = () => readJSON(STORE.background, { url:null, dim:45, blur:0, fit:"cover" });
const setBg         = v => writeJSON(STORE.background, v);
const getExts       = () => readJSON(STORE.extensions, []);
const setExts       = v => writeJSON(STORE.extensions, v);

function effectiveKeys() {
  const a = getAdminKeys(), u = getKeys();
  return {
    pollinations: a.pollinations || u.pollinations || "",
    huggingface:  a.huggingface  || u.huggingface  || "",
    airouteToken: a.airouteToken || u.airouteToken || "",
    airouteBase:  a.airouteBase  || u.airouteBase  || "",
  };
}

// ============================================================
// APPLY APPEARANCE / BACKGROUND / EXTENSIONS
// ============================================================
function applyAppearance() {
  const a = getAppearance();
  document.documentElement.setAttribute("data-mode", a.mode);
  document.documentElement.setAttribute("data-accent", a.accent);
  document.documentElement.setAttribute("data-corners", a.corners);
  document.documentElement.setAttribute("data-font", a.font);
  document.documentElement.setAttribute("data-density", a.density);
  const hlDark = document.getElementById("hljs-dark"), hlLight = document.getElementById("hljs-light");
  if (hlDark && hlLight) { hlDark.disabled = a.mode !== "dark"; hlLight.disabled = a.mode === "dark"; }
}

function applyBackground() {
  const bg = getBg();
  const el = document.getElementById("userBackground");
  if (!el) return;
  if (!bg.url) {
    el.classList.remove("active"); el.style.backgroundImage = "";
    document.documentElement.style.setProperty("--bg-dim", "0");
    document.documentElement.style.setProperty("--bg-blur", "0px");
    return;
  }
  el.style.backgroundImage = `url('${bg.url}')`;
  el.style.backgroundSize = bg.fit === "repeat" ? "auto" : bg.fit;
  el.style.backgroundRepeat = bg.fit === "repeat" ? "repeat" : "no-repeat";
  el.style.setProperty("--bg-dim", (bg.dim / 100).toFixed(2));
  el.style.setProperty("--bg-blur", bg.blur + "px");
  el.classList.add("active");
}

function applyExtensions() {
  document.querySelectorAll("style[data-ext]").forEach(s => s.remove());
  getExts().forEach(ext => {
    if (!ext.enabled) return;
    const s = document.createElement("style");
    s.setAttribute("data-ext", ext.id);
    s.textContent = ext.css || "";
    document.head.appendChild(s);
  });
}

function applyBroadcast() {
  const b = readJSON(STORE.broadcast, null);
  const banner = document.getElementById("broadcastBanner");
  if (!b || !b.message || sessionStorage.getItem("miroxai_bc_dismissed") === String(b.ts)) {
    banner.style.display = "none"; return;
  }
  banner.className = "broadcast-banner " + (b.type || "info");
  document.getElementById("broadcastText").textContent = b.message;
  banner.style.display = "flex";
  document.getElementById("broadcastClose").onclick = () => {
    sessionStorage.setItem("miroxai_bc_dismissed", String(b.ts));
    banner.style.display = "none";
  };
}

// ============================================================
// RAIL (collapsible on desktop, floating on mobile)
// ============================================================
function isTablet() { return window.matchMedia("(max-width:1024px)").matches; }
function syncRailDefault() {
  if (isTablet()) {
    document.body.classList.remove("rail-collapsed");
    try { if (localStorage.getItem(STORE.railPref + "_open") === "1") document.body.classList.add("rail-open"); } catch {}
  } else {
    document.body.classList.remove("rail-open");
    try { if (localStorage.getItem(STORE.railPref + "_collapsed") === "1") document.body.classList.add("rail-collapsed"); } catch {}
  }
}
document.getElementById("railToggleBtn").addEventListener("click", () => {
  if (isTablet()) {
    document.body.classList.toggle("rail-open");
    try { localStorage.setItem(STORE.railPref + "_open", document.body.classList.contains("rail-open") ? "1" : "0"); } catch {}
  } else {
    document.body.classList.toggle("rail-collapsed");
    try { localStorage.setItem(STORE.railPref + "_collapsed", document.body.classList.contains("rail-collapsed") ? "1" : "0"); } catch {}
  }
});
let rzT; window.addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(syncRailDefault, 200); });

// ============================================================
// BOOT
// ============================================================
window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("loadingScreen").classList.add("hidden"), 400);
  applyAppearance();
  applyBackground();
  applyExtensions();
  applyBroadcast();
  syncRailDefault();
  loadUser();
  loadTierUI();
  loadHistory();
  renderMyOrders();
  hydrateSettings();
  refreshAdminSection();
  initVoice();
});

// ============================================================
// MODALS
// ============================================================
const openModal  = id => document.getElementById(id)?.classList.add("open");
const closeModal = id => document.getElementById(id)?.classList.remove("open");
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.dataset.close)));
document.querySelectorAll(".modal-overlay").forEach(o => o.addEventListener("click", e => { if (e.target === o) o.classList.remove("open"); }));
document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".modal-overlay.open").forEach(o => o.classList.remove("open")); });

// ============================================================
// SIDEBAR
// ============================================================
const sidebar = document.getElementById("sidebar"), sidebarScrim = document.getElementById("sidebarScrim");
const openSidebar  = () => { sidebar.classList.add("open"); sidebarScrim.classList.add("open"); };
const closeSidebar = () => { sidebar.classList.remove("open"); sidebarScrim.classList.remove("open"); };
document.getElementById("hamburgerBtn").addEventListener("click", openSidebar);
document.getElementById("sidebarCloseBtn").addEventListener("click", closeSidebar);
sidebarScrim.addEventListener("click", closeSidebar);

// ============================================================
// USER
// ============================================================
let __user = null;
function loadUser() {
  __user = getUser();
  document.getElementById("userChipLabel").textContent = __user ? __user.name : "Sign in";
}
document.getElementById("userChip").addEventListener("click", () => { if (!__user) openModal("loginModal"); });
document.getElementById("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("loginName").value.trim();
  if (!name) return;
  __user = { name };
  setUser(__user);
  loadUser();
  const p = getPersonal(); p.userName = name; setPersonal(p);
  closeModal("loginModal");
});

// ============================================================
// TIER UI
// ============================================================
function loadTierUI() {
  const t = getTier();
  const plan = PLANS[t] || PLANS.free;
  document.getElementById("tierLabel").textContent = `${plan.label} plan`;
  document.getElementById("tierMeta").textContent = t === "free" ? "Running in your browser" : "Active subscription";
  const icon = document.querySelector(".tier-chip-icon");
  if (icon) {
    icon.style.background = t === "ultimate"
      ? "linear-gradient(135deg,#8b5cf6,#6d28d9)"
      : t === "pro" ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
      : "linear-gradient(135deg,var(--accent),var(--accent-hover))";
  }
}
document.getElementById("upgradeBtn").addEventListener("click", () => { openModal("plansModal"); renderPlans(); renderMyOrders(); });

// ============================================================
// HISTORY
// ============================================================
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
  const c = getChats().find(x => x.id === id);
  if (!c) return;
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
    const chats = getChats();
    const c = chats.find(x => x.id === currentConversationId);
    if (c) { c.title = next.trim(); setChats(chats); loadHistory(searchInput.value); }
  }
});

// ============================================================
// MESSAGE RENDERING
// ============================================================
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
    <div class="bubble-wrap"><div class="bubble">
      <div class="thinking">
        <span class="thinking-word"><span>T</span><span>h</span><span>i</span><span>n</span><span>k</span><span>i</span><span>n</span><span>g</span></span>
        <span class="thinking-dots"><span></span><span></span><span></span></span>
      </div>
    </div></div>`;
  chat.appendChild(m); scrollToBottom();
}
function removeThinking() { document.getElementById("thinkingMessage")?.remove(); }

// ============================================================
// ATTACHMENTS
// ============================================================
const fileInput = document.getElementById("fileInput"), attachBtn = document.getElementById("attachBtn");
const attachmentPreview = document.getElementById("attachmentPreview"), attachmentName = document.getElementById("attachmentName");
const removeAttachmentBtn = document.getElementById("removeAttachmentBtn");
const attThumb = document.getElementById("attThumb"), attIcon = document.getElementById("attIcon"), attSpinner = document.getElementById("attSpinner");
let pendingAttachment = null;

attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  attachmentPreview.style.display = "flex";
  attSpinner.style.display = "inline-flex"; attIcon.style.display = "none"; attThumb.style.display = "none";
  attachmentName.textContent = `Reading ${file.name}…`;
  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = () => {
      attSpinner.style.display = "none";
      attThumb.src = reader.result; attThumb.style.display = "block";
      attachmentName.textContent = file.name;
      pendingAttachment = { name: file.name, content: reader.result, type: "image" };
    };
    reader.readAsDataURL(file);
  } else {
    if (file.size > 2 * 1024 * 1024) { addMessage("That file is over 2MB.", "ai"); clearAttachment(); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result);
      attSpinner.style.display = "none"; attIcon.style.display = "inline-flex";
      attachmentName.textContent = `${file.name} · ${(content.length / 1024).toFixed(1)} KB`;
      pendingAttachment = { name: file.name, content, type: "text" };
    };
    reader.readAsText(file);
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

// ============================================================
// AI — Pollinations (fast), Hugging Face, AIRoute
// ============================================================
const POLLINATIONS_CHAT = "https://text.pollinations.ai/openai";
const POLLINATIONS_IMG  = "https://image.pollinations.ai/prompt/";
const HF_ROUTER_URL     = "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL          = "Qwen/Qwen2.5-Coder-32B-Instruct:fastest";

let currentModel = "mirox-gen1";
document.querySelectorAll(".model-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".model-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentModel = chip.dataset.model;
  });
});

function buildSystemPrompt() {
  const p = getPersonal();
  const b = getBehavior();
  const friendStyles = {
    bestie:     "You're their best friend — warm, casual, hype them up.",
    supportive: "You're a caring, supportive friend — encouraging and kind.",
    casual:     "You're a chill friend — relaxed, laid back, no formality.",
    witty:      "You're a witty friend — clever humor, punchy, still helpful."
  };
  const friend = friendStyles[p.friendship] || friendStyles.bestie;
  const parts = [
    `You are MiroxAI, the user's personal AI friend. ${friend}`,
    "Be helpful. Use markdown. For code, always output the complete file. Use ```file:path.ext``` fences for project files."
  ];
  if (p.userName) parts.push(`The user's name is ${p.userName}.`);
  if (p.persona)  parts.push(`Extra: ${p.persona}`);
  if (b.replyStyle === "concise")  parts.push("Keep replies short.");
  if (b.replyStyle === "detailed") parts.push("Give thorough, detailed answers.");
  if (b.reasoning === "short") parts.push("Keep reasoning short.");
  if (b.reasoning === "deep")  parts.push("Think step by step.");
  return parts.join(" ");
}

async function callPollinations(messages, apiKey) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const modelId = currentModel === "mirox-ultra-v1" ? "openai" : "openai-fast";
  const res = await fetch(POLLINATIONS_CHAT, {
    method: "POST", headers,
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "system", content: buildSystemPrompt() }, ...messages],
      stream: true, private: true,
    })
  });
  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  return res;
}

async function callHF(messages, apiKey) {
  if (!apiKey) throw new Error("No HF token");
  const res = await fetch(HF_ROUTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [{ role: "system", content: buildSystemPrompt() }, ...messages],
      stream: true, max_tokens: 4096, temperature: 0.7,
    })
  });
  if (!res.ok) throw new Error(`HF ${res.status}`);
  return res;
}

async function* airouteStream(messages, apiKey, baseUrl) {
  const base = baseUrl.replace(/\/$/, "");
  const hs = await fetch(`${base}/api/public/v1/handshake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "connect", api_key: apiKey })
  });
  if (!hs.ok) throw new Error(`AIRoute handshake ${hs.status}`);
  const hd = await hs.json();
  const tok = hd.session_token || hd.token;
  if (!tok) throw new Error("No AIRoute session token");

  const prompt = flattenMessages([{ role: "system", content: buildSystemPrompt() }, ...messages]);
  const modelId = currentModel === "mirox-ultra-v1"
    ? "google/gemini-3.1-pro-preview"
    : "google/gemini-3.1-flash-lite";

  const res = await fetch(`${base}/api/public/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tok}` },
    body: JSON.stringify({ model: modelId, prompt, stream: true })
  });
  if (!res.ok) throw new Error(`AIRoute chat ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim(); buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const obj = JSON.parse(payload);
        const delta = obj.delta || obj.text || (obj.choices?.[0]?.delta?.content) || "";
        if (delta) yield `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;
      } catch {}
    }
  }
}

function flattenMessages(messages) {
  const out = [];
  for (const m of messages) {
    const c = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    if (m.role === "system") out.push(c);
    else if (m.role === "user") out.push(`User: ${c}`);
    else out.push(`Assistant: ${c}`);
  }
  out.push("Assistant:");
  return out.join("\n\n");
}

function wrapAsyncIterToResponse(asyncIter) {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of asyncIter) controller.enqueue(encoder.encode(chunk));
      } catch (e) { console.warn(e); }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    }
  }), { headers: { "Content-Type": "text/event-stream" } });
}

async function callChatAI(messages) {
  const keys = effectiveKeys();
  // 1. Pollinations first
  try { return await callPollinations(messages, keys.pollinations); }
  catch (e) { console.warn("[chat] Pollinations failed:", e.message); }
  // 2. AIRoute
  if (keys.airouteToken && keys.airouteBase) {
    try { return wrapAsyncIterToResponse(airouteStream(messages, keys.airouteToken, keys.airouteBase)); }
    catch (e) { console.warn("[chat] AIRoute failed:", e.message); }
  }
  // 3. Hugging Face
  if (keys.huggingface) {
    try { return await callHF(messages, keys.huggingface); }
    catch (e) { console.warn("[chat] HF failed:", e.message); }
  }
  throw new Error("All AI providers failed. Add an API key in Settings → Keys.");
}

// ============================================================
// VIDEO HELPERS
// ============================================================
function loadImage(src, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const img = new Image(); let settled = false;
    const t = setTimeout(() => { if (!settled) { settled = true; reject(new Error("timeout")); } }, timeoutMs);
    img.onload  = () => { if (settled) return; settled = true; clearTimeout(t); resolve(img); };
    img.onerror = () => { if (settled) return; settled = true; clearTimeout(t); reject(new Error("decode")); };
    img.crossOrigin = "anonymous"; img.src = src;
  });
}
function waitPaint() { return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res()))); }
async function buildVideoFromFrames(frames, fps, size, onProgress) {
  const imgs = [];
  for (let i = 0; i < frames.length; i++) {
    try { imgs.push(await loadImage(frames[i])); } catch {}
    if (onProgress) onProgress("load", i + 1, frames.length);
  }
  if (imgs.length < 2) throw new Error("Not enough frames");
  const canvas = document.createElement("canvas"); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size, size); ctx.drawImage(imgs[0], 0, 0, size, size);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9"
    : (MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm");
  const stream = canvas.captureStream(fps);
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
  const stopped = new Promise((res, rej) => { rec.onstop = () => res(); rec.onerror = e => rej(e); });
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  await waitPaint(); rec.start(200);
  const frameDelay = Math.max(120, Math.round(1000 / fps));
  for (let i = 0; i < imgs.length; i++) {
    ctx.drawImage(imgs[i], 0, 0, size, size);
    await waitPaint();
    await new Promise(r => setTimeout(r, frameDelay));
    if (onProgress) onProgress("render", i + 1, imgs.length);
  }
  await new Promise(r => setTimeout(r, 600));
  rec.stop(); await stopped;
  return new Blob(chunks, { type: mime });
}

// ============================================================
// IMAGE STUDIO
// ============================================================
const RATIO_SIZES  = { "1:1": [1024, 1024], "3:4": [896, 1152], "4:3": [1152, 896], "16:9": [1280, 720] };
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
  const img = new Image();
  img.onload  = () => { card.innerHTML = `<img src="${url}" alt="${escapeHtml(prompt)}">`; status.textContent = "Done ✅"; };
  img.onerror = () => { card.innerHTML = `<div class="gallery-error"><i class="ri-error-warning-line"></i><span>Failed</span></div>`; status.textContent = "Generation failed."; };
  img.src = url;
});

// ============================================================
// VIDEO STUDIO
// ============================================================
let selectedVStyle = "";
document.querySelectorAll("#vstyleChips .chip").forEach(c => c.addEventListener("click", () => {
  document.querySelectorAll("#vstyleChips .chip").forEach(x => x.classList.remove("active"));
  c.classList.add("active"); selectedVStyle = c.dataset.style || "";
}));
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
document.getElementById("generateVideoBtn").addEventListener("click", async () => {
  const prompt = document.getElementById("videoPromptInput").value.trim();
  const status = document.getElementById("videoStudioStatus"), btn = document.getElementById("generateVideoBtn");
  if (!prompt) { status.textContent = "Describe the video first."; return; }
  btn.disabled = true; status.textContent = "";
  videoResult.style.display = "none"; videoLoader.style.display = "flex";
  setVideoProgress(2, "Generating frames…", "0/8 ready");
  const N = 8, SIZE = 384;
  const base = selectedVStyle && STYLE_SUFFIX[selectedVStyle] ? `${prompt}, ${STYLE_SUFFIX[selectedVStyle]}` : prompt;
  const motions = ["wide establishing shot","slight zoom in","camera pans left","camera pans right","medium shot","close-up detail","camera pulls back","final wide shot"];
  const frames = new Array(N).fill(null); let done = 0;
  await Promise.all(motions.map((m, i) => new Promise(resolve => {
    const url = buildImageUrl(`${base}, ${m}, frame ${i + 1} of ${N}, cinematic`, "", "1:1", SIZE);
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { frames[i] = url; done++; setVideoProgress(5 + (done / N) * 40, "Generating frames…", `${done}/${N} ready`); resolve(); };
    img.onerror = () => { done++; resolve(); };
    img.src = url;
  })));
  const valid = frames.filter(Boolean);
  if (valid.length < 2) { videoLoader.style.display = "none"; status.textContent = "Video failed — try again."; btn.disabled = false; return; }
  setVideoProgress(50, "Assembling video…", `${valid.length} frames`);
  try {
    const blob = await buildVideoFromFrames(valid, 4, SIZE, (stage, n, t) => {
      if (stage === "load")   setVideoProgress(50 + (n / t) * 20, `Loading frame ${n}/${t}…`, "");
      if (stage === "render") setVideoProgress(70 + (n / t) * 30, `Rendering frame ${n}/${t}…`, "Encoding WebM");
    });
    setVideoProgress(100, "Done ✅", "");
    await new Promise(r => setTimeout(r, 400));
    const url = URL.createObjectURL(blob);
    videoPlayer.src = url; videoDownloadLink.href = url;
    videoLoader.style.display = "none"; videoResult.style.display = "flex";
    status.textContent = "5s silent video (sound will come soon).";
  } catch (e) { videoLoader.style.display = "none"; status.textContent = "Video failed: " + e.message; }
  finally { btn.disabled = false; }
});

// ============================================================
// BACKGROUND
// ============================================================
const bgUploadZone = document.getElementById("bgUploadZone");
const bgFileInput = document.getElementById("bgFileInput");
const bgDimInput = document.getElementById("bgDimInput"), bgBlurInput = document.getElementById("bgBlurInput");
const bgDimLabel = document.getElementById("bgDimLabel"), bgBlurLabel = document.getElementById("bgBlurLabel");

function populateBackgroundUI() {
  const bg = getBg();
  bgDimInput.value = bg.dim;
  bgBlurInput.value = bg.blur;
  bgDimLabel.textContent = bg.dim + "%";
  bgBlurLabel.textContent = bg.blur + "px";
  document.querySelectorAll("#bgFitOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.fit === bg.fit));
  const urlEl = document.getElementById("bgUrlInput");
  if (urlEl) urlEl.value = bg.url && !bg.url.startsWith("data:") ? bg.url : "";
}

document.getElementById("bgModeBtn").addEventListener("click", () => { openModal("backgroundModal"); populateBackgroundUI(); });

if (bgUploadZone && bgFileInput) {
  bgUploadZone.addEventListener("click", () => bgFileInput.click());
  bgUploadZone.addEventListener("dragover", e => { e.preventDefault(); bgUploadZone.classList.add("drag"); });
  bgUploadZone.addEventListener("dragleave", () => bgUploadZone.classList.remove("drag"));
  bgUploadZone.addEventListener("drop", e => { e.preventDefault(); bgUploadZone.classList.remove("drag"); if (e.dataTransfer.files.length) handleBgFile(e.dataTransfer.files[0]); });
  bgFileInput.addEventListener("change", () => { if (bgFileInput.files.length) handleBgFile(bgFileInput.files[0]); bgFileInput.value = ""; });
}

function fileToOptimizedDataURL(file, maxDim = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { reject(new Error("bad dims")); return; }
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

async function handleBgFile(file) {
  const status = document.getElementById("bgStatus");
  if (!file.type.startsWith("image/")) { status.textContent = "Please choose an image file."; return; }
  if (file.size > 20 * 1024 * 1024) { status.textContent = "Image is over 20MB."; return; }
  status.textContent = "Optimizing for iOS Safari…";
  try {
    const dataUrl = await fileToOptimizedDataURL(file, 1400, 0.82);
    const kb = Math.round((dataUrl.length * 0.75) / 1024);
    let finalUrl = dataUrl;
    if (kb > 800) { finalUrl = await fileToOptimizedDataURL(file, 1000, 0.72); }
    const bg = getBg(); bg.url = finalUrl; setBg(bg);
    applyBackground(); populateBackgroundUI();
    status.textContent = `Set as background ✅ (${Math.round((finalUrl.length * 0.75) / 1024)} KB)`;
  } catch { status.textContent = "Couldn't process image. Try another."; }
}

document.getElementById("bgUrlApplyBtn").addEventListener("click", () => {
  const u = document.getElementById("bgUrlInput").value.trim();
  if (!u) return;
  const bg = getBg(); bg.url = u; setBg(bg); applyBackground();
  document.getElementById("bgStatus").textContent = "URL applied ✅";
});
bgDimInput.addEventListener("input", e => {
  const bg = getBg(); bg.dim = parseInt(e.target.value); setBg(bg);
  bgDimLabel.textContent = bg.dim + "%"; applyBackground();
});
bgBlurInput.addEventListener("input", e => {
  const bg = getBg(); bg.blur = parseInt(e.target.value); setBg(bg);
  bgBlurLabel.textContent = bg.blur + "px"; applyBackground();
});
document.querySelectorAll("#bgFitOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const bg = getBg(); bg.fit = b.dataset.fit; setBg(bg);
  document.querySelectorAll("#bgFitOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
  applyBackground();
}));
document.getElementById("bgSaveBtn").addEventListener("click", () => {
  applyBackground();
  document.getElementById("bgStatus").textContent = "Saved ✅";
});
document.getElementById("bgRemoveBtn").addEventListener("click", () => {
  setBg({ url:null, dim:45, blur:0, fit:"cover" });
  applyBackground(); populateBackgroundUI();
  document.getElementById("bgUrlInput").value = "";
  document.getElementById("bgStatus").textContent = "Removed.";
});

// ============================================================
// EXTENSIONS
// ============================================================
const EXT_PRESETS = {
  font: { name: "Custom font", css: `html, body, .bubble, input, textarea, button, select { font-family: 'Comic Sans MS', 'Trebuchet MS', cursive !important; }` },
  rounded: { name: "Rounded corners", css: `.bubble, .composer, .modal, .rail-btn, .icon-btn, .send-btn, input, textarea, .save-btn, .option-btn, .chip, .model-chip { border-radius: 18px !important; }` },
  compact: { name: "Compact mode", css: `.chat { padding: 14px !important; gap: 12px !important; } .bubble { font-size: 13.5px !important; } .avatar { width: 26px !important; height: 26px !important; min-width: 26px !important; }` },
  accent: { name: "Custom accent", css: `:root { --accent: #ff0080 !important; --accent-hover: #cc0066 !important; --accent-soft: rgba(255,0,128,.12) !important; --accent-ring: rgba(255,0,128,.3) !important; --accent-glow: rgba(255,0,128,.4) !important; }` }
};

document.getElementById("extModeBtn").addEventListener("click", () => { openModal("extensionsModal"); renderExtensions(); });

function renderExtensions() {
  const list = document.getElementById("extList"); if (!list) return; list.innerHTML = "";
  const exts = getExts();
  if (!exts.length) { const e = document.createElement("li"); e.className = "ext-empty"; e.textContent = "No extensions yet."; list.appendChild(e); return; }
  exts.forEach(ext => {
    const li = document.createElement("li");
    li.className = "ext-item";
    li.innerHTML = `<label class="ext-toggle"><input type="checkbox" ${ext.enabled ? "checked" : ""}><span class="ext-slider"></span></label><div class="ext-info"><div class="ext-name">${escapeHtml(ext.name)}</div><div class="ext-preview">${escapeHtml((ext.css || "").slice(0, 90).replace(/\n/g, " "))}${(ext.css || "").length > 90 ? "…" : ""}</div></div><button class="ext-action" data-edit><i class="ri-pencil-line"></i></button><button class="ext-action" data-delete><i class="ri-delete-bin-line"></i></button>`;
    li.querySelector("input").addEventListener("change", e => { ext.enabled = e.target.checked; setExts(exts); applyExtensions(); });
    li.querySelector("[data-edit]").addEventListener("click", () => {
      document.getElementById("extNameInput").value = ext.name;
      document.getElementById("extCssInput").value = ext.css;
      document.getElementById("extSaveBtn").dataset.editingId = ext.id;
      document.getElementById("extStatus").textContent = "Editing: " + ext.name;
    });
    li.querySelector("[data-delete]").addEventListener("click", () => {
      if (!confirm("Delete " + ext.name + "?")) return;
      setExts(getExts().filter(e => e.id !== ext.id));
      applyExtensions(); renderExtensions();
    });
    list.appendChild(li);
  });
}
document.querySelectorAll(".ext-preset[data-preset]").forEach(btn => btn.addEventListener("click", () => {
  const p = EXT_PRESETS[btn.dataset.preset]; if (!p) return;
  document.getElementById("extNameInput").value = p.name;
  document.getElementById("extCssInput").value = p.css;
  document.getElementById("extStatus").textContent = "Preset loaded.";
}));
document.getElementById("extSaveBtn").addEventListener("click", () => {
  const name = document.getElementById("extNameInput").value.trim();
  const css = document.getElementById("extCssInput").value;
  const status = document.getElementById("extStatus");
  const btn = document.getElementById("extSaveBtn");
  const editingId = btn.dataset.editingId;
  if (!name) { status.textContent = "Name required."; return; }
  if (!css.trim()) { status.textContent = "CSS required."; return; }
  const exts = getExts();
  if (editingId) {
    const ext = exts.find(e => e.id === editingId); if (ext) { ext.name = name; ext.css = css; }
    delete btn.dataset.editingId; status.textContent = "Updated ✅";
  } else {
    exts.push({ id: "ext_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, css, enabled: true });
    status.textContent = "Saved ✅";
  }
  setExts(exts); applyExtensions(); renderExtensions();
  document.getElementById("extNameInput").value = "";
  document.getElementById("extCssInput").value = "";
});
document.getElementById("extClearBtn").addEventListener("click", () => {
  document.getElementById("extNameInput").value = "";
  document.getElementById("extCssInput").value = "";
  document.getElementById("extStatus").textContent = "";
  delete document.getElementById("extSaveBtn").dataset.editingId;
});

// ============================================================
// VOICE (TTS + mic test)
// ============================================================
const synth = window.speechSynthesis;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function getVoicePrefs() { return readJSON(STORE.voice, { voiceName:"", rate:1 }); }
function setVoicePrefs(p) { writeJSON(STORE.voice, p); }

function initVoice() {
  const supportEl = document.getElementById("speechSupport");
  if (supportEl) supportEl.textContent = SpeechRecognition ? "Supported ✅" : "Not supported in this browser.";
  populateVoiceList();
  if (synth) synth.addEventListener("voiceschanged", populateVoiceList);
  const rate = getVoicePrefs().rate || 1;
  document.getElementById("voiceRateInput").value = rate;
  document.getElementById("voiceRateLabel").textContent = rate.toFixed(1) + "×";
}
function populateVoiceList() {
  const sel = document.getElementById("voiceSelect"); if (!sel || !synth) return;
  const voices = synth.getVoices(); if (!voices.length) return;
  const prefs = getVoicePrefs();
  sel.innerHTML = "";
  voices.forEach((v, i) => {
    const opt = document.createElement("option"); opt.value = v.name; opt.textContent = `${v.name} (${v.lang})`;
    if (v.name === prefs.voiceName || (!prefs.voiceName && i === 0)) opt.selected = true;
    sel.appendChild(opt);
  });
}
document.getElementById("voiceSelect")?.addEventListener("change", e => {
  const p = getVoicePrefs(); p.voiceName = e.target.value; setVoicePrefs(p);
});
document.getElementById("voiceRateInput")?.addEventListener("input", e => {
  const p = getVoicePrefs(); p.rate = parseFloat(e.target.value); setVoicePrefs(p);
  document.getElementById("voiceRateLabel").textContent = p.rate.toFixed(1) + "×";
});
document.getElementById("testVoiceBtn")?.addEventListener("click", () => speak("Hi, I'm MiroxAI, your personal AI friend."));
document.getElementById("requestMicBtn")?.addEventListener("click", async () => {
  const status = document.getElementById("micStatus");
  status.textContent = "Requesting…";
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    setTimeout(() => s.getTracks().forEach(t => t.stop()), 300);
    status.textContent = "Microphone granted ✅";
  } catch (e) { status.textContent = "Denied: " + (e.name || e.message); }
});

function speak(text, onEnd) {
  if (!synth) { onEnd && onEnd(); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const p = getVoicePrefs();
  const v = synth.getVoices().find(x => x.name === p.voiceName);
  if (v) u.voice = v;
  u.rate = p.rate || 1;
  u.onend = () => onEnd && onEnd();
  u.onerror = () => onEnd && onEnd();
  synth.speak(u);
}

// Mic input for the composer
let recognition = null, recognizing = false;
const micBtn = document.getElementById("micBtn");
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false; recognition.interimResults = true; recognition.lang = "en-US";
  recognition.onresult = e => {
    let t = "";
    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    document.getElementById("messageInput").value = t;
  };
  recognition.onend = () => { recognizing = false; micBtn.classList.remove("active", "recording"); };
  recognition.onerror = () => { recognizing = false; micBtn.classList.remove("active", "recording"); };
}
micBtn.addEventListener("click", () => {
  if (!recognition) { addMessage("Voice input isn't supported in this browser.", "ai"); return; }
  if (recognizing) { recognition.stop(); return; }
  recognizing = true;
  micBtn.classList.add("active", "recording");
  try { recognition.start(); } catch { recognizing = false; micBtn.classList.remove("active", "recording"); }
});

// ============================================================
// CALL OVERLAY
// ============================================================
const callOverlay = document.getElementById("callOverlay");
const callStatus = document.getElementById("callStatus");
const callOrb = document.getElementById("callOrb");
const callTranscript = document.getElementById("callTranscript");
const callTextForm = document.getElementById("callTextForm");
const callTextInput = document.getElementById("callTextInput");
const callMuteBtn = document.getElementById("callMuteBtn");
const callEndBtn = document.getElementById("callEndBtn");

let callActive = false, callMuted = false, callRecognition = null, callErrors = 0;

function setCallState(state, text) {
  callOrb.classList.remove("listening", "speaking");
  if (state) callOrb.classList.add(state);
  callStatus.textContent = text;
}

document.getElementById("callModeBtn").addEventListener("click", () => startCall());
callEndBtn.addEventListener("click", endCall);
callMuteBtn.addEventListener("click", () => {
  callMuted = !callMuted;
  callMuteBtn.classList.toggle("muted", callMuted);
  if (callMuted) {
    if (callRecognition) { callRecognition.onend = null; try { callRecognition.stop(); } catch {} }
    setCallState(null, "Muted");
  } else startCallListening();
});

async function startCall() {
  if (!__user) { openModal("loginModal"); return; }
  callActive = true; callMuted = false; callErrors = 0;
  callOverlay.classList.add("open");
  callMuteBtn.classList.remove("muted");
  callTextForm.style.display = "none";
  setCallState(null, "Requesting microphone…");

  if (!SpeechRecognition) {
    callTextForm.style.display = "flex"; callMuteBtn.style.display = "none";
    setCallState(null, "Voice not supported — type below");
    setTimeout(() => callTextInput.focus(), 300);
    return;
  }
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    setTimeout(() => s.getTracks().forEach(t => t.stop()), 300);
  } catch {
    callTextForm.style.display = "flex"; callMuteBtn.style.display = "none";
    setCallState(null, "Mic unavailable — type below");
    setTimeout(() => callTextInput.focus(), 300);
    return;
  }
  callMuteBtn.style.display = "flex";
  setCallState(null, "Connecting…");
  setTimeout(startCallListening, 400);
}

function endCall() {
  callActive = false;
  if (callRecognition) { callRecognition.onend = null; try { callRecognition.stop(); } catch {} }
  if (synth) synth.cancel();
  callOverlay.classList.remove("open");
  callTranscript.textContent = "";
}

function startCallListening() {
  if (!callActive || callMuted) return;
  callErrors = 0;
  setCallState("listening", "Listening…");
  callTranscript.textContent = "";
  callRecognition = new SpeechRecognition();
  callRecognition.continuous = false; callRecognition.interimResults = true; callRecognition.lang = "en-US";
  callRecognition.onresult = e => {
    let t = "";
    for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    callTranscript.textContent = t;
  };
  callRecognition.onerror = () => {
    if (!callActive) return;
    callErrors++;
    if (callErrors >= 3) {
      setCallState(null, "Mic issues — type below");
      callTextForm.style.display = "flex";
      callMuteBtn.style.display = "none";
      setTimeout(() => callTextInput.focus(), 300);
      return;
    }
    setTimeout(startCallListening, 600);
  };
  callRecognition.onend = () => {
    if (!callActive) return;
    const s = callTranscript.textContent.trim();
    if (!s) { startCallListening(); return; }
    sendCallMessage(s);
  };
  try { callRecognition.start(); } catch {}
}

async function sendCallMessage(said) {
  setCallState(null, "Thinking…");
  try {
    const c = { id: crypto.randomUUID(), title: "Voice call", updated: Date.now(), messages: [] };
    const chats = getChats();
    const messages = [{ role: "user", content: said }];
    const res = await callChatAI(messages);
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    let buffer = "", fullText = "";
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
          if (delta) { fullText += delta; callTranscript.textContent = fullText; }
        } catch {}
      }
    }
    if (!callActive) return;
    setCallState("speaking", "Speaking…");
    speak(fullText, () => {
      if (!callActive) return;
      if (SpeechRecognition && !callMuted) startCallListening();
      else setCallState(null, "Tap to reply");
    });
  } catch (e) {
    setCallState(null, "Error");
    callTranscript.textContent = e.message;
  }
}

callTextForm.addEventListener("submit", e => {
  e.preventDefault();
  const s = callTextInput.value.trim(); if (!s) return;
  callTextInput.value = "";
  callTranscript.textContent = s;
  sendCallMessage(s);
});

// ============================================================
// SETTINGS
// ============================================================
function openSettings(tab) {
  openModal("settingsModal");
  hydrateSettings();
  if (tab) switchSettingsTab(tab);
}
function switchSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  document.querySelectorAll(".settings-pane").forEach(p => p.classList.toggle("active", p.dataset.pane === tab));
  if (tab === "admin") refreshAdminSection();
}
document.querySelectorAll(".settings-tab").forEach(t => t.addEventListener("click", () => switchSettingsTab(t.dataset.tab)));

function hydrateSettings() {
  const a = getAppearance(), p = getPersonal(), b = getBehavior(), k = getKeys(), ak = getAdminKeys();
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
  document.querySelectorAll("#reasoningOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.reasoning === b.reasoning));
  document.getElementById("keyPollinations").value = k.pollinations || "";
  document.getElementById("keyHuggingface").value = k.huggingface || "";
  document.getElementById("keyAirouteToken").value = k.airouteToken || "";
  document.getElementById("keyAirouteBase").value = k.airouteBase || "";
  document.getElementById("adminKeyPollinations").value = ak.pollinations || "";
  document.getElementById("adminKeyHuggingface").value = ak.huggingface || "";
  document.getElementById("adminKeyAirouteToken").value = ak.airouteToken || "";
  document.getElementById("adminKeyAirouteBase").value = ak.airouteBase || "";
  const bc = readJSON(STORE.broadcast, null) || { message:"", type:"info" };
  document.getElementById("adminBroadcast").value = bc.message || "";
  document.querySelectorAll("#broadcastTypeOptions .option-btn").forEach(x => x.classList.toggle("active", x.dataset.btype === (bc.type || "info")));
}

// Appearance clicks
document.querySelectorAll("#modeOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const a = getAppearance(); a.mode = b.dataset.mode; setAppearance(a); applyAppearance();
  document.querySelectorAll("#modeOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
}));
document.querySelectorAll("#accentSwatches .swatch").forEach(s => s.addEventListener("click", () => {
  const a = getAppearance(); a.accent = s.dataset.accent; setAppearance(a); applyAppearance();
  document.querySelectorAll("#accentSwatches .swatch").forEach(x => x.classList.toggle("active", x === s));
}));
document.querySelectorAll("#cornersOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const a = getAppearance(); a.corners = b.dataset.corners; setAppearance(a); applyAppearance();
  document.querySelectorAll("#cornersOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
}));
document.querySelectorAll("#fontOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const a = getAppearance(); a.font = b.dataset.font; setAppearance(a); applyAppearance();
  document.querySelectorAll("#fontOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
}));
document.querySelectorAll("#densityOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const a = getAppearance(); a.density = b.dataset.density; setAppearance(a); applyAppearance();
  document.querySelectorAll("#densityOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
}));

// Personal
let personalTimer = null;
function savePersonalDebounced() {
  clearTimeout(personalTimer);
  personalTimer = setTimeout(() => {
    const p = getPersonal();
    p.userName = document.getElementById("setUserName").value.trim();
    p.persona  = document.getElementById("setPersona").value.trim();
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

// Behavior
document.getElementById("setConfirmDelete").addEventListener("change", e => {
  const b = getBehavior(); b.confirmDelete = e.target.checked; setBehavior(b);
});
document.querySelectorAll("#replyStyleOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const cur = getBehavior(); cur.replyStyle = b.dataset.style; setBehavior(cur);
  document.querySelectorAll("#replyStyleOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
}));
document.querySelectorAll("#reasoningOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  const cur = getBehavior(); cur.reasoning = b.dataset.reasoning; setBehavior(cur);
  document.querySelectorAll("#reasoningOptions .option-btn").forEach(x => x.classList.toggle("active", x === b));
}));

// Keys
document.getElementById("saveKeysBtn").addEventListener("click", () => {
  setKeys({
    pollinations: document.getElementById("keyPollinations").value.trim(),
    huggingface:  document.getElementById("keyHuggingface").value.trim(),
    airouteToken: document.getElementById("keyAirouteToken").value.trim(),
    airouteBase:  document.getElementById("keyAirouteBase").value.trim()
  });
  const s = document.getElementById("keysSaveStatus");
  s.style.color = "#16a34a"; s.textContent = "Saved ✅";
  setTimeout(() => s.textContent = "", 2000);
});

// Admin
function refreshAdminSection() {
  const unlocked = sessionStorage.getItem("miroxai_admin_unlocked") === "1";
  document.getElementById("adminLockedSection").style.display = unlocked ? "none" : "block";
  document.getElementById("adminUnlockedSection").style.display = unlocked ? "block" : "none";
}
document.getElementById("adminUnlockBtn").addEventListener("click", () => {
  const val = document.getElementById("adminPasswordInput").value.trim();
  const status = document.getElementById("adminUnlockStatus");
  if (val !== ADMIN_PASSWORD) { status.style.color = "#dc2626"; status.textContent = "Wrong password."; return; }
  sessionStorage.setItem("miroxai_admin_unlocked", "1");
  status.textContent = "";
  refreshAdminSection();
});
document.getElementById("adminLockBtn").addEventListener("click", () => {
  sessionStorage.removeItem("miroxai_admin_unlocked");
  refreshAdminSection();
});
document.getElementById("saveAdminKeysBtn").addEventListener("click", () => {
  setAdminKeys({
    pollinations: document.getElementById("adminKeyPollinations").value.trim(),
    huggingface:  document.getElementById("adminKeyHuggingface").value.trim(),
    airouteToken: document.getElementById("adminKeyAirouteToken").value.trim(),
    airouteBase:  document.getElementById("adminKeyAirouteBase").value.trim()
  });
  const s = document.getElementById("adminKeysSaveStatus");
  s.style.color = "#16a34a"; s.textContent = "Saved ✅ — overrides user keys";
  setTimeout(() => s.textContent = "", 2500);
});
let broadcastType = "info";
document.querySelectorAll("#broadcastTypeOptions .option-btn").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#broadcastTypeOptions .option-btn").forEach(x => x.classList.remove("active"));
  b.classList.add("active"); broadcastType = b.dataset.btype;
}));
document.getElementById("saveBroadcastBtn").addEventListener("click", () => {
  const msg = document.getElementById("adminBroadcast").value.trim();
  writeJSON(STORE.broadcast, { message:msg, type:broadcastType, ts:Date.now() });
  applyBroadcast();
  const s = document.getElementById("broadcastStatus");
  s.style.color = "#16a34a"; s.textContent = msg ? "Published ✅" : "Cleared.";
  setTimeout(() => s.textContent = "", 2000);
});

// Rail buttons
document.getElementById("imageModeBtn").addEventListener("click", () => openModal("imageModal"));
document.getElementById("videoModeBtn").addEventListener("click", () => openModal("videoModal"));
document.getElementById("plansModeBtn").addEventListener("click", () => { openModal("plansModal"); renderPlans(); renderMyOrders(); });
document.getElementById("settingsBtn").addEventListener("click", () => openSettings());
document.getElementById("adminRailBtn").addEventListener("click", () => {
  if (sessionStorage.getItem("miroxai_admin_unlocked") === "1") { openModal("adminPanelModal"); renderAdminPanel(); }
  else openSettings("admin");
});

// ============================================================
// PLANS + BUY + ADMIN PANEL
// ============================================================
function renderPlans() {
  const grid = document.getElementById("plansGrid");
  const currentTier = getTier();
  grid.innerHTML = Object.values(PLANS).map(p => {
    const isCurrent = currentTier === p.id, featured = p.id === "pro";
    const priceHtml = p.price > 0 ? `R$ ${p.price}` : `<span style="color:var(--text-muted);font-weight:700">Free</span>`;
    let btn;
    if (p.id === "free") btn = `<div class="plan-buy disabled">Free forever</div>`;
    else if (isCurrent)   btn = `<div class="plan-buy disabled">Current plan</div>`;
    else                  btn = `<button class="plan-buy" data-buy="${p.id}">Buy for R$ ${p.price}</button>`;
    return `<div class="plan-card${featured ? " featured" : ""}${isCurrent ? " current" : ""}">
      ${isCurrent ? '<span class="plan-badge current">Current</span>' : (featured ? '<span class="plan-badge">Popular</span>' : "")}
      <div class="plan-name">${p.label}</div>
      <div class="plan-tagline">${p.tagline}</div>
      <div class="plan-price">${priceHtml}</div>
      <ul class="plan-perks">${p.perks.map(x => `<li><i class="ri-check-line"></i><span>${x}</span></li>`).join("")}</ul>
      ${btn}
    </div>`;
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
  const status = document.getElementById("proofStatus");
  if (!file.type.startsWith("image/")) { status.textContent = "Please choose an image."; return; }
  if (file.size > 20 * 1024 * 1024) { status.textContent = "Image is over 20MB."; return; }
  status.textContent = "Compressing…";
  try {
    const dataUrl = await fileToOptimizedDataURL(file, 900, 0.75);
    const kb = Math.round((dataUrl.length * 0.75) / 1024);
    pendingProof = dataUrl;
    document.getElementById("proofPreview").src = dataUrl;
    document.getElementById("proofPreviewWrap").style.display = "block";
    document.getElementById("proofPreviewSize").textContent = `${file.name} · ${kb} KB`;
    document.getElementById("proofStatus").textContent = "Screenshot ready. Submit for verification.";
    document.getElementById("submitProofBtn").disabled = false;
  } catch { status.textContent = "Couldn't process image."; }
}
document.getElementById("proofRemoveBtn").addEventListener("click", () => {
  pendingProof = null; document.getElementById("proofPreviewWrap").style.display = "none";
  document.getElementById("submitProofBtn").disabled = true;
  document.getElementById("proofStatus").textContent = "";
});
document.getElementById("submitProofBtn").addEventListener("click", () => {
  if (!pendingProof || !buyingPlan) return;
  const orders = getOrders();
  orders.unshift({
    id: crypto.randomUUID(),
    planId: buyingPlan.id, planLabel: buyingPlan.label, price: buyingPlan.price,
    proof: pendingProof, user: __user?.name || "anonymous",
    submittedAt: Date.now(), status: "pending", adminNote: ""
  });
  try { setOrders(orders); } catch { document.getElementById("proofStatus").textContent = "Storage full."; return; }
  pendingProof = null; buyingPlan = null;
  closeModal("buyModal"); openModal("plansModal");
  renderPlans(); renderMyOrders();
});

function renderMyOrders() {
  const wrap = document.getElementById("myOrders"); if (!wrap) return;
  const orders = getOrders();
  if (!orders.length) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = `<h4>Your orders (${orders.length})</h4>` + orders.map(o => `
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

let adminFilter = "pending";
document.querySelectorAll(".admin-filters .chip").forEach(c => c.addEventListener("click", () => {
  document.querySelectorAll(".admin-filters .chip").forEach(x => x.classList.remove("active"));
  c.classList.add("active"); adminFilter = c.dataset.filter; renderAdminPanel();
}));
function renderAdminPanel() {
  if (sessionStorage.getItem("miroxai_admin_unlocked") !== "1") { openSettings("admin"); return; }
  const orders = getOrders();
  const pending  = orders.filter(o => o.status === "pending").length;
  const approved = orders.filter(o => o.status === "approved").length;
  const rejected = orders.filter(o => o.status === "rejected").length;
  document.getElementById("adminStats").innerHTML = `
    <div class="admin-stat"><div class="l">Pending</div><div class="v">${pending}</div></div>
    <div class="admin-stat"><div class="l">Approved</div><div class="v">${approved}</div></div>
    <div class="admin-stat"><div class="l">Rejected</div><div class="v">${rejected}</div></div>
    <div class="admin-stat"><div class="l">Total</div><div class="v">${orders.length}</div></div>`;
  const list = adminFilter === "all" ? orders : orders.filter(o => o.status === adminFilter);
  const box = document.getElementById("adminList");
  if (!list.length) { box.innerHTML = `<div class="empty-state">No ${adminFilter} orders.</div>`; return; }
  box.innerHTML = list.map(o => `
    <div class="admin-item">
      <img class="thumb" src="${o.proof}" data-zoom="${o.id}" alt="">
      <div class="meta">
        <h5>${escapeHtml(o.planLabel)} · R$ ${o.price}</h5>
        <p>User: <b>${escapeHtml(o.user)}</b></p>
        <p>Submitted: ${new Date(o.submittedAt).toLocaleString()}</p>
        <p>Status: <b>${o.status}</b>${o.adminNote ? ` · ${escapeHtml(o.adminNote)}` : ""}</p>
        <div class="admin-actions">
          ${o.status !== "approved" ? `<button class="save-btn" data-approve="${o.id}"><i class="ri-check-line"></i> Approve</button>` : ""}
          ${o.status !== "rejected" ? `<button class="save-btn outline" data-reject="${o.id}"><i class="ri-close-line"></i> Reject</button>` : ""}
          <button class="save-btn outline" data-delete="${o.id}"><i class="ri-delete-bin-line"></i> Delete</button>
        </div>
      </div>
    </div>`).join("");
  box.querySelectorAll("[data-approve]").forEach(b => b.addEventListener("click", () => {
    const orders = getOrders();
    const o = orders.find(x => x.id === b.dataset.approve); if (!o) return;
    o.status = "approved"; o.adminNote = "Payment verified ✅";
    setOrders(orders); setTier(o.planId); loadTierUI();
    renderAdminPanel(); renderMyOrders();
  }));
  box.querySelectorAll("[data-reject]").forEach(b => b.addEventListener("click", () => {
    const note = prompt("Reason for rejection:", "Screenshot unreadable"); if (note === null) return;
    const orders = getOrders();
    const o = orders.find(x => x.id === b.dataset.reject); if (!o) return;
    o.status = "rejected"; o.adminNote = note || "Rejected";
    setOrders(orders); renderAdminPanel(); renderMyOrders();
  }));
  box.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => {
    if (!confirm("Delete this order?")) return;
    setOrders(getOrders().filter(x => x.id !== b.dataset.delete));
    renderAdminPanel(); renderMyOrders();
  }));
  box.querySelectorAll("[data-zoom]").forEach(img => img.addEventListener("click", () => {
    const o = getOrders().find(x => x.id === img.dataset.zoom); if (!o) return;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Screenshot</title><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style></head><body><img src="${o.proof}"></body></html>`);
    w.document.close();
  }));
}

// ============================================================
// CHAT SEND
// ============================================================
let isReplying = false;
async function sendMessage(userText) {
  if (isReplying) return;
  isReplying = true;
  document.getElementById("sendBtn").disabled = true;

  const imgMatch = userText.match(/^\/image\s+(.+)/i);
  if (imgMatch) { isReplying = false; document.getElementById("sendBtn").disabled = false; openModal("imageModal"); document.getElementById("imagePromptInput").value = imgMatch[1].trim(); return; }
  const vidMatch = userText.match(/^\/video\s+(.+)/i);
  if (vidMatch) { isReplying = false; document.getElementById("sendBtn").disabled = false; openModal("videoModal"); document.getElementById("videoPromptInput").value = vidMatch[1].trim(); return; }
  if (/^\/plans?\b/i.test(userText)) { isReplying = false; document.getElementById("sendBtn").disabled = false; openModal("plansModal"); renderPlans(); renderMyOrders(); return; }
  if (/^\/settings?\b/i.test(userText)) { isReplying = false; document.getElementById("sendBtn").disabled = false; openSettings(); return; }

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
