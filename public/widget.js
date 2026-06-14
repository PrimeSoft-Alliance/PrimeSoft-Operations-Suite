(function() {
  const script = document.currentScript;
  let clientId = script?.getAttribute('data-client-id');
  
  // fallback to looking at the div
  if(!clientId) {
    const div = document.getElementById('ai-assistant-widget');
    if(div) clientId = div.getAttribute('client_id');
  }

  if (!clientId) {
    console.warn('AI Assistant Widget: Missing client_id');
    return;
  }

  const BASE_URL = script ? new URL(script.src).origin : window.location.origin;

  // 1. Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #platform-chatbot-root { position: fixed; bottom: 20px; right: 20px; z-index: 999999; font-family: 'Inter', sans-serif; }
    .platform-chat-bubble { width: 60px; height: 60px; border-radius: 30px; background: #6366f1; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s; }
    .platform-chat-bubble:hover { transform: scale(1.05); }
    .platform-chat-window { position: absolute; bottom: 80px; right: 0; width: 380px; height: 600px; max-height: calc(100vh - 120px); background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; }
    .platform-chat-window.open { display: flex; }
    @media (max-width: 480px) {
      .platform-chat-window { width: calc(100vw - 40px); bottom: 80px; right: 0; }
    }
  `;
  document.head.appendChild(style);

  // 2. Inject DOM
  const root = document.createElement('div');
  root.id = 'platform-chatbot-root';
  root.innerHTML = `
    <div class="platform-chat-window" id="platform-chat-window">
      <iframe src="${BASE_URL}/chatbot-mini?clientId=${clientId}&embed=true" width="100%" height="100%" frameborder="0" style="border:none; width:100%; height:100%; border-radius:16px;"></iframe>
    </div>
    <div class="platform-chat-bubble" id="platform-chat-bubble">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
  `;
  document.body.appendChild(root);

  // 3. Bind toggle events
  const bubble = document.getElementById('platform-chat-bubble');
  const windowElem = document.getElementById('platform-chat-window');

  // Let iframe know we are open so it can autofocus
  const iframe = windowElem.querySelector('iframe');

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

  // Allow iframe to close widget via postMessage
  window.addEventListener('message', (event) => {
    if (event.data === 'close-chat-widget' && isOpen) {
        bubble.click();
    }
  });

})();
