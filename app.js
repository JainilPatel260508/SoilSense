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

    // 2. Upload button interaction (Simulation)
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.addEventListener('click', () => {
        alert('File upload dialog goes here! Later, this will send CSV data to our Python backend.');
    });
});
