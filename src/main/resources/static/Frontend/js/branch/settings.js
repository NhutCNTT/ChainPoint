// ChainPoint — Cài đặt thông tin vận hành Chi nhánh
// Used by: pages/branch/settings.html

(function () {
    const STORAGE_KEY = 'cp_branch_settings';
    const currentBranch = sessionStorage.getItem('cp_branch') || localStorage.getItem('cp_branch') || 'Chi nhánh Quận 1';

    const DEFAULT_SETTINGS = {
        name: currentBranch,
        code: 'CN-Q1',
        address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        hotline: '028 3822 9999',
        openTime: '08:00',
        closeTime: '22:30',
        manager: 'Nguyễn Văn Nam',
        vat: 8,
        autoPrint: true,
        status: 'open'
    };

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY + '_' + currentBranch);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error(e);
        }
        return DEFAULT_SETTINGS;
    }

    function saveSettings(data) {
        localStorage.setItem(STORAGE_KEY + '_' + currentBranch, JSON.stringify(data));
    }

    const form = document.getElementById('branchSettingsForm');
    const notice = document.getElementById('saveNotice');

    if (form) {
        const s = loadSettings();
        document.getElementById('setBranchName').value = s.name;
        document.getElementById('setBranchCode').value = s.code;
        document.getElementById('setBranchAddress').value = s.address;
        document.getElementById('setBranchHotline').value = s.hotline;
        document.getElementById('setOpenTime').value = s.openTime;
        document.getElementById('setCloseTime').value = s.closeTime;
        document.getElementById('setManager').value = s.manager;
        document.getElementById('setVat').value = s.vat;
        document.getElementById('setAutoPrint').checked = s.autoPrint;
        document.getElementById('setBranchStatus').value = s.status;

        form.onsubmit = (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('setBranchName').value.trim(),
                code: document.getElementById('setBranchCode').value.trim(),
                address: document.getElementById('setBranchAddress').value.trim(),
                hotline: document.getElementById('setBranchHotline').value.trim(),
                openTime: document.getElementById('setOpenTime').value,
                closeTime: document.getElementById('setCloseTime').value,
                manager: document.getElementById('setManager').value.trim(),
                vat: parseInt(document.getElementById('setVat').value, 10) || 0,
                autoPrint: document.getElementById('setAutoPrint').checked,
                status: document.getElementById('setBranchStatus').value
            };

            saveSettings(data);
            if (notice) {
                notice.style.display = 'block';
                setTimeout(() => { notice.style.display = 'none'; }, 3000);
            }
        };
    }
})();

