
/**
 * Platform SDK for Custom Themes
 * This script allows custom HTML themes to link into the AI and Booking systems.
 */
(function() {
    // Correctly resolve the base URL and clientId by inspecting the script tag
    // that loaded this file.
    const currentScript = document.currentScript || document.querySelector('script[src*="platform-sdk.js"]');
    
    let baseUrl = '';
    let clientId = window.location.hostname.includes('localhost') ? 'plumber-001' : null;
    let autoDetect = false;

    if (currentScript) {
        // Extract base URL from the script source
        const srcUrl = new URL(currentScript.src, window.location.href);
        baseUrl = srcUrl.origin;
        
        // Extract client ID
        const dataClientId = currentScript.getAttribute('data-client-id');
        if (dataClientId) {
            clientId = dataClientId;
        }

        autoDetect = currentScript.getAttribute('data-auto-detect') === 'true';
    }

    // Theme Detection Utility
    function getThemeColor(fallback) {
        // 1. Host script tag attribute override
        const manual = currentScript?.getAttribute('data-color');
        if (manual) return manual;

        // 2. Host site CSS variable override
        const bodyStyle = window.getComputedStyle(document.documentElement);
        const cssVar = bodyStyle.getPropertyValue('--psa-primary').trim();
        if (cssVar) return cssVar;

        // 3. Auto-detect from host site's dominant buttons or headings
        try {
            const btn = document.querySelector('button, .btn, .button, a[href].primary');
            if (btn) {
                const style = window.getComputedStyle(btn);
                const bg = style.backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
            }
        } catch (e) {}

        return fallback;
    }

    // 1. Inject Chatbot
    async function initAI() {
        const configRes = await fetch(`${baseUrl}/v1/public/headless/config?clientId=${clientId}`);
        const config = await configRes.json();
        
        const aiConfig = config.ai || {};
        const platformColor = aiConfig.color || '#6366f1';
        const primaryColor = getThemeColor(platformColor); 
        const title = aiConfig.title || 'Assistant';

        // Create Chat Bubble
        const bubble = document.createElement('div');
        bubble.id = 'psa-ai-bubble';
        bubble.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: ${primaryColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            transition: transform 0.2s;
        `;
        bubble.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';
        bubble.onmouseenter = () => bubble.style.transform = 'scale(1.1)';
        bubble.onmouseleave = () => bubble.style.transform = 'scale(1)';

        // Create Chat Window
        const window = document.createElement('div');
        window.id = 'psa-ai-window';
        window.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            display: none;
            flex-direction: column;
            overflow: hidden;
            z-index: 9999;
            font-family: sans-serif;
        `;

        window.innerHTML = `
            <div style="background: ${primaryColor}; padding: 15px; color: white; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600;">${title}</span>
                <span id="psa-chat-close" style="cursor: pointer; opacity: 0.8;">&times;</span>
            </div>
            <div id="psa-chat-messages" style="flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9fafb;">
                <div style="background: white; padding: 8px 12px; border-radius: 8px; font-size: 14px; border: 1px solid #e5e7eb; align-self: flex-start; max-width: 85%;">
                    ${aiConfig.greeting || 'Hello! How can I help you today?'}
                </div>
            </div>
            <form id="psa-chat-form" style="padding: 15px; border-top: 1px solid #eee; display: flex; gap: 8px;">
                <input type="text" id="psa-chat-input" placeholder="Type a message..." style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; outline: none; font-size: 14px;">
                <button type="submit" style="background: ${primaryColor}; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
            </form>
        `;

        document.body.appendChild(bubble);
        document.body.appendChild(window);

        // Open/Close logic
        bubble.onclick = () => {
            window.style.display = window.style.display === 'none' ? 'flex' : 'none';
        };
        const closeBtn = window.querySelector('#psa-chat-close');
        if (closeBtn) {
           closeBtn.onclick = () => window.style.display = 'none';
        }

        const msgContainer = window.querySelector('#psa-chat-messages');
        const chatForm = window.querySelector('#psa-chat-form');
        const chatInput = window.querySelector('#psa-chat-input');
        let history = [];

        function appendMessage(role, text) {
            const div = document.createElement('div');
            const isUser = role === 'user';
            div.style.cssText = `
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 14px;
                max-width: 85%;
                ${isUser 
                    ? `background: ${primaryColor}; color: white; align-self: flex-end;` 
                    : 'background: white; color: #374151; align-self: flex-start; border: 1px solid #e5e7eb;'
                }
            `;
            div.innerText = text;
            if (msgContainer) {
              msgContainer.appendChild(div);
              msgContainer.scrollTop = msgContainer.scrollHeight;
            }
        }

        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (!text) return;

                chatInput.value = '';
                appendMessage('user', text);

                try {
                    const res = await fetch(`${baseUrl}/v1/public/ai/chat`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-client-id': clientId
                        },
                        body: JSON.stringify({ message: text, history })
                    });
                    const data = await res.json();
                    const reply = data.data?.text || data.text || 'Sorry, I encountered an error.';
                    appendMessage('bot', reply);
                    history.push({ role: 'user', content: text });
                    history.push({ role: 'assistant', content: reply });
                } catch (err) {
                    appendMessage('bot', 'Failed to connect to the assistant.');
                }
            });
        }
    }

    // 2. Sync Content from Dashboard
    async function syncContent() {
        try {
            const res = await fetch(`${baseUrl}/v1/public/settings?clientId=${clientId || 'plumber-001'}`);
            const payload = await res.json();
            const settings = payload.data || payload;
            if (!settings) return;

            // Apply Branding
            if (settings.primaryColor) {
                document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
            }
            if (settings.fontFamily) {
                const fontStack = settings.fontFamily + ', sans-serif';
                document.body.style.fontFamily = fontStack;
            }

            // Sync Text Fields
            document.querySelectorAll('[data-platform-field], [data-psa-content]').forEach(el => {
                const field = el.getAttribute('data-platform-field') || el.getAttribute('data-psa-content');
                if (settings[field]) {
                    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.value = settings[field];
                    } else {
                        el.innerText = settings[field];
                    }
                }
            });

            // Sync Images
            document.querySelectorAll('[data-platform-image]').forEach(el => {
                const field = el.getAttribute('data-platform-image');
                if (settings[field] && el.tagName === 'IMG') {
                    el.src = settings[field];
                }
            });
        } catch (err) {
            console.error('Failed to sync platform content:', err);
        }
    }

    // 3. Global Helper for Booking/Forms
    window.PlatformBooking = {
        open: function() {
            window.location.href = `${baseUrl}/booking`;
        },
        submit: async function(type, data) {
            const endpoint = type === 'booking' ? `${baseUrl}/v1/bookings` : `${baseUrl}/v1/contact`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-id': clientId
                },
                body: JSON.stringify(data)
            });
            return await res.json();
        }
    };

    // 3. Automatic Form Detection
    function initForms() {
        const bookingForms = document.querySelectorAll('form[data-platform="booking"]');
        bookingForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                try {
                    const result = await window.PlatformBooking.submit('booking', data);
                    if (result.success || result.data) alert('Booking successful!');
                    else alert('Error: ' + (result.error || result.message || 'Failed'));
                } catch (err) {
                    alert('Connection failed');
                }
            });
        });

        const contactForms = document.querySelectorAll('form[data-platform="contact"]');
        contactForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                try {
                    const result = await window.PlatformBooking.submit('contact', data);
                    if (result.success || result.data) alert('Message sent!');
                    else alert('Error: ' + (result.error || result.message || 'Failed'));
                } catch (err) {
                    alert('Connection failed');
                }
            });
        });
    }

    // 4. Inject Dynamic Forms
    function initDynamicForms() {
        const embeds = document.querySelectorAll('.psa-form-embed');
        embeds.forEach(async el => {
            const formId = el.getAttribute('data-form-id');
            if (!formId) return;

            try {
                const res = await fetch(`${baseUrl}/v1/public/forms/${formId}?clientId=${clientId}`);
                const payload = await res.json();
                const formDef = payload.data || payload;
                if (!formDef || formDef.error) return;

                const formHtml = document.createElement('form');
                formHtml.className = 'psa-injected-form';
                
                // Construct styling based on theme
                const theme = formDef.theme || {};
                const platformColor = theme.primaryColor || '#6366f1';
                const primaryColor = getThemeColor(platformColor);
                const bg = theme.backgroundColor || 'transparent';
                const font = theme.fontFamily || 'inherit';
                const roundedMap = { square: '0px', rounded: '8px', pill: '9999px' };
                const radius = roundedMap[theme.buttonStyle] || '8px';

                formHtml.style.cssText = `
                    background: ${bg};
                    font-family: ${font};
                    padding: 20px;
                    border-radius: ${radius};
                    max-width: 500px;
                    width: 100%;
                `;

                let currentPage = 0;
                const pages = [];
                let currentFields = [];

                (formDef.fields || []).forEach(f => {
                    if (f.type === 'page-break') {
                        pages.push(currentFields);
                        currentFields = [];
                    } else {
                        currentFields.push(f);
                    }
                });
                pages.push(currentFields);

                function renderPage(pageIndex) {
                    formHtml.innerHTML = ''; // clear

                    if (formDef.name && pageIndex === 0) {
                        const h3 = document.createElement('h3');
                        h3.innerText = formDef.name;
                        h3.style.marginBottom = '10px';
                        h3.style.fontSize = '1.25rem';
                        h3.style.fontWeight = 'bold';
                        formHtml.appendChild(h3);
                    }
                    if (formDef.description && pageIndex === 0) {
                        const p = document.createElement('p');
                        p.innerText = formDef.description;
                        p.style.marginBottom = '20px';
                        p.style.fontSize = '0.875rem';
                        p.style.color = '#6b7280';
                        formHtml.appendChild(p);
                    }

                    pages[pageIndex].forEach(f => {
                        const wrap = document.createElement('div');
                        wrap.style.marginBottom = '15px';
                        
                        if (f.type.startsWith('content-')) {
                            if (f.type === 'content-text') {
                                const p = document.createElement('div');
                                p.innerText = f.contentData || f.label;
                                p.style.fontSize = '0.9rem';
                                p.style.lineHeight = '1.5';
                                wrap.appendChild(p);
                            } else if (f.type === 'content-image') {
                                const img = document.createElement('img');
                                img.src = f.contentData || '';
                                img.alt = f.label || '';
                                img.style.maxWidth = '100%';
                                img.style.borderRadius = radius;
                                wrap.appendChild(img);
                            } else if (f.type === 'content-video') {
                                const iframe = document.createElement('iframe');
                                iframe.src = f.contentData || '';
                                iframe.style.width = '100%';
                                iframe.style.height = '200px';
                                iframe.style.border = 'none';
                                iframe.style.borderRadius = radius;
                                wrap.appendChild(iframe);
                            }
                            formHtml.appendChild(wrap);
                            return;
                        }

                        const label = document.createElement('label');
                        label.innerText = f.label || f.name;
                        label.style.display = 'block';
                        label.style.marginBottom = '5px';
                        label.style.fontSize = '0.875rem';
                        label.style.fontWeight = '500';
                        
                        let input;
                        if (f.type === 'textarea') {
                            input = document.createElement('textarea');
                            input.rows = 3;
                        } else if (f.type === 'select') {
                            input = document.createElement('select');
                            (f.options || []).forEach(opt => {
                                const option = document.createElement('option');
                                option.value = opt;
                                option.innerText = opt;
                                input.appendChild(option);
                            });
                        } else {
                            input = document.createElement('input');
                            input.type = f.type || 'text';
                        }
                        
                        input.name = f.name;
                        if (f.required) input.required = true;
                        input.style.cssText = `
                            width: 100%;
                            padding: 8px 12px;
                            border: 1px solid #d1d5db;
                            border-radius: ${radius};
                            outline: none;
                            font-family: inherit;
                            box-sizing: border-box;
                        `;
                        
                        wrap.appendChild(label);
                        wrap.appendChild(input);
                        formHtml.appendChild(wrap);
                    });

                    // Navigation buttons
                    const navWrap = document.createElement('div');
                    navWrap.style.display = 'flex';
                    navWrap.style.gap = '10px';
                    navWrap.style.marginTop = '15px';

                    if (pageIndex > 0) {
                        const prevBtn = document.createElement('button');
                        prevBtn.type = 'button';
                        prevBtn.innerText = 'Back';
                        prevBtn.style.cssText = `
                            flex: 1;
                            padding: 10px 15px;
                            background: #e5e7eb;
                            color: #374151;
                            border: none;
                            border-radius: ${radius};
                            cursor: pointer;
                            font-weight: 600;
                        `;
                        prevBtn.onclick = () => renderPage(pageIndex - 1);
                        navWrap.appendChild(prevBtn);
                    }

                    if (pageIndex < pages.length - 1) {
                        const nextBtn = document.createElement('button');
                        nextBtn.type = 'button';
                        nextBtn.innerText = 'Next';
                        nextBtn.style.cssText = `
                            flex: 1;
                            padding: 10px 15px;
                            background: ${primaryColor};
                            color: white;
                            border: none;
                            border-radius: ${radius};
                            cursor: pointer;
                            font-weight: 600;
                        `;
                        nextBtn.onclick = () => renderPage(pageIndex + 1);
                        navWrap.appendChild(nextBtn);
                    } else {
                        const submitBtn = document.createElement('button');
                        submitBtn.type = 'submit';
                        submitBtn.innerText = 'Submit';
                        submitBtn.style.cssText = `
                            flex: 1;
                            padding: 10px 15px;
                            background: ${primaryColor};
                            color: white;
                            border: none;
                            border-radius: ${radius};
                            cursor: pointer;
                            font-weight: 600;
                        `;
                        navWrap.appendChild(submitBtn);
                    }

                    formHtml.appendChild(navWrap);
                }
                
                // Initialize first page
                renderPage(0);

                formHtml.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const submitBtn = formHtml.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerText = 'Submitting...';
                    }
                    
                    const formData = new FormData(formHtml);
                    const data = Object.fromEntries(formData.entries());
                    try {
                        const submitRes = await fetch(`${baseUrl}/v1/public/forms/${formId}/submit`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        const submitData = await submitRes.json();
                        if (submitData.success || submitData.data) {
                            formHtml.innerHTML = `<div style="padding: 20px; text-align: center; color: ${primaryColor}; font-weight: 500;">Thank you! Your submission has been received.</div>`;
                        } else {
                            alert('Error submitting form: ' + (submitData.error || 'Unknown error'));
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerText = 'Submit';
                            }
                        }
                    } catch (err) {
                        alert('Connection error');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerText = 'Submit';
                        }
                    }
                });

                el.appendChild(formHtml);
            } catch (err) {
                console.error('PlatformSDK: Form injection failed', err);
            }
        });
    }

    // Auto-init on load
    function initialize() {
        initAI();
        initForms();
        initDynamicForms();
        syncContent();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
