import { updateCartCount } from "/js/main.js";

updateCartCount();
//const API_BASE = window.location.origin;
const API_BASE = "http://localhost:3000";

document.getElementById("year").textContent = new Date().getFullYear();

document
  .getElementById("contactForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!this.checkValidity()) {
      this.classList.add("was-validated");
      return;
    }

    const sendBtn = document.getElementById("sendBtn");
    const originalText = sendBtn.innerHTML;

    sendBtn.classList.add("btn-loading");
    sendBtn.innerHTML = `
    <span class="spinner-border spinner-border-sm"></span>
    Sending...
  `;

    const data = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      subject: document.getElementById("subject").value,
      message: document.getElementById("message").value,
    };

    try {
      const response = await fetch(`${API_BASE}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};

      if (response.ok) {
        const successMsg = document.getElementById("successMsg");
        successMsg.classList.remove("d-none");
        setTimeout(() => successMsg.classList.add("d-none"), 5000);

        document.getElementById("contactForm").reset();
      } else {
        alert(result.error || "Failed to send email. Please try again later.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again later.");
    } finally {
      sendBtn.innerHTML = originalText;
      sendBtn.classList.remove("btn-loading");
    }
  });
