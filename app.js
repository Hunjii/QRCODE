// Initialize PDF.js with proper configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Use a reliable PDF URL
const SAMPLE_PDF = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
// Alternative backup URLs if needed:
// const SAMPLE_PDF = 'https://arxiv.org/pdf/2212.08011.pdf';
// const SAMPLE_PDF = 'https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf';

const APP_VERSION = '2.0.2';

// Define ErrorHandler class first
class ErrorHandler {
    constructor() {
        this.modal = document.getElementById('errorModal');
        this.messageEl = document.getElementById('errorMessage');
        this.setupListeners();
    }

    setupListeners() {
        // Close button
        document.querySelector('.error-close').addEventListener('click', () => {
            this.hideError();
        });

        // OK button
        document.getElementById('errorOkButton').addEventListener('click', () => {
            this.hideError();
        });

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideError();
            }
        });

        // Handle Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.hideError();
            }
        });
    }

    showError(message, duration = 0) {
        this.messageEl.textContent = message;
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Auto-hide after duration (if specified)
        if (duration > 0) {
            setTimeout(() => this.hideError(), duration);
        }
    }

    hideError() {
        this.modal.classList.add('fade-out');
        setTimeout(() => {
            this.modal.style.display = 'none';
            this.modal.classList.remove('fade-out');
            document.body.style.overflow = 'auto';
        }, 300);
    }
}

// Initialize error handler after class definition
const errorHandler = new ErrorHandler();

// Add changelog for tracking updates
const CHANGELOG = {
    '2.0.2': [
        'Fixed QR Scanner worker path',
        'Improved camera initialization',
        'Better error handling',
        'Enhanced mobile compatibility'
    ],
    '2.0.1': [
        'Fixed camera access issues',
        'Added better camera error handling',
        'Improved camera initialization',
        'Enhanced permission handling'
    ],
    '2.0.0': [
        'Switched to QR Scanner library',
        'Improved scanning reliability',
        'Better camera handling',
        'Enhanced QR detection'
    ],
    '1.9.2': [
        'Fixed native camera access',
        'Improved camera error handling',
        'Better mobile camera support',
        'Enhanced scanning reliability'
    ],
    '1.9.1': [
        'Fixed error handler initialization',
        'Improved code organization',
        'Better error handling stability',
        'Enhanced initialization sequence'
    ],
    '1.9.0': [
        'Added real-time QR scanning',
        'Improved camera handling',
        'Added scanning guide overlay',
        'Better scanning feedback'
    ],
    '1.8.0': [
        'Fixed QR code scanning from photos',
        'Added multi-orientation detection',
        'Improved image processing',
        'Better mobile camera handling'
    ],
    '1.7.0': [
        'Improved error modal functionality',
        'Added error modal animations',
        'Enhanced mobile error display',
        'Better error handling and feedback'
    ],
    '1.6.0': [
        'Improved QR code detection reliability',
        'Added multiple image processing strategies',
        'Enhanced image quality handling',
        'Better handling of camera captures'
    ],
    '1.5.0': [
        'Added error modal for better error handling',
        'Improved error messages and feedback',
        'Added animated error notifications',
        'Enhanced mobile error display'
    ],
    '1.4.0': [
        'Improved QR code detection from camera photos',
        'Added multiple detection strategies',
        'Enhanced image processing with brightness adjustment',
        'Better feedback during photo processing'
    ],
    '1.3.0': [
        'Added native camera support for mobile devices',
        'Improved QR code detection with multi-scale scanning',
        'Added success animation feedback',
        'Enhanced image processing capabilities'
    ],
    '1.2.0': [
        'Added image upload functionality',
        'Added drag and drop support',
        'New UI with improved buttons',
        'Support for selecting images from device'
    ],
    '1.1.0': [
        'Improved mobile camera handling',
        'Added auto-focus and exposure optimization',
        'Better orientation support',
        'Enhanced error messages'
    ],
    '1.0.0': [
        'Initial release',
        'Basic QR code scanning',
        'PDF viewing capability'
    ]
};

class QRScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.output = document.getElementById('output');
        this.imageInput = document.getElementById('imageInput');
        this.scanning = false;
        this.qrScanner = null;
        
        // Initialize QR Scanner with options
        QrScanner.WORKER_PATH = 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner-worker.min.js';
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Select image button
        document.getElementById('selectImage').addEventListener('click', () => {
            this.imageInput.click();
        });

        // Take photo button
        document.getElementById('takePhoto').addEventListener('click', () => {
            if (this.scanning) {
                this.stopCamera();
            } else {
                this.startCamera();
            }
        });

        // Handle file selection
        this.imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processFile(file);
            }
            this.imageInput.value = '';
        });

        // Setup drag and drop
        const container = document.querySelector('.camera-container');
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.classList.add('dragging');
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('dragging');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('dragging');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processFile(file);
            }
        });
    }

    async startCamera() {
        try {
            // Create QR Scanner instance if not exists
            if (!this.qrScanner) {
                this.qrScanner = new QrScanner(
                    this.video,
                    result => this.handleScanResult(result),
                    {
                        preferredCamera: 'environment', // Prefer back camera
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        maxScansPerSecond: 5,
                        returnDetailedScanResult: true
                    }
                );
            }

            // Check for camera permissions
            const hasCamera = await QrScanner.hasCamera();
            if (!hasCamera) {
                throw new Error('No camera found on this device');
            }

            await this.qrScanner.start();
            this.scanning = true;
            
            // Update UI
            this.video.style.display = 'block';
            this.video.classList.add('active');
            document.querySelector('.camera-container').classList.add('scanning');
            document.getElementById('takePhoto').innerHTML = '<i class="fas fa-stop"></i> Stop Camera';
            this.output.textContent = 'Scanning for QR code...';
            
        } catch (err) {
            console.error('Camera error:', err);
            let errorMessage = 'Could not access camera. ';
            
            if (err.name === 'NotAllowedError') {
                errorMessage += 'Please grant camera permissions.';
            } else if (err.name === 'NotFoundError') {
                errorMessage += 'No camera found on your device.';
            } else if (err.name === 'NotReadableError') {
                errorMessage += 'Camera is already in use.';
            } else {
                errorMessage += 'Please check permissions and try again.';
            }
            
            errorHandler.showError(errorMessage);
        }
    }

    stopCamera() {
        if (this.qrScanner) {
            this.qrScanner.stop();
            this.scanning = false;
            
            // Reset UI
            this.video.style.display = 'none';
            this.video.classList.remove('active');
            document.querySelector('.camera-container').classList.remove('scanning');
            document.getElementById('takePhoto').innerHTML = '<i class="fas fa-camera"></i> Take Photo';
            this.output.textContent = 'Camera stopped';
        }
    }

    async processFile(file) {
        try {
            const container = document.querySelector('.camera-container');
            container.classList.add('processing');
            this.output.textContent = 'Processing image...';

            const result = await QrScanner.scanImage(file, {
                returnDetailedScanResult: true
            });

            if (result) {
                this.handleScanResult(result);
            } else {
                errorHandler.showError('No QR code found. Please try another image.');
            }
        } catch (err) {
            console.error('Processing error:', err);
            errorHandler.showError('Error processing image. Please try again.');
        } finally {
            document.querySelector('.camera-container').classList.remove('processing');
        }
    }

    handleScanResult(result) {
        this.output.textContent = `QR Code detected: ${result.data}`;
        
        if (result.data.toLowerCase().endsWith('.pdf')) {
            pdfViewer.loadPDF(result.data);
        } else {
            pdfViewer.loadPDF(SAMPLE_PDF);
        }
        
        this.showSuccessAnimation();
        if (this.scanning) {
            this.stopCamera();
        }
    }

    showSuccessAnimation() {
        const container = document.querySelector('.camera-container');
        container.classList.add('success');
        setTimeout(() => {
            container.classList.remove('success');
        }, 1500);
    }
}

class PDFViewer {
    constructor() {
        this.pdfDoc = null;
        this.pageNum = 1;
        this.canvas = document.getElementById('pdfCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.pageNumSpan = document.getElementById('pageNum');
        this.pageCountSpan = document.getElementById('pageCount');
        this.modal = document.getElementById('pdfModal');
        
        this.setupControls();
        this.setupModal();
    }

    setupControls() {
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
    }

    setupModal() {
        // Close button functionality
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });

        // Handle keyboard events
        document.addEventListener('keydown', (event) => {
            if (this.modal.style.display === 'block') {
                if (event.key === 'Escape') {
                    this.closeModal();
                } else if (event.key === 'ArrowLeft') {
                    this.prevPage();
                } else if (event.key === 'ArrowRight') {
                    this.nextPage();
                }
            }
        });
    }

    openModal() {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async loadPDF(url) {
        try {
            // Show loading state
            this.openModal(); // Open modal immediately
            this.canvas.style.opacity = '0.5';
            this.pageNumSpan.textContent = 'Loading...';
            this.pageCountSpan.textContent = '';
            
            // Try to load the PDF
            const loadingTask = pdfjsLib.getDocument(url);
            
            // Add loading progress
            loadingTask.onProgress = (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(0);
                this.pageNumSpan.textContent = `Loading: ${percent}%`;
            };
            
            this.pdfDoc = await loadingTask.promise;
            
            // Update UI
            this.pageCountSpan.textContent = this.pdfDoc.numPages;
            await this.renderPage(1);
            this.canvas.style.opacity = '1';
            
        } catch (err) {
            console.error('Error loading PDF:', err);
            this.canvas.style.opacity = '1';
            this.pageNumSpan.textContent = 'Error';
            this.pageCountSpan.textContent = '';
            
            // Show more specific error message
            let errorMessage = 'Failed to load PDF. ';
            if (err.name === 'MissingPDFException') {
                errorMessage += 'The PDF file could not be found.';
            } else if (err.name === 'InvalidPDFException') {
                errorMessage += 'This is not a valid PDF file.';
            } else if (err.name === 'UnexpectedResponseException') {
                errorMessage += 'Failed to fetch the PDF file. Please check your internet connection.';
            }
            alert(errorMessage);
        }
    }

    async renderPage(num) {
        try {
            const page = await this.pdfDoc.getPage(num);
            
            // Calculate scale to fit the canvas width
            const viewport = page.getViewport({ scale: 1 });
            const scale = this.canvas.offsetWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });
            
            // Update canvas size
            this.canvas.height = scaledViewport.height;
            this.canvas.width = scaledViewport.width;

            await page.render({
                canvasContext: this.ctx,
                viewport: scaledViewport
            }).promise;

            this.pageNum = num;
            this.pageNumSpan.textContent = num;
        } catch (err) {
            console.error('Error rendering page:', err);
            alert('Error rendering PDF page. Please try again.');
        }
    }

    prevPage() {
        if (this.pageNum <= 1) return;
        this.renderPage(this.pageNum - 1);
    }

    nextPage() {
        if (this.pageNum >= this.pdfDoc.numPages) return;
        this.renderPage(this.pageNum + 1);
    }
}

// Initialize classes
const qrScanner = new QRScanner();
const pdfViewer = new PDFViewer();

// Event listeners
document.getElementById('startCamera').addEventListener('click', () => {
    if (qrScanner.currentStream) {
        qrScanner.stopCamera();
    } else {
        qrScanner.startCamera();
    }
});

// Add sample PDF viewer button
document.getElementById('viewSample').addEventListener('click', () => {
    pdfViewer.loadPDF(SAMPLE_PDF);
});

// Update version display
document.querySelector('.version-info span').textContent = `Version ${APP_VERSION}`; 