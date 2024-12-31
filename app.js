let qrScanner = null;

// DOM Elements
const video = document.getElementById('video');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const modal = document.getElementById('pdfModal');
const closeBtn = document.querySelector('.close');
const pdfViewer = document.getElementById('pdf-viewer');

// Initialize QR Scanner
async function initializeScanner() {
    try {
        qrScanner = new QrScanner(
            video,
            result => handleScanResult(result),
            {
                highlightScanRegion: true,
                highlightCodeOutline: true,
            }
        );
    } catch (error) {
        console.error('Failed to initialize scanner:', error);
        alert('Could not initialize QR scanner. Please check camera permissions.');
    }
}

// Handle scan results
function handleScanResult(result) {
    const url = result.data;
    
    // Check if the URL ends with .pdf
    if (url.toLowerCase().endsWith('.pdf')) {
        pdfViewer.src = url;
        modal.style.display = 'block';
        qrScanner.stop(); // Stop scanning when PDF is found
    } else {
        alert('Please scan a QR code containing a PDF link');
    }
}

// Event Listeners
startButton.addEventListener('click', async () => {
    if (!qrScanner) {
        await initializeScanner();
    }
    qrScanner.start();
});

stopButton.addEventListener('click', () => {
    if (qrScanner) {
        qrScanner.stop();
    }
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    pdfViewer.src = ''; // Clear the current PDF
    qrScanner.start(); // Resume scanning
});

// Close modal when clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
        pdfViewer.src = ''; // Clear the current PDF
        qrScanner.start(); // Resume scanning
    }
});

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', initializeScanner); 