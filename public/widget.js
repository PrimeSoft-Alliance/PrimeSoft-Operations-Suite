(function() {
  const container = document.createElement('div');
  container.id = 'ominirep-widget-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';

  const currentScript = document.currentScript;
  const clientId = currentScript ? currentScript.getAttribute('data-client-id') : 'unknown';

  const iframe = document.createElement('iframe');
  iframe.src = 'https://' + window.location.host + '/chat?client=' + clientId;
  iframe.style.width = '380px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
  iframe.style.display = 'none';

  const button = document.createElement('button');
  button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.borderRadius = '30px';
  button.style.backgroundColor = '#4F46E5';
  button.style.color = '#FFFFFF';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 12px rgba(79,70,229,0.4)';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.marginTop = '16px';
  button.style.marginLeft = 'auto';
  button.style.transition = 'transform 0.2s';

  let isOpen = false;
  button.onclick = () => {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    button.style.transform = isOpen ? 'scale(0.9)' : 'scale(1)';
  };

  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);
})();
