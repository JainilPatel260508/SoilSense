document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Chart.js for data visualization
    const ctx = document.getElementById('soilChart').getContext('2d');

    // Mock Data for NPK (Nitrogen, Phosphorus, Potassium) Trends
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const nitrogenData = [95, 98, 100, 102, 105, 104, 105];
    const phosphorusData = [40, 42, 43, 45, 44, 46, 45];
    const potassiumData = [35, 36, 38, 39, 40, 41, 40];

    // Chart Configuration
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Nitrogen (N) mg/kg',
                    data: nitrogenData,
                    borderColor: '#3fb950', // Green
                    backgroundColor: 'rgba(63, 185, 80, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Phosphorus (P) mg/kg',
                    data: phosphorusData,
                    borderColor: '#1f6feb', // Blue
                    backgroundColor: 'rgba(31, 111, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Potassium (K) mg/kg',
                    data: potassiumData,
                    borderColor: '#d29922', // Yellow
                    backgroundColor: 'rgba(210, 153, 34, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#8b949e',
                        font: { family: 'Inter', size: 12 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(22, 27, 34, 0.9)',
                    titleColor: '#e6edf3',
                    bodyColor: '#e6edf3',
                    borderColor: '#30363d',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(48, 54, 61, 0.5)' },
                    ticks: { color: '#8b949e' }
                },
                y: {
                    grid: { color: 'rgba(48, 54, 61, 0.5)' },
                    ticks: { color: '#8b949e' },
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    // 2. Automated Sensor Polling Mock
    const statusText = document.getElementById('sensorStatusText');
    let lastUpdateMsg = '';

    setInterval(() => {
        // Here we simulate fetching from your upcoming Python backend API (e.g., /api/sensor-data)
        // For right now, it just flashes a fetching state.
        statusText.style.opacity = 0.5;
        setTimeout(() => {
            statusText.style.opacity = 1;
            // Update the string to show it's pulling fresh data
            const now = new Date();
            statusText.innerHTML = `Live Sensor Feed: Synced at ${now.getHours()}:${now.getMinutes()}:${now.getSeconds().toString().padStart(2, '0')}`;
        }, 500);
    }, 5000); // Polls every 5 seconds

    // 3. Initialize Climate Chart (Temp, Humidity, Rainfall)
    const climateCtx = document.getElementById('climateChart').getContext('2d');

    // Mock Data for Climate
    const temperatureData = [22, 24, 23, 25, 26, 25, 24]; // Celsius
    const humidityData = [60, 58, 62, 59, 55, 57, 60]; // Percentage
    const rainfallData = [5, 0, 12, 2, 0, 0, 8]; // mm

    new Chart(climateCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatureData,
                    borderColor: '#ff7b72', // Red/Orange
                    backgroundColor: 'rgba(255, 123, 114, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    yAxisID: 'y' // Left axis
                },
                {
                    label: 'Humidity (%)',
                    data: humidityData,
                    borderColor: '#79c0ff', // Light Blue
                    backgroundColor: 'rgba(121, 192, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    yAxisID: 'y' // Left axis
                },
                {
                    type: 'bar',
                    label: 'Rainfall (mm)',
                    data: rainfallData,
                    backgroundColor: 'rgba(31, 111, 235, 0.6)', // Solid Blue
                    borderColor: '#1f6feb',
                    borderWidth: 1,
                    yAxisID: 'y1' // Right axis for different units
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#8b949e', font: { family: 'Inter', size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(22, 27, 34, 0.9)',
                    titleColor: '#e6edf3',
                    bodyColor: '#e6edf3',
                    borderColor: '#30363d',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(48, 54, 61, 0.5)' },
                    ticks: { color: '#8b949e' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(48, 54, 61, 0.5)' },
                    ticks: { color: '#8b949e' },
                    title: { display: true, text: 'Temp (°C) / Humidity (%)', color: '#8b949e' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false }, // only want the grid lines for one axis to show up
                    ticks: { color: '#8b949e' },
                    title: { display: true, text: 'Rainfall (mm)', color: '#8b949e' },
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    // 4. View Toggle Logic (Farmer vs Expert)
    const viewToggle = document.getElementById('viewToggle');
    const farmerView = document.getElementById('farmerView');
    const expertView = document.getElementById('expertView');
    const farmerLabel = document.getElementById('farmerLabel');
    const expertLabel = document.getElementById('expertLabel');

    viewToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            // Expert View (Checked)
            expertView.style.display = 'block';
            farmerView.style.display = 'none';
            expertLabel.classList.add('active');
            farmerLabel.classList.remove('active');
        } else {
            // Farmer View (Unchecked)
            expertView.style.display = 'none';
            farmerView.style.display = 'flex'; // Uses flex for the alert layout
            farmerLabel.classList.add('active');
            expertLabel.classList.remove('active');
        }
    });
});
