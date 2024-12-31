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
        // First check if we have cameras available
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
            throw new Error('No camera found on this device');
        }

        // Get available cameras
        const cameras = await QrScanner.listCameras(true);
        
        qrScanner = new QrScanner(
            video,
            result => handleScanResult(result),
            {
                highlightScanRegion: true,
                highlightCodeOutline: true,
                // Prefer environment camera if available (back camera)
                preferredCamera: 'environment'
            }
        );

        // Try to start the scanner to test permissions
        await qrScanner.start();
        // If successful, stop it until user clicks start
        qrScanner.stop();
        
    } catch (error) {
        console.error('Scanner initialization error:', error);
        let errorMessage = 'Could not initialize QR scanner. ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Please grant camera permission.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
            errorMessage += 'Camera is already in use.';
        } else if (error.name === 'SecurityError') {
            errorMessage += 'Camera access is blocked. Please use HTTPS or localhost.';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }
        
        alert(errorMessage);
        throw error;
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
    try {
        if (!qrScanner) {
            await initializeScanner();
        }
        await qrScanner.start();
        startButton.disabled = true;
        stopButton.disabled = false;
    } catch (error) {
        console.error('Failed to start scanner:', error);
    }
});

stopButton.addEventListener('click', () => {
    if (qrScanner) {
        qrScanner.stop();
        startButton.disabled = false;
        stopButton.disabled = true;
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
document.addEventListener('DOMContentLoaded', async () => {
    stopButton.disabled = true; // Initially disable stop button
    try {
        await initializeScanner();
    } catch (error) {
        startButton.disabled = true;
        console.error('Failed to initialize scanner:', error);
    }
}); 