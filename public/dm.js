export function setupDM(socket) {
  const userList = document.getElementById("userList");
  const messageInput = document.getElementById("messageInput");
  const messageForm = document.getElementById("chat-input-container");
  const chatMessages = document.getElementById("chat-messages");

  let currentDMUser = null;

  // Select user to DM
  userList.addEventListener("click", (e) => {
    if (e.target.tagName === "LI") {
      currentDMUser = e.target.dataset.username;
      chatMessages.innerHTML = "";
      appendSystemMessage(`Direct messaging: ${currentDMUser}`);
    }
  });

  // Send message
  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (!msg) return;

    if (currentDMUser) {
      socket.emit("private message", { to: currentDMUser, text: msg });
      appendDMMessage(`To ${currentDMUser}: ${msg}`);
    }
  });

  // Receive DM
  socket.on("private message", (data) => {
    appendDMMessage(`From ${data.from}: ${data.text}`);
  });

  function appendDMMessage(text) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.style.backgroundColor = "#ffd";
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendSystemMessage(text) {
    const div = document.createElement("div");
    div.classList.add("message", "system");
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}
