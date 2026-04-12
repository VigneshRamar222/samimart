import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlhUwvmUeqMu7VebBONJa5_8Zk2Nv7l-k",

  authDomain: "samimart-7c856.firebaseapp.com",

  projectId: "samimart-7c856",

  //storageBucket: "samimart-7c856.firebasestorage.app",
  storageBucket: "samimart-7c856.appspot.com",

  messagingSenderId: "276576411212",

  appId: "1:276576411212:web:12bf0ed8058a5c0a291ee9",

  measurementId: "G-D4RRHXZ364",
};

const app = initializeApp(firebaseConfig);

//

const db = getFirestore(app);

// ✅ EXPORT db (VERY IMPORTANT)
export { app, db };
//export default app;
