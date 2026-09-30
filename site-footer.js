// Shared across every page. Injects a simple footer with social links
// into any page that has a <div id="siteFooter"></div> placeholder.
// Include with:  <script src="site-footer.js"></script>

document.addEventListener('DOMContentLoaded', () => {
  const footer = document.getElementById('siteFooter');
  if (!footer) return;

  footer.innerHTML = `
    <div class="flex justify-center gap-5 py-6">
      <a href="https://www.instagram.com/fairfuturecommunications" target="_blank" rel="noopener noreferrer" aria-label="Fair Future on Instagram" class="text-[#6B1D28] hover:opacity-70 transition">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
        </svg>
      </a>
      <a href="https://www.tiktok.com/@fairfuturecommunications" target="_blank" rel="noopener noreferrer" aria-label="Fair Future on TikTok" class="text-[#6B1D28] hover:opacity-70 transition">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 2h-3v13.5a2.5 2.5 0 1 1-2.5-2.5c.17 0 .34.02.5.05V9.9a5.5 5.5 0 1 0 5 5.48V8.6a7.4 7.4 0 0 0 4 1.18V6.77A4.5 4.5 0 0 1 16.5 2z"/>
        </svg>
      </a>
      <a href="https://www.linkedin.com/in/fair-future-23b0b1430" target="_blank" rel="noopener noreferrer" aria-label="Fair Future on LinkedIn" class="text-[#6B1D28] hover:opacity-70 transition">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-6.8c0-1.62-.03-3.7-2.25-3.7-2.26 0-2.6 1.77-2.6 3.58V23h-4V8z"/>
        </svg>
      </a>
    </div>
  `;
});