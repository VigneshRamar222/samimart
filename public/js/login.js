import {
  getAuth,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import app from "../../js/firebase-config.js";

const auth = getAuth(app);

const msg = document.getElementById("message");
const spinner = document.getElementById("spinner");
const btn = document.getElementById("loginBtn");

/* ---------------- SESSION CHECK ---------------- */
// onAuthStateChanged(auth, (user) => {
//   if (user) {
//     window.location.href = "master.html";
//   }
// });

/* ---------------- LOGIN BUTTON ---------------- */
document.getElementById("loginBtn").addEventListener("click", function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (email === "" || password === "") {
    msg.innerHTML =
      '<span style="color:red;">Email and Password required</span>';
    return;
  }

  if (password.length < 6) {
    msg.innerHTML =
      '<span style="color:red;">Password must be at least 6 characters</span>';
    return;
  }

  msg.innerHTML = "";
  spinner.style.display = "inline-block";
  btn.disabled = true;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      /* -------- EMAIL VERIFICATION (OTP style security) -------- */
      if (!user.emailVerified) {
        sendEmailVerification(user)
          .then(() => {
            msg.innerHTML =
              '<span style="color:green;">Verification link sent to your email 📧</span>';

            spinner.style.display = "none";
            btn.disabled = false;
            return;
          })
          .catch((error) => {
            console.error("Error:", error);
            msg.innerHTML =
              '<span style="color:red;">Mail verification server error</span>';
            spinner.style.display = "none";
            btn.disabled = false;
            return;
          });
        startVerificationCheck();
      }

      /* -------- LOGIN SUCCESS -------- */
      msg.innerHTML = '<span style="color:green;">Login successful</span>';
      window.location.href = "master.html";

      spinner.style.display = "none";
      btn.disabled = false;
    })
    .catch((error) => {
      msg.innerHTML =
        '<span style="color:red;">Invalid email or password</span>';

      console.error(error);
      spinner.style.display = "none";
      btn.disabled = false;
    });
});
function startVerificationCheck() {
  const interval = setInterval(() => {
    const user = auth.currentUser;

    if (user) {
      user.reload().then(() => {
        if (user.emailVerified) {
          clearInterval(interval); // ✅ stop loop
          window.location.href = "master.html";
        }
      });
    }
  }, 3000);
}
