/*
 * Firebase / Firestore — POS-App
 * compat SDK (regular script, ไม่ใช้ ES modules)
 * โหลดหลัง firebase CDN scripts ใน index.html
 */

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAWMtwltzq3Q7umAq03iDpF5aiLPJQmf4k',
  authDomain:        'nalincha-pos.firebaseapp.com',
  projectId:         'nalincha-pos',
  storageBucket:     'nalincha-pos.firebasestorage.app',
  messagingSenderId: '797777246408',
  appId:             '1:797777246408:web:47f6eb8ce1bce3373f4dfd'
};

firebase.initializeApp(FIREBASE_CONFIG);

// Global Firestore instance — ใช้ใน sync.js
const firestoreDB = firebase.firestore();

// Offline persistence — IndexedDB (ทำงานได้แม้ไม่มีอินเทอร์เน็ต)
firestoreDB.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('[FS] หลายแท็บเปิดพร้อมกัน — offline จำกัดแค่แท็บเดียว');
    } else if (err.code === 'unimplemented') {
      console.warn('[FS] Browser ไม่รองรับ offline persistence');
    }
  });

// Anonymous Auth — บังคับ sign-in ก่อนใช้ Firestore
// Security Rules: allow read, write: if request.auth != null
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    firebase.auth().signInAnonymously()
      .then(() => console.log('[Firebase] ✅ signed in anonymously'))
      .catch(err => console.error('[Firebase] Auth error:', err.code, err.message));
  } else {
    console.log('[Firebase] ✅ auth ready uid:', user.uid);
  }
});

console.log('[Firebase] ✅ nalincha-pos — Firestore ready');
