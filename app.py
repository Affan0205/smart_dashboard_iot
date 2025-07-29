import network
import time
import _thread
from utime import localtime
from microdot import Microdot, send_file
from machine import Pin, ADC
from bme_module import BME280Module
import urequests

# === Konstanta ===
SSID = "BOE-"
PASSWORD = ""
DEVICE_THRESHOLDS = {
    "lamp_on": 40000,
    "lamp_off": 30000,
    "temp_max": 30
}

# === Inisialisasi Perangkat Keras ===
sda = Pin(21)
scl = Pin(22)
pinADC = ADC(34)
bme = BME280Module(0, scl, sda)

buzzer = Pin(27, Pin.OUT)
led = Pin(19, Pin.OUT)

devices = {
    "kipas":   {"pin": Pin(12, Pin.OUT), "status": "off"},
    "lamp":    {"pin": Pin(13, Pin.OUT), "status": "off"},
    "pemanas": {"pin": Pin(14, Pin.OUT), "status": "off"},
    "pompa":   {"pin": Pin(15, Pin.OUT), "status": "off"},
    "pakan":   {"pin": Pin(2,  Pin.OUT), "status": "off"}
}

# === Riwayat Data Sensor (max 20 entri) ===
temp_history = []
humi_history = []
pressure_history = []

def save_history(suhu, kelembapan, tekanan):
    now = localtime()
    label = f"{now[3]:02d}:{now[4]:02d}"
    if len(temp_history) >= 20:
        temp_history.pop(0)
        humi_history.pop(0)
        pressure_history.pop(0)
    temp_history.append((label, suhu))
    humi_history.append((label, kelembapan))
    pressure_history.append((label, tekanan))

# === Koneksi Wi-Fi ===
def connect_wifi(ssid, password):
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(ssid, password)
    print("🔌 Menghubungkan ke Wi-Fi...")
    while not wlan.isconnected():
        time.sleep(1)
    ip = wlan.ifconfig()[0]
    print("✅ Terhubung! IP:", ip)
    return ip

ip_address = connect_wifi(SSID, PASSWORD)

# === Buzzer Otomatis (Thread) ===
buzzer_active = False
def buzzer_loop():
    global buzzer_active
    while True:
        buzzer.value(buzzer_active)
        time.sleep(0.5 if buzzer_active else 0.1)

_thread.start_new_thread(buzzer_loop, ())

# === Kontrol Otomatis Lampu Berdasarkan LDR ===
def auto_lamp_control(ldr):
    if ldr > DEVICE_THRESHOLDS["lamp_on"] and devices["lamp"]["status"] == "off":
        devices["lamp"]["pin"].on()
        devices["lamp"]["status"] = "on"
    elif ldr < DEVICE_THRESHOLDS["lamp_off"] and devices["lamp"]["status"] == "on":
        devices["lamp"]["pin"].off()
        devices["lamp"]["status"] = "off"

# === Penjumlahan Data dari List JSON ===
def sum_fields(data_list, fields):
    total = {field: 0 for field in fields}
    for item in data_list:
        for field in fields:
            try:
                total[field] += int(item.get(field, 0))
            except:
                pass
    return total

# === Ambil Data dari API Eksternal ===
def get_kandang_data():
    try:
        print("📡 Mengambil data kandang...")
        response = urequests.get("http://192.168.57.147:5000/api/kandang", headers={"Connection": "close"})
        if response.status_code == 200:
            json_data = response.json()
            response.close()
            if isinstance(json_data, list) and len(json_data) > 0:
                return sum_fields(json_data, ['ayam', 'pakan', 'air'])
            elif isinstance(json_data, dict):
                return json_data
            else:
                return {"ayam": "-", "pakan": "-", "air": "-"}
        else:
            print("⚠️ Gagal fetch kandang:", response.status_code)
            response.close()
            return {"ayam": "-", "pakan": "-", "air": "-"}
    except Exception as e:
        print("❌ Error koneksi kandang:", e)
        return {"ayam": "-", "pakan": "-", "air": "-"}

# === Web Server Microdot ===
app = Microdot()

@app.route('/')
def index(request):
    return send_file('templates/index.html')

@app.route('/static/<filename>')
def static_files(request, filename):
    return send_file(f'static/{filename}')

@app.route('/api/temp')
def api_temp(request):
    global buzzer_active

    temp, pressure, humi, altitude = bme.get_sensor_readings()
    suhu = round(temp, 1)
    tekanan = round(pressure, 1)
    kelembapan = round(humi, 1)
    altitude = round(altitude, 1)
    ldr = pinADC.read_u16()

    buzzer_active = suhu > DEVICE_THRESHOLDS["temp_max"]
    auto_lamp_control(ldr)
    save_history(suhu, kelembapan, tekanan)

    return {
        "temperature": suhu,
        "humidity": kelembapan,
        "pressure": tekanan,
        "altitude": altitude,
        "ldr": ldr,
        "lamp_auto": devices["lamp"]["status"]
    }

@app.route('/api/temp-history')
def temp_history_api(request):
    return {
        "labels": [t[0] for t in temp_history],
        "temperature": [t[1] for t in temp_history],
        "humidity": [h[1] for h in humi_history],
        "pressure": [p[1] for p in pressure_history]
    }

@app.route('/api/<device>', methods=['POST'])
def control_device(request, device):
    action = request.json.get('action')
    if device in devices and action in ['on', 'off']:
        devices[device]["pin"].value(1 if action == "on" else 0)
        devices[device]["status"] = action
        return {"device": device, "status": action}
    return {"error": "Invalid device or action"}, 400

@app.route('/api/<device>/status')
def device_status(request, device):
    if device in devices:
        return {"device": device, "status": devices[device]["status"]}
    return {"error": "Device not found"}, 404

@app.route('/api/kandang')
def api_kandang(request):
    return get_kandang_data()

@app.route('/api/status')
def status_api(request):
    return {
        "status": "online",
        "ip": ip_address,
        "device_count": len(devices)
    }

# === Jalankan Server ===
if __name__ == '__main__':
    app.run(host=ip_address, port=5001, debug=True)
