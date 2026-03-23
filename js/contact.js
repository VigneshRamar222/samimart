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

    // Show loader
    sendBtn.classList.add("btn-loading");
    sendBtn.innerHTML = `
    <span class="spinner-border spinner-border-sm"></span>
    Sending...
  `;

    // Collect form data
    const data = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      subject: document.getElementById("subject").value,
      message: document.getElementById("message").value,
    };

    try {
      const response = await fetch("http://localhost:3000/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      //console.log(response)
      const result = await response.json();

      if (response.ok) {
        // Show success message
        const successMsg = document.getElementById("successMsg");
        successMsg.classList.remove("d-none");
        setTimeout(() => successMsg.classList.add("d-none"), 5000);

        // Clear form
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
