// public/url-generator.js

export function setupURLGenerator() {
  // Create the UI dynamically at the bottom of sidebar
  const sidebar = document.getElementById("sidebar");

  const urlContainer = document.createElement("div");
  urlContainer.id = "url-generator-container";
  urlContainer.style.marginTop = "20px";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Custom room name";
  input.id = "roomNameInput";
  input.style.width = "70%";
  input.style.marginRight = "5px";

  const button = document.createElement("button");
  button.textContent = "Generate URL";
  button.id = "generateURLBtn";

  const result = document.createElement("input");
  result.type = "text";
  result.id = "generatedURL";
  result.readOnly = true;
  result.style.width = "100%";
  result.style.marginTop = "5px";

  urlContainer.appendChild(input);
  urlContainer.appendChild(button);
  urlContainer.appendChild(result);
  sidebar.appendChild(urlContainer);

  button.addEventListener("click", () => {
    const roomName = input.value.trim();
    if (!roomName) return alert("Enter a room name");

    const baseURL = window.location.origin;
    const generated = `${baseURL}?room=${encodeURIComponent(roomName)}`;
    result.value = generated;

    // Auto-select for copy
    result.select();
    result.setSelectionRange(0, 99999);
    document.execCommand("copy");

    alert("URL copied to clipboard!");
  });
}
