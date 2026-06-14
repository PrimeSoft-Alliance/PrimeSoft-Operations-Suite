(function() {
  /**
   * Ominics AI Assistant Widget
   * Dynamically loads and injects the conversational AI widget into any webpage.
   */
  const script = document.currentScript;
  
  // Extract client ID primarily from the script tag's data attribute
  const clientId = script?.getAttribute('data-client-id');

  if (!clientId) {
    console.error('[Ominics AI] Missing data-client-id attribute on the script tag.');
    return;
  }

  // Define the base URL dynamically based on where the script is hosted
  const BASE_URL = script ? new URL(script.src).origin : window.location.origin;

  // 1. Inject CSS for the widget styling
  const style = document.createElement('style');
  style.textContent = `
    #ominicsr { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    .ominics-chat-bubble { width: 60px; height: 60px; border-radius: 30px; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
    .ominics-chat-bubble:hover { transform: scale(1.05); }
    .ominics-chat-window { position: absolute; bottom: 80px; right: 0; width: 380px; height: 600px; max-height: calc(100vh - 120px); background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; border: 1px solid #e5e7eb; opacity: 0; transition: opacity 0.2s ease-in-out; }
    .ominics-chat-window.open { display: flex; opacity: 1; }
    @media (max-width: 480px) {
      .ominics-chat-window { width: calc(100vw - 40px); bottom: 80px; right: 0; }
    }
  `;
  document.head.appendChild(style);

  // 2. Build the DOM structure
  const root = document.createElement('div');
  root.id = 'ominicsr';
  root.innerHTML = `
    <div class="ominics-chat-window" id="ominics-chat-window">
      <iframe src="${BASE_URL}/chatbot-mini?clientId=${clientId}&embed=true" width="100%" height="100%" frameborder="0" style="border:none; width:100%; height:100%; border-radius:16px;"></iframe>
    </div>
    <div class="ominics-chat-bubble" id="ominics-chat-bubble" aria-label="Toggle AI Assistant" role="button">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
  `;
  document.body.appendChild(root);

  // 3. Bind toggle events for the floating action button
  const bubble = document.getElementById('ominics-chat-bubble');
  const windowElem = document.getElementById('ominics-chat-window');

  let isOpen = false;
  bubble.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      windowElem.classList.add('open');
      bubble.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else {
      windowElem.classList.remove('open');
      bubble.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    }
  };

  // 4. Listen for postMessage from iframe (e.g., to close the widget programmatically)
  window.addEventListener('message', (event) => {
    // Basic security check (optional): ensure event.origin matches BASE_URL
    if (event.data === 'close-chat-widget' && isOpen) {
        bubble.click();
    }
  });

})();
