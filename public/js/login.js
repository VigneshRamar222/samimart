import {
  getAuth,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import { app } from "/js/firebase-config.js";

const auth = getAuth(app);

const msg = document.getElementById("message");
const spinner = document.getElementById("spinner");
const btn = document.getElementById("loginBtn");

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "master.html";
  }
});

document
  .getElementById("password")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      document.getElementById("loginBtn").click();
    }
  });

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

      if (!user.emailVerified) {
        sendEmailVerification(user)
          .then(() => {
            msg.innerHTML =
              '<span style="color:green;">Verification link sent to your email 📧</span>';
          })
          .catch((error) => {
            console.error("Error:", error);
            msg.innerHTML =
              '<span style="color:red;">Mail verification server error</span>';
          });

        spinner.style.display = "none";
        btn.disabled = false;

        startVerificationCheck();
        return;
      }

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

document
  .getElementById("forgotPasswordBtn")
  .addEventListener("click", function () {
    const email = document.getElementById("email").value;

    if (email === "") {
      msg.innerHTML =
        '<span style="color:red;">Enter your email to reset password</span>';
      return;
    }

    spinner.style.display = "inline-block";
    btn.disabled = true;

    sendPasswordResetEmail(auth, email)
      .then(() => {
        msg.innerHTML =
          '<span style="color:green;">Password reset link sent 📧</span>';
      })
      .catch((error) => {
        console.error(error);

        if (error.code === "auth/user-not-found") {
          msg.innerHTML =
            '<span style="color:red;">No user found with this email</span>';
        } else if (error.code === "auth/invalid-email") {
          msg.innerHTML =
            '<span style="color:red;">Invalid email format</span>';
        } else {
          msg.innerHTML =
            '<span style="color:red;">Error sending reset email</span>';
        }
      })
      .finally(() => {
        spinner.style.display = "none";
        btn.disabled = false;
      });
  });

const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", function () {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";

  passwordInput.setAttribute("type", type);
  this.textContent = type === "password" ? "👁" : "🙈";
});
