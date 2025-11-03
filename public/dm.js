// public/dm.js

export function setupDM(socket) {
  const userList = document.getElementById("userList");
  const messageInput = document.getElementById("messageInput");
  const messageForm = document.getElementById("chat-input-container");
  const chatMessages = document.getElementById("chat-messages");

  let currentDMUser = null; // Track the selected user for DM

  // Listen for clicks on users
  userList.addEventListener("click", (e) => {
    if (e.target.tagName === "LI") {
      currentDMUser = e.target.dataset.username; // store the selected user
      chatMessages.innerHTML = ""; // Clear messages for new DM
      appendSystemMessage(`Direct messaging: ${currentDMUser}`);
    }
  });

  // Handle sending DM messages
  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (!msg) return;

    if (currentDMUser) {
      socket.emit("private message", { to: currentDMUser, text: msg });
      appendDMMessage(`To ${currentDMUser}: ${msg}`);
    } else {
      // normal chat
      socket.emit("chat message", msg);
    }

    messageInput.value = "";
  });

  // Listen for incoming DMs
  socket.on("private message", (data) => {
    appendDMMessage(`From ${data.from}: ${data.text}`);
  });

  function appendDMMessage(text) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.style.backgroundColor = "#ffd"; // DM background
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
