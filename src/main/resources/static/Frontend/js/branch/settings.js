// ChainPoint — Cài đặt thông tin vận hành Chi nhánh
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn localStorage

(function () {
    const currentBranchName = sessionStorage.getItem('cp_branch') || '';
    let currentBranchId = sessionStorage.getItem('cp_branch_id') || '';

    const form = document.getElementById('branchSettingsForm');
    const notice = document.getElementById('saveNotice');

    async function loadBranchSettings() {
        try {
            let branch;
            if (window.API) {
                // Tải chi nhánh theo ID hoặc tìm theo tên
                const branches = await window.API.get('/branches');
                branch = branches.find(b => String(b.id) === String(currentBranchId) || b.name === currentBranchName) || branches[0];
            } else {
                const res = await window.API.fetch('http://localhost:8080/api/v1/branches');
                const branches = await res.json();
                branch = branches.find(b => String(b.id) === String(currentBranchId) || b.name === currentBranchName) || branches[0];
            }

            if (branch) {
                currentBranchId = branch.id;
                sessionStorage.setItem('cp_branch_id', branch.id);

                document.getElementById('setBranchName').value = branch.name || '';
                document.getElementById('setBranchCode').value = branch.code || '';
                document.getElementById('setBranchAddress').value = branch.address || '';
                document.getElementById('setBranchHotline').value = branch.phone || '';
                
                const hours = (branch.openHours || '08:00 - 22:30').split('-');
                document.getElementById('setOpenTime').value = (hours[0] || '08:00').trim();
                document.getElementById('setCloseTime').value = (hours[1] || '22:30').trim();

                document.getElementById('setManager').value = branch.managerName || '';
                document.getElementById('setVat').value = branch.vatPercent || 8;
                document.getElementById('setBranchStatus').value = branch.status || 'open';
            }
        } catch (e) {
            console.warn('Không thể nạp cài đặt chi nhánh từ MySQL API:', e);
        }
    }

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            const openTime = document.getElementById('setOpenTime').value;
            const closeTime = document.getElementById('setCloseTime').value;

            const payload = {
                name: document.getElementById('setBranchName').value.trim(),
                code: document.getElementById('setBranchCode').value.trim().toUpperCase(),
                address: document.getElementById('setBranchAddress').value.trim(),
                phone: document.getElementById('setBranchHotline').value.trim(),
                openHours: `${openTime} - ${closeTime}`,
                managerName: document.getElementById('setManager').value.trim(),
                vatPercent: parseFloat(document.getElementById('setVat').value) || 8.0,
                status: document.getElementById('setBranchStatus').value
            };

            try {
                if (window.API) {
                    await window.API.put(`/branches/${currentBranchId}`, payload);
                } else {
                    await window.API.fetch(`http://localhost:8080/api/v1/branches/${currentBranchId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                sessionStorage.setItem('cp_branch', payload.name);

                if (notice) {
                    notice.textContent = '✓ Đã lưu cài đặt chi nhánh vào Database thành công!';
                    notice.style.display = 'block';
                    setTimeout(() => { notice.style.display = 'none'; }, 3000);
                }
            } catch (err) {
                alert('Lỗi khi lưu cài đặt vào Database: ' + err.message);
            }
        };
    }

    loadBranchSettings();
})();
