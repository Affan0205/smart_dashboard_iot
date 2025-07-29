const tempValue = document.getElementById('temperature');
const tempStatus = document.getElementById('temp-status');
const progressBar = document.getElementById('temp-progress-bar');
const ldrValue = document.getElementById('ldr');
const lampAutoStatus = document.getElementById('lamp-auto-status');
const altitudeValue = document.getElementById('altitude');

const ayamEl = document.getElementById('jumlah-ayam');
const pakanEl = document.getElementById('jumlah-pakan');
const airEl = document.getElementById('jumlah-air');

const DEVICES = ['lamp', 'kipas', 'pemanas', 'pompa', 'pakan'];

/* ===== DISPLAY FUNCTIONS ===== */
function updateTempDisplay(temp) {
    if (typeof temp !== 'number') {
        tempValue.textContent = "--°C";
        tempStatus.textContent = "Tidak Tersedia";
        progressBar.className = "progress-bar bg-secondary";
        progressBar.style.width = "0%";
        return;
    }

    tempValue.textContent = `${temp}°C`;

    const status = temp < 24
        ? { text: 'TERLALU RENDAH', color: 'text-info', bar: 'bg-info' }
        : temp > 30
        ? { text: 'TERLALU PANAS', color: 'text-danger', bar: 'bg-danger' }
        : { text: 'IDEAL', color: 'text-success', bar: 'bg-success' };

    progressBar.className = `progress-bar ${status.bar}`;
    progressBar.style.width = `${Math.min(Math.max(temp, 0), 45) / 45 * 100}%`;
    progressBar.setAttribute("aria-valuenow", temp);
    tempStatus.textContent = status.text;
    tempStatus.className = `fw-bold fs-3 ${status.color}`;
}

function updateLDRDisplay(ldr, lampStatus) {
    ldrValue.textContent = typeof ldr === 'number' ? `${ldr} Lux` : '-- Lux';
    lampAutoStatus.textContent = lampStatus === 'on' ? 'MENYALA 🔆' : 'MATI 🌑';
    lampAutoStatus.className = `fw-bold ${lampStatus === 'on' ? 'text-success' : 'text-secondary'}`;
}

function updateAltitudeDisplay(altitude) {
    altitudeValue.innerHTML = altitude != null ? `${altitude} <small>m</small>` : '--';
}

function updateKandangDisplay(data) {
    ayamEl.textContent = data.ayam ?? '--';
    pakanEl.textContent = data.pakan ?? '--';
    airEl.textContent = data.air ?? '--';
}

/* ===== API FETCH FUNCTIONS ===== */
async function fetchTemp() {
    try {
        const res = await fetch("/api/temp");
        const data = await res.json();
        updateTempDisplay(data.temperature);
        updateLDRDisplay(data.ldr, data.lamp_auto);
        updateAltitudeDisplay(data.altitude);
    } catch (err) {
        console.error("❌ Gagal mengambil suhu:", err);
        updateTempDisplay(undefined);
    }
}

async function fetchDataKandang() {
    try {
        const res = await fetch("/api/kandang");
        const data = await res.json();

        // Hitung jumlah total jika array
        if (Array.isArray(data)) {
            const total = data.reduce((acc, curr) => {
                acc.ayam += curr.ayam || 0;
                acc.pakan += curr.pakan || 0;
                acc.air += curr.air || 0;
                return acc;
            }, { ayam: 0, pakan: 0, air: 0 });

            updateKandangDisplay(total);
        } else {
            updateKandangDisplay(data);
        }
    } catch (err) {
        console.error("❌ Gagal mengambil data kandang:", err);
    }
}

function fetchDeviceStatus(device) {
    fetch(`/api/${device}/status`)
        .then(res => res.json())
        .then(data => {
            const card = document.querySelector(`.device-control[data-device="${device}"]`);
            if (!card) return;

            const statusText = card.querySelector('.device-status-text');
            const toggleBtn = card.querySelector('.device-toggle-btn');
            const toggleLabel = card.querySelector('.device-toggle-text');
            const isOn = data.status === 'on';

            statusText.textContent = `Status: ${isOn ? '🔆 Hidup' : '🌑 Mati'}`;
            toggleLabel.textContent = isOn ? 'Matikan' : 'Nyalakan';

            toggleBtn.classList.toggle('btn-on', isOn);
            toggleBtn.classList.toggle('btn-off', !isOn);
        })
        .catch(err => console.warn(`❌ Gagal ambil status ${device}:`, err));
}

function toggleDevice(button) {
    const card = button.closest('.device-control');
    const device = card?.dataset.device;
    const toggleLabel = card?.querySelector('.device-toggle-text');
    const newState = toggleLabel?.textContent.toLowerCase().includes('matikan') ? 'off' : 'on';

    if (!device || !newState) return;

    fetch(`/api/${device}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newState })
    }).then(() => fetchDeviceStatus(device));
}

/* ===== INIT ===== */
function refreshAll() {
    DEVICES.forEach(fetchDeviceStatus);
    fetchTemp();
    fetchDataKandang();
}

function setupEventListeners() {
    document.querySelectorAll('.device-toggle-btn').forEach(button => {
        button.addEventListener('click', () => toggleDevice(button));
    });
}

// Inisialisasi
setupEventListeners();
refreshAll();
setInterval(refreshAll, 5000);


  function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    document.getElementById('digital-clock').textContent = timeString;
  }

  setInterval(updateClock, 1000);
  updateClock(); // update segera saat halaman dimuat

