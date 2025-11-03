// public/rgb-theme.js

export function setupRGBPanel(chatContainer, sidebar, themeSelect) {
  const rSlider = document.getElementById("rSlider");
  const gSlider = document.getElementById("gSlider");
  const bSlider = document.getElementById("bSlider");
  const resetBtn = document.getElementById("resetTheme");

  function applyRGBColor(r, g, b) {
    const rgb = `rgb(${r}, ${g}, ${b})`;
    // Apply to main chat area
    chatContainer.querySelector("#chat-messages").style.backgroundColor = rgb;
    chatContainer.querySelector("#chat-input-container").style.backgroundColor = rgb;
    chatContainer.querySelector("#chat-header").style.backgroundColor = rgb;
    sidebar.style.backgroundColor = rgb;

    // Optional: adjust text color for contrast
    const brightness = (r*299 + g*587 + b*114) / 1000;
    const textColor = brightness > 125 ? "black" : "white";
    document.body.style.color = textColor;
  }

  function handleSliderChange() {
    const r = parseInt(rSlider.value);
    const g = parseInt(gSlider.value);
    const b = parseInt(bSlider.value);
    applyRGBColor(r, g, b);
  }

  rSlider.addEventListener("input", handleSliderChange);
  gSlider.addEventListener("input", handleSliderChange);
  bSlider.addEventListener("input", handleSliderChange);

  // Reset to theme colors
  resetBtn.addEventListener("click", () => {
    const selectedTheme = themeSelect.value;
    document.body.className = ""; // remove all previous
    document.body.classList.add(selectedTheme);

    // Reset sliders visually
    rSlider.value = 0;
    gSlider.value = 0;
    bSlider.value = 0;
  });
}
