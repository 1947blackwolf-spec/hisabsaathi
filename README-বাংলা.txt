HisabSaathi — Firebase সংযুক্ত সংস্করণ

ফাইলসমূহ:
- index.html, styles.css, app.js, manifest.json, service-worker.js
- firestore.rules (Firebase Console-এ প্রকাশ করতে হবে)

গুরুত্বপূর্ণ:
১) Firebase Console > Firestore Database > Rules-এ firestore.rules ফাইলের সম্পূর্ণ কোড বসিয়ে Publish চাপুন।
২) Firebase Console > Authentication > Sign-in method-এ Email/Password চালু রাখুন।
৩) Firebase Console > Authentication > Settings > Authorized domains-এ আপনার GitHub Pages domain যোগ করুন (যদি প্রয়োজন হয়)।
৪) GitHub repository-তে এই প্যাকেজের পাঁচটি অ্যাপ ফাইল root-এ upload করে পুরোনো ফাইল replace করুন। firestore.rules-কে আলাদা ফাইল হিসেবে রাখুন; GitHub-এ রাখলেই Firebase-এ rules প্রকাশ হয় না।
৫) Settings > General > Your apps থেকে Web app config মিলিয়ে নিন। এই সংস্করণে পূর্বে দেওয়া HisabSaathi Firebase config ব্যবহার করা হয়েছে।

সুবিধা:
- Email/password register, login, logout, password reset
- প্রত্যেক ব্যবহারকারীর হিসাব users/{uid}/transactions-এ আলাদা রাখা
- Firestore local cache দিয়ে offline read/write queue সমর্থন (প্রথমবার সাইন ইন/ডেটা লোডের জন্য ইন্টারনেট লাগবে)
- JSON backup, search, income/expense filter

সতর্কতা:
- এই অ্যাপটি এখনো আপনার Firebase project-এ publish/test করা হয়নি। GitHub upload এবং Firestore Rules publish করার পর পরীক্ষা করুন।
- Offline কাজ করতে প্রথমে online অবস্থায় একবার login করুন এবং app-টি load হতে দিন।
- Firebase configuration browser-এ থাকা public client configuration। নিরাপত্তা Firestore Rules এবং Authentication-এর ওপর নির্ভর করে।
