// src/hooks/useToast.js

function showToast(message, type = 'success') {
  // 1. Look for or create the container block element on your web app screen
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    
    // CRITICAL: These CSS styles make sure the popup floats on top of your webpage!
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  // 2. Create the message block element
  const toast = document.createElement('div');
  toast.innerText = message;
  
  // Design Layout properties
  toast.style.padding = '14px 28px';
  toast.style.marginBottom = '10px';
  toast.style.borderRadius = '6px';
  toast.style.color = '#ffffff';
  toast.style.fontWeight = 'bold';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  toast.style.transition = 'all 0.3s ease-in-out';

  // Apply conditional color styling matching success/error status
  if (type === 'success') {
    toast.style.background = '#22c55e'; // Vibrant Green background
  } else {
    toast.style.background = '#ef4444'; // Red alert background
  }

  // 3. Append to display container
  container.appendChild(toast);

  // 4. Automatically clear notification block after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

export default showToast;