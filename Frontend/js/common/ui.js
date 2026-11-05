// ChainPoint — Shared UI Utilities (Responsive Navigation, Modal, Table Data-Labels, Toasts)
// Used by: all management pages (Branch & Owner & Admin)

(function () {
    // 1. Responsive Sidebar Toggle & Backdrop
    function initResponsiveNav() {
        // Create backdrop if not existing
        let backdrop = document.querySelector('.sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            document.body.appendChild(backdrop);
        }

        backdrop.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });

        // Insert mobile toggle button into topbar if missing
        const topbar = document.querySelector('.topbar');
        if (topbar && !topbar.querySelector('.menu-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'menu-toggle';
            toggleBtn.type = 'button';
            toggleBtn.setAttribute('aria-label', 'Mở menu');
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            `;
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.body.classList.toggle('sidebar-open');
            });
            topbar.insertBefore(toggleBtn, topbar.firstChild);
        }

        // Close sidebar on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.body.classList.remove('sidebar-open');
            }
        });
    }

    // 2. Auto Data-Labels for Responsive Mobile Tables
    function initTableLabels() {
        document.querySelectorAll('table').forEach(table => {
            if (!table.classList.contains('data-table')) {
                table.classList.add('data-table');
            }
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
            if (headers.length === 0) return;

            table.querySelectorAll('tbody tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length === 1 && cells[0].hasAttribute('colspan')) return;
                cells.forEach((cell, idx) => {
                    if (headers[idx] && !cell.hasAttribute('data-label')) {
                        cell.setAttribute('data-label', headers[idx]);
                    }
                });
            });
        });
    }

    // 3. Modal Overlay dismiss on backdrop click & ESC
    function initModals() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    overlay.classList.remove('is-open');
                }
            });
        });
    }

    // 4. Toast helper
    window.showToast = function (message, type = 'success') {
        let stack = document.querySelector('.toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'toast-stack';
            document.body.appendChild(stack);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        stack.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('is-leaving');
            setTimeout(() => toast.remove(), 250);
        }, 3000);
    };

    // Auto-init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initResponsiveNav();
            initTableLabels();
            initModals();
        });
    } else {
        initResponsiveNav();
        initTableLabels();
        initModals();
    }

    // Observer for dynamically rendered tables
    const observer = new MutationObserver(() => {
        initTableLabels();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();

