const ctx = document.getElementById('tempChart').getContext('2d');

// Inisialisasi Chart dengan Konfigurasi
const tempChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [], // Format waktu: ["07:10", "07:11", ...]
    datasets: [
      createDataset('Suhu (°C)', 'rgba(255, 193, 7, 1)', 'rgba(255, 193, 7, 0.2)'),
      createDataset('Kelembapan (%)', 'rgba(54, 162, 235, 1)', 'rgba(54, 162, 235, 0.2)'),
      createDataset('Tekanan (hPa)', 'rgba(255, 99, 132, 1)', 'rgba(255, 99, 132, 0.2)')
    ]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        min: 5,
        max: 45,
        ticks: {
          stepSize: 5,
          color: '#fff'
        },
        title: {
          display: true,
          text: 'Nilai Sensor',
          color: '#fff'
        }
      },
      x: {
        ticks: {
          color: '#fff'
        },
        title: {
          display: true,
          color: '#fff'
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: '#fff'
        }
      }
    }
  }
});

/**
 * Membuat objek dataset untuk Chart.js
 * @param {string} label - Label dataset
 * @param {string} borderColor - Warna garis
 * @param {string} backgroundColor - Warna isi area
 */
function createDataset(label, borderColor, backgroundColor) {
  return {
    label,
    data: [],
    backgroundColor,
    borderColor,
    borderWidth: 2,
    tension: 0.4,
    fill: true,
    pointRadius: 2
  };
}

/**
 * Mengambil dan memperbarui data grafik dari API
 */
async function updateChart() {
  try {
    const res = await fetch('/api/temp-history');
    if (!res.ok) throw new Error(`Gagal Fetch: ${res.statusText}`);

    const { labels, temperature, humidity, pressure } = await res.json();

    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = temperature;
    tempChart.data.datasets[1].data = humidity;
    tempChart.data.datasets[2].data = pressure;

    tempChart.update();
  } catch (err) {
    console.error("❌ Gagal memperbarui grafik:", err);
  }
}

// Panggil saat load awal dan setiap 60 detik
updateChart();
setInterval(updateChart, 60000);
