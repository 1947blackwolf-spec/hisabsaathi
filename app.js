import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

// Firebase web config for the HisabSaathi project.
const firebaseConfig = {
  apiKey: 'AIzaSyCaEIB3FzseReHmLxVQ0XujvLVLFyUcT3A',
  authDomain: 'hisabsaathi-f2ab4.firebaseapp.com',
  projectId: 'hisabsaathi-f2ab4',
  storageBucket: 'hisabsaathi-f2ab4.firebasestorage.app',
  messagingSenderId: '1011035740638',
  appId: '1:1011035740638:web:3f346f99f215b627cce54f',
  measurementId: 'G-0JT3PYS2KD'
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, {localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})});
} catch (e) {
  // If persistent cache cannot be initialized, the app can still use Firestore online.
  console.warn('Offline cache could not be enabled:', e);
  db = getFirestore(app);
}
const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('bn-BD', {style:'currency', currency:'BDT', maximumFractionDigits:2}).format(Number(n)||0);
const today = new Date(); $('date').value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
let currentUser = null, records = [], selectedType = 'expense', stopListening = null, toastTimer;
function toast(message) { const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3200); }
function setAuthMessage(message, error=false) { $('authMessage').textContent=message; $('authMessage').classList.toggle('error-text',error); }
function friendlyError(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use':'এই ইমেইলে অ্যাকাউন্ট আছে। লগইন করুন।',
    'auth/invalid-email':'সঠিক ইমেইল লিখুন।',
    'auth/weak-password':'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন।',
    'auth/invalid-credential':'ইমেইল বা পাসওয়ার্ড সঠিক নয়।',
    'auth/user-not-found':'এই ইমেইলে অ্যাকাউন্ট পাওয়া যায়নি।',
    'auth/wrong-password':'পাসওয়ার্ড সঠিক নয়।',
    'auth/network-request-failed':'ইন্টারনেট সংযোগ পরীক্ষা করুন।',
    'permission-denied':'Firestore Rules প্রকাশ করা হয়েছে কি না পরীক্ষা করুন।'
  };
  return messages[code] || error?.message || 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।';
}
function updateConnection() {
  const online = navigator.onLine;
  $('connection').innerHTML = `<i></i> ${online ? 'ইন্টারনেট সংযুক্ত' : 'অফলাইন — সিঙ্ক অপেক্ষমাণ'}`;
  $('connection').classList.toggle('offline', !online);
}
window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection); updateConnection();
function transactionsRef() { return collection(db, 'users', currentUser.uid, 'transactions'); }
function render() {
  const income = records.filter(r=>r.type==='income').reduce((s,r)=>s+Number(r.amount||0),0);
  const expense = records.filter(r=>r.type==='expense').reduce((s,r)=>s+Number(r.amount||0),0);
  $('balance').textContent=money(income-expense); $('income').textContent=money(income); $('expense').textContent=money(expense);
  const search=$('search').value.trim().toLocaleLowerCase('bn-BD'), filter=$('filter').value;
  const filtered=records.filter(r=>(filter==='all'||r.type===filter)&&`${r.title} ${r.category} ${r.note||''}`.toLocaleLowerCase('bn-BD').includes(search));
  const host=$('transactions'); host.replaceChildren();
  if (!currentUser) { host.innerHTML='<div class="empty"><div class="empty-icon">৳</div><strong>লগইন করার পর হিসাব দেখা যাবে</strong><p>আপনার ব্যক্তিগত হিসাব শুধু আপনার অ্যাকাউন্টে থাকবে।</p></div>'; return; }
  if (!filtered.length) { host.innerHTML='<div class="empty"><div class="empty-icon">৳</div><strong>এখনও কোনো হিসাব নেই</strong><p>প্রথম আয় বা খরচটি যোগ করুন।</p></div>'; return; }
  filtered.forEach(r=>{
    const item=document.createElement('div'); item.className='transaction-item';
    const icon=document.createElement('div'); icon.className=`transaction-icon ${r.type==='income'?'income-icon':'expense-icon'}`; icon.textContent=r.type==='income'?'↙':'↗';
    const info=document.createElement('div'); info.className='transaction-info';
    const title=document.createElement('strong'); title.textContent=r.title;
    const meta=document.createElement('span'); meta.textContent=`${r.category||'অন্যান্য'} · ${r.date||''}${r.note?' · '+r.note:''}`;
    info.append(title,meta);
    const amount=document.createElement('strong'); amount.className=`transaction-amount ${r.type==='income'?'positive':'negative'}`; amount.textContent=`${r.type==='income'?'+':'−'} ${money(r.amount)}`;
    const del=document.createElement('button'); del.className='delete-btn'; del.type='button'; del.textContent='×'; del.title='এই হিসাব মুছুন'; del.setAttribute('aria-label',`${r.title} মুছুন`); del.addEventListener('click',()=>removeRecord(r.id));
    item.append(icon,info,amount,del); host.append(item);
  });
}
async function removeRecord(id) { if(!currentUser)return; if(!confirm('এই হিসাবটি মুছে ফেলবেন?'))return; try { await deleteDoc(doc(db,'users',currentUser.uid,'transactions',id)); toast('হিসাব মুছে ফেলা হয়েছে।'); } catch(e){toast(friendlyError(e));} }
function stopUserListener() { if(stopListening){stopListening();stopListening=null;} }
onAuthStateChanged(auth, user=>{
  stopUserListener(); currentUser=user; records=[];
  $('authPanel').classList.toggle('hidden',!!user); $('userBar').classList.toggle('hidden',!user); $('userEmail').textContent=user?.email||'';
  $('transactionForm').querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=!user);
  $('exportBtn').disabled=!user; $('backupBtn').disabled=!user; $('clearBtn').disabled=!user;
  if(user){ setAuthMessage('লগইন সফল হয়েছে। আপনার হিসাব লোড হচ্ছে।'); const q=query(transactionsRef(),orderBy('date','desc')); stopListening=onSnapshot(q,snap=>{records=snap.docs.map(d=>({id:d.id,...d.data()})); render(); setAuthMessage('আপনার অ্যাকাউন্ট প্রস্তুত। হিসাব ক্লাউডে সিঙ্ক হবে।');},err=>{setAuthMessage(friendlyError(err),true);toast(friendlyError(err));}); }
  else render();
});
$('authForm').addEventListener('submit',async e=>{e.preventDefault(); const email=$('authEmail').value.trim(),password=$('authPassword').value; $('loginBtn').disabled=true; try { await signInWithEmailAndPassword(auth,email,password); setAuthMessage('লগইন সফল।'); } catch(err){setAuthMessage(friendlyError(err),true);} finally{$('loginBtn').disabled=false;} });
$('registerBtn').addEventListener('click',async()=>{const email=$('authEmail').value.trim(),password=$('authPassword').value;if(!email||!password){setAuthMessage('ইমেইল ও পাসওয়ার্ড লিখুন।',true);return;} $('registerBtn').disabled=true;try{await createUserWithEmailAndPassword(auth,email,password);setAuthMessage('অ্যাকাউন্ট তৈরি হয়েছে।');}catch(err){setAuthMessage(friendlyError(err),true);}finally{$('registerBtn').disabled=false;}});
$('resetBtn').addEventListener('click',async()=>{const email=$('authEmail').value.trim();if(!email){setAuthMessage('আগে ইমেইল লিখুন।',true);return;}try{await sendPasswordResetEmail(auth,email);setAuthMessage('পাসওয়ার্ড রিসেটের ইমেইল পাঠানো হয়েছে।');}catch(err){setAuthMessage(friendlyError(err),true);}});
$('logoutBtn').addEventListener('click',async()=>{try{await signOut(auth);toast('লগআউট হয়েছে।');}catch(e){toast(friendlyError(e));}});
document.querySelectorAll('.type-btn').forEach(btn=>btn.addEventListener('click',()=>{selectedType=btn.dataset.type;document.querySelectorAll('.type-btn').forEach(b=>b.classList.toggle('active',b===btn));}));
$('transactionForm').addEventListener('submit',async e=>{e.preventDefault();if(!currentUser){toast('আগে লগইন করুন।');return;}const title=$('title').value.trim(),amount=Number($('amount').value),date=$('date').value;if(!title||!Number.isFinite(amount)||amount<=0||!date){toast('সব প্রয়োজনীয় তথ্য সঠিকভাবে দিন।');return;}const button=$('transactionForm').querySelector('button[type="submit"]');button.disabled=true;try{await addDoc(transactionsRef(),{title,amount,type:selectedType,date,category:$('category').value,note:$('note').value.trim(),createdAt:serverTimestamp()});$('title').value='';$('amount').value='';$('note').value='';toast(navigator.onLine?'হিসাব সংরক্ষণ হয়েছে।':'অফলাইনে রাখা হয়েছে; ইন্টারনেট এলে সিঙ্ক হবে।');}catch(err){toast(friendlyError(err));}finally{button.disabled=false;}});
$('search').addEventListener('input',render); $('filter').addEventListener('change',render); $('addTop').addEventListener('click',()=>{$('title').focus();document.querySelector('.quick-panel').scrollIntoView({behavior:'smooth',block:'start'});});
function downloadJson(){const blob=new Blob([JSON.stringify(records.map(({id,...r})=>r),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='hisabsaathi-backup.json';a.click();URL.revokeObjectURL(url);}
$('backupBtn').addEventListener('click',downloadJson); $('exportBtn').addEventListener('click',downloadJson);
$('clearBtn').addEventListener('click',async()=>{if(!currentUser||!records.length)return;if(!confirm('সতর্কতা: আপনার সব হিসাব স্থায়ীভাবে মুছে ফেলবেন? এই কাজ ফেরানো যাবে না।'))return;if(!confirm('নিশ্চিত? আগে ব্যাকআপ ডাউনলোড করে নিন।'))return;try{const snap=await getDocs(transactionsRef());await Promise.all(snap.docs.map(d=>deleteDoc(d.ref)));toast('সব হিসাব মুছে ফেলা হয়েছে।');}catch(e){toast(friendlyError(e));}});
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Service worker:',err)));
