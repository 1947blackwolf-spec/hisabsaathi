const STORE_KEY = "hisab_app_transactions_v1";
let selectedType = "expense";
let transactions = loadTransactions();

const $ = (id) => document.getElementById(id);
const money = (n) => "৳ " + Number(n || 0).toLocaleString("bn-BD", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const today = new Date();
$("date").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

function loadTransactions() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch { return []; }
}
function saveTransactions() {
  localStorage.setItem(STORE_KEY, JSON.stringify(transactions));
  render();
}
function showToast(message) {
  const toast = $("toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function render() {
  const income = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense = transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  $("balance").textContent = money(income-expense);
  $("income").textContent = money(income);
  $("expense").textContent = money(expense);
  const term = $("search").value.trim().toLowerCase();
  const filter = $("filter").value;
  const rows = transactions.filter(t => (filter==="all" || t.type===filter) && `${t.title} ${t.category} ${t.note}`.toLowerCase().includes(term))
    .sort((a,b)=>b.createdAt-a.createdAt);
  const list = $("transactions");
  if (!rows.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">৳</div><strong>${transactions.length ? "কোনো মিল পাওয়া যায়নি" : "এখনও কোনো হিসাব নেই"}</strong><p>${transactions.length ? "অন্য শব্দ দিয়ে খুঁজে দেখুন।" : "প্রথম আয় বা খরচটি যোগ করুন।"}</p></div>`;
    return;
  }
  list.innerHTML = rows.map(t => `<div class="transaction">
    <div class="tx-icon ${t.type}">${t.type==="income"?"↙":"↗"}</div>
    <div class="tx-info"><div class="tx-title">${escapeHtml(t.title)}</div><div class="tx-meta">${escapeHtml(t.category)} · ${escapeHtml(t.date)}${t.note ? " · "+escapeHtml(t.note) : ""}</div></div>
    <div class="tx-amount ${t.type}">${t.type==="income"?"+":"−"}${money(t.amount)}</div>
    <button class="tx-delete" data-delete="${t.id}" aria-label="হিসাব মুছুন" title="হিসাব মুছুন">×</button>
  </div>`).join("");
}
document.querySelectorAll(".type-btn").forEach(btn => btn.addEventListener("click", () => {
  selectedType = btn.dataset.type;
  document.querySelectorAll(".type-btn").forEach(b=>b.classList.toggle("active",b===btn));
}));
$("transactionForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("title").value.trim();
  const amount = Number($("amount").value);
  if (!title || !Number.isFinite(amount) || amount <= 0) { showToast("সঠিক নাম ও পরিমাণ লিখুন।"); return; }
  transactions.push({id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random()), type:selectedType, title, amount, date:$("date").value, category:$("category").value, note:$("note").value.trim(), createdAt:Date.now()});
  saveTransactions(); e.target.reset(); $("date").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  showToast("আপনার হিসাব এই ডিভাইসে সংরক্ষণ হয়েছে।");
});
$("transactions").addEventListener("click", e => {
  const btn = e.target.closest("[data-delete]"); if (!btn) return;
  if (confirm("এই হিসাবটি মুছে ফেলতে চান?")) { transactions = transactions.filter(t=>t.id!==btn.dataset.delete); saveTransactions(); showToast("হিসাব মুছে ফেলা হয়েছে।"); }
});
$("search").addEventListener("input",render);
$("filter").addEventListener("change",render);
function exportData() {
  const blob = new Blob([JSON.stringify({app:"Hisab",version:1,exportedAt:new Date().toISOString(),transactions},null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="hisab-backup.json"; a.click(); URL.revokeObjectURL(url);
  showToast("ব্যাকআপ ফাইল ডাউনলোড শুরু হয়েছে।");
}
$("exportBtn").addEventListener("click",exportData);
$("backupBtn").addEventListener("click",exportData);
$("clearBtn").addEventListener("click",()=>{if(confirm("সতর্কতা: এই ডিভাইসে থাকা সব হিসাব স্থায়ীভাবে মুছে যাবে। আগে ব্যাকআপ নিয়েছেন?")){transactions=[];saveTransactions();showToast("এই ডিভাইসের হিসাব মুছে ফেলা হয়েছে।");}});
$("addTop").addEventListener("click",()=>{$("title").focus();window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});});
function updateConnection(){const el=$("connection");el.innerHTML=navigator.onLine?"<i></i> ইন্টারনেট সংযুক্ত":"<i></i> অফলাইন মোড";el.style.color=navigator.onLine?"#166534":"#92400e";el.style.background=navigator.onLine?"#f0fdf4":"#fffbeb";}
window.addEventListener("online",updateConnection);window.addEventListener("offline",updateConnection);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
updateConnection();render();