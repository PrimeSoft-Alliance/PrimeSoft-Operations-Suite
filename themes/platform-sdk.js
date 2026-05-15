
/**
 * Platform SDK for Custom Themes
 * This script allows custom HTML themes to link into the AI and Booking systems.
 */
(function() {
    const params = new URLSearchParams(window.location.search);
    const clientId = window.location.hostname.includes('localhost') ? 'plumber-001' : null;

    // 1. Inject Chatbot
    function initAI() {
        const chatWidget = document.createElement('div');
        chatWidget.id = 'platform-ai-bot';
        document.body.appendChild(chatWidget);
        
        // Dynamic load of the AI script
        const script = document.createElement('script');
        script.src = '/api/chat/widget.js'; 
        document.head.appendChild(script);
    }

    // 2. Sync Content from Dashboard
    async function syncContent() {
        try {
            const res = await fetch(`/api/public/settings?clientId=${clientId || 'plumber-001'}`);
            const settings = await res.json();
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
            document.querySelectorAll('[data-platform-field]').forEach(el => {
                const field = el.getAttribute('data-platform-field');
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

    // 3. Global Helper for Booking
    window.PlatformBooking = {
        open: function() {
            window.location.href = '/booking';
        },
        submit: async function(type, data) {
            const endpoint = type === 'booking' ? '/api/public/booking' : '/api/public/contact';
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
                    if (result.success) alert('Booking successful!');
                    else alert('Error: ' + (result.error || 'Failed'));
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
                    if (result.success) alert('Message sent!');
                    else alert('Error: ' + (result.error || 'Failed'));
                } catch (err) {
                    alert('Connection failed');
                }
            });
        });
    }

    // Auto-init on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initAI();
            initForms();
            syncContent();
        });
    } else {
        initAI();
        initForms();
        syncContent();
    }
})();
