(function() {
  const SCRIPT_URL = document.currentScript ? document.currentScript.src : '';
  const BASE_URL = SCRIPT_URL ? new URL(SCRIPT_URL).origin : window.location.origin;
  
  const options = {
    clientId: document.currentScript?.getAttribute('data-client-id'),
    features: document.currentScript?.getAttribute('data-features')?.split(',') || ['chat', 'booking', 'contact'],
    autoDetect: document.currentScript?.getAttribute('data-auto-detect') === 'true'
  };

  async function init() {
    try {
      // 1. Resolve Config
      const configUrl = new URL(`${BASE_URL}/v1/public/content/config`);
      if (!options.autoDetect && options.clientId) {
        configUrl.searchParams.set('clientId', options.clientId);
      }
      configUrl.searchParams.set('host', window.location.hostname);

      const resp = await fetch(configUrl);
      if (!resp.ok) throw new Error('Failed to resolve tenant');
      const config = await resp.json();

      if (!config.headless?.enabled) return;

      // 2. Inject CSS
      const style = document.createElement('style');
      style.textContent = `
        #platform-chatbot-root { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: Inter, sans-serif; }
        .platform-chat-bubble { width: 60px; height: 60px; border-radius: 30px; background: ${config.ai.color || '#6366f1'}; color: white; display: flex; items-center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s; }
        .platform-chat-bubble:hover { transform: scale(1.05); }
        .platform-chat-window { position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; }
        .platform-chat-header { padding: 16px; background: ${config.ai.color || '#6366f1'}; color: white; display: flex; justify-content: space-between; align-items: center; }
        .platform-chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; background: #f9fafb; }
        .platform-chat-msg { max-width: 80%; padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; }
        .platform-msg-user { align-self: flex-end; background: ${config.ai.color || '#6366f1'}; color: white; }
        .platform-msg-bot { align-self: flex-start; background: #fff; color: #374151; border: 1px solid #e5e7eb; }
        .platform-chat-input-area { padding: 12px; border-top: 1px solid #eee; display: flex; gap: 8px; }
        .platform-chat-input { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }
        .platform-chat-send { background: ${config.ai.color || '#6366f1'}; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; }
      `;
      document.head.appendChild(style);

      // 3. Inject Chatbot if enabled
      if (config.headless.features.chat) {
        const root = document.createElement('div');
        root.id = 'platform-chatbot-root';
        root.innerHTML = `
          <div class="platform-chat-window" id="platform-chat-window">
            <div class="platform-chat-header">
              <span style="font-weight:bold">${config.ai.title || 'Assistant'}</span>
              <span id="platform-close-chat" style="cursor:pointer">&times;</span>
            </div>
            <div class="platform-chat-messages" id="platform-chat-messages">
              <div class="platform-chat-msg platform-msg-bot">${config.ai.greeting || 'Hello! How can I help?'}</div>
            </div>
            <form class="platform-chat-input-area" id="platform-chat-form">
              <input type="text" class="platform-chat-input" placeholder="Type a message..." required>
              <button type="submit" class="platform-chat-send">Send</button>
            </form>
          </div>
          <div class="platform-chat-bubble" id="platform-chat-bubble">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
        `;
        document.body.appendChild(root);

        const bubble = document.getElementById('platform-chat-bubble');
        const windowElem = document.getElementById('platform-chat-window');
        const closeBtn = document.getElementById('platform-close-chat');
        const form = document.getElementById('platform-chat-form');
        const messagesElem = document.getElementById('platform-chat-messages');

        bubble.onclick = () => windowElem.style.display = 'flex';
        closeBtn.onclick = () => windowElem.style.display = 'none';

        form.onsubmit = async (e) => {
          e.preventDefault();
          const input = form.querySelector('input');
          const text = input.value.trim();
          if (!text) return;

          // Add user message
          const userMsg = document.createElement('div');
          userMsg.className = 'platform-chat-msg platform-msg-user';
          userMsg.textContent = text;
          messagesElem.appendChild(userMsg);
          input.value = '';
          messagesElem.scrollTop = messagesElem.scrollHeight;

          // Loading state
          const botMsg = document.createElement('div');
          botMsg.className = 'platform-chat-msg platform-msg-bot';
          botMsg.textContent = '...';
          messagesElem.appendChild(botMsg);

          try {
            const chatResp = await fetch(`${BASE_URL}/v1/chat`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'x-client-id': config.clientId },
               body: JSON.stringify({
                 message: text,
                 pageContext: {
                   page: window.location.pathname.split('/').pop() || 'home',
                   route: window.location.pathname,
                   host: window.location.hostname
                 }
               })
            });
            const data = await chatResp.json();
            botMsg.textContent = data.reply;
          } catch (err) {
            botMsg.textContent = "Sorry, I'm having trouble connecting right now.";
          }
          messagesElem.scrollTop = messagesElem.scrollHeight;
        };
      }

      // 4. Form Injection/Binding
      const bookingForms = document.querySelectorAll('[data-platform-form="booking"]');
      bookingForms.forEach(form => {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          try {
            const res = await fetch(`${BASE_URL}/v1/public/booking`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-client-id': config.clientId },
              body: JSON.stringify(data)
            });
            if (res.ok) {
              alert('Booking request sent successfully!');
              form.reset();
            } else {
              alert('Failed to send booking. Please try again.');
            }
          } catch (err) {
            alert('Error connecting to business platform');
          }
        };
      });

      const contactForms = document.querySelectorAll('[data-platform-form="contact"]');
      contactForms.forEach(form => {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          try {
            const res = await fetch(`${BASE_URL}/v1/public/contact`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-client-id': config.clientId },
              body: JSON.stringify(data)
            });
            if (res.ok) {
              alert('Message sent successfully!');
              form.reset();
            } else {
              alert('Failed to send message. Please try again.');
            }
          } catch (err) {
            alert('Error connecting to business platform');
          }
        };
      });

      // 5. Content Injection for elements with data-platform-content attribute
      if (config.headless.features.content) {
        const contentElements = document.querySelectorAll('[data-platform-content]');
        if (contentElements.length > 0) {
          const contentResp = await fetch(`${BASE_URL}/v1/public/content?clientId=${config.clientId}`);
          const contentData = await contentResp.json();
          
          contentElements.forEach(el => {
            const key = el.getAttribute('data-platform-content');
            if (contentData[key]) {
               if (el.tagName === 'IMG') el.src = contentData[key];
               else if (el.tagName === 'A') el.href = contentData[key];
               else el.textContent = contentData[key];
            }
          });
        }
      }

    } catch (err) {
      console.warn('Platform Leadless Injection failed:', err);
    }
  }

  // Expose Global SDK API
  window.PlatformSDK = {
    init: (opts) => {
       Object.assign(options, opts);
       init();
    },
    chatbot: {
      open: () => {
        const win = document.getElementById('platform-chat-window');
        if (win) win.style.display = 'flex';
      },
      close: () => {
        const win = document.getElementById('platform-chat-window');
        if (win) win.style.display = 'none';
      }
    },
    booking: {
      mount: async (params) => {
        const target = document.querySelector(params.target);
        if (!target) return;
        target.innerHTML = `
          <div style="background:white; padding:24px; border-radius:16px; border:1px solid #eee; box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <h3 style="margin:0 0 16px 0; font-size:18px; font-weight:bold; color:#111827;">Book an Appointment</h3>
            <div id="platform-booking-widget-inner">
               <p style="font-size:14px; color:#6b7280; margin-bottom:16px;">Loading availability...</p>
            </div>
          </div>
        `;
        // In a real production SDK, we'd inject a React component or complex JS here.
        // For now, we'll guide them to the booking page or inject a simple form.
        setTimeout(() => {
          const inner = document.getElementById('platform-booking-widget-inner');
          if (inner) {
            inner.innerHTML = `
              <div style="display:flex; flex-direction:column; gap:12px;">
                <p style="font-size:14px; color:#374151;">To ensure real-time accuracy, please use our secure booking portal:</p>
                <a href="${BASE_URL}/booking?clientId=${options.clientId || ''}" target="_blank" style="display:inline-block; text-align:center; background:#4f46e5; color:white; padding:12px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">Open Booking Portal</a>
              </div>
            `;
          }
        }, 1000);
      }
    }
  };

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
