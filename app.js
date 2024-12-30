// Initialize PDF.js with proper configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Use a reliable PDF URL
const SAMPLE_PDF = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
// Alternative backup URLs if needed:
// const SAMPLE_PDF = 'https://arxiv.org/pdf/2212.08011.pdf';
// const SAMPLE_PDF = 'https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf';

const APP_VERSION = '1.7.0';

// Add changelog for tracking updates
const CHANGELOG = {
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

// Initialize error handler at the start of the file, after the changelog
const errorHandler = new ErrorHandler();

// Update the ErrorHandler class with improved functionality
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

class QRScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.output = document.getElementById('output');
        this.imageInput = document.getElementById('imageInput');
        this.scanning = false;
        this.currentStream = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Select image button
        document.getElementById('selectImage').addEventListener('click', () => {
            this.imageInput.removeAttribute('capture');
            this.imageInput.click();
        });

        // Take photo button - use native camera
        document.getElementById('takePhoto').addEventListener('click', () => {
            if (this.currentStream) {
                this.stopCamera();
            } else {
                // For mobile devices, use native camera
                if (this.isMobile()) {
                    this.openNativeCamera();
                } else {
                    this.startCamera(); // For desktop, use web camera
                }
            }
        });

        // Handle file selection or photo capture
        this.imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                // Show loading state
                this.output.textContent = 'Processing image...';
                
                try {
                    await this.processImage(file);
                    // Add visual feedback for successful processing
                    this.output.textContent = 'Image processed. Scanning for QR code...';
                } catch (err) {
                    this.output.textContent = 'Error processing image. Please try again.';
                    console.error('Error:', err);
                }
            }
            // Reset input to allow selecting the same file again
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
                this.processImage(file);
            }
        });
    }

    isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    async processImage(file) {
        try {
            // Show processing state
            const container = document.querySelector('.camera-container');
            container.classList.add('processing');
            this.output.textContent = 'Processing image...';

            const image = await this.loadImage(file);
            
            // Try multiple detection strategies
            const code = await this.detectQRCodeWithStrategies(image);

            if (code) {
                this.output.textContent = `QR Code detected: ${code.data}`;
                if (code.data.toLowerCase().endsWith('.pdf')) {
                    pdfViewer.loadPDF(code.data);
                } else {
                    pdfViewer.loadPDF(SAMPLE_PDF);
                }
                
                container.classList.remove('processing');
                this.showSuccessAnimation();
            } else {
                errorHandler.showError('No QR code found. Please try again with a clearer photo.');
                container.classList.remove('processing');
            }
        } catch (err) {
            console.error('Error processing image:', err);
            errorHandler.showError('Error processing image. Please try again with a clearer photo.');
            document.querySelector('.camera-container').classList.remove('processing');
        }
    }

    async detectQRCodeWithStrategies(image) {
        // Define multiple processing strategies
        const strategies = [
            // Original size
            { scale: 1.0, brightness: 0, contrast: 100 },
            // Larger size
            { scale: 1.5, brightness: 0, contrast: 100 },
            // Smaller size
            { scale: 0.8, brightness: 0, contrast: 100 },
            // Brightness adjustments
            { scale: 1.0, brightness: 30, contrast: 100 },
            { scale: 1.0, brightness: -30, contrast: 100 },
            // Contrast adjustments
            { scale: 1.0, brightness: 0, contrast: 150 },
            { scale: 1.0, brightness: 0, contrast: 75 },
            // Combined adjustments
            { scale: 1.2, brightness: 20, contrast: 120 },
            { scale: 0.9, brightness: -10, contrast: 110 }
        ];

        for (const strategy of strategies) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            // Calculate dimensions
            const width = Math.floor(image.width * strategy.scale);
            const height = Math.floor(image.height * strategy.scale);
            
            // Set canvas size
            tempCanvas.width = width;
            tempCanvas.height = height;

            // Apply image processing
            tempCtx.filter = `brightness(${100 + strategy.brightness}%) contrast(${strategy.contrast}%)`;
            
            // Draw image with current strategy
            tempCtx.drawImage(image, 0, 0, width, height);

            try {
                // Get image data and attempt QR detection
                const imageData = tempCtx.getImageData(0, 0, width, height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "attemptBoth"
                });

                if (code) {
                    return code;
                }
            } catch (err) {
                console.log(`Strategy failed: Scale=${strategy.scale}, Brightness=${strategy.brightness}, Contrast=${strategy.contrast}`);
                continue;
            }
        }

        return null;
    }

    showSuccessAnimation() {
        const container = document.querySelector('.camera-container');
        container.classList.add('success');
        setTimeout(() => {
            container.classList.remove('success');
        }, 1500);
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const image = new Image();
                image.onload = () => {
                    // Normalize image orientation
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set proper dimensions
                    canvas.width = image.width;
                    canvas.height = image.height;
                    
                    // Draw and export normalized image
                    ctx.drawImage(image, 0, 0);
                    const normalizedImage = new Image();
                    normalizedImage.onload = () => resolve(normalizedImage);
                    normalizedImage.src = canvas.toDataURL('image/jpeg', 1.0);
                };
                image.onerror = reject;
                image.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    openNativeCamera() {
        // Force environment camera (back camera) for better QR scanning
        this.imageInput.setAttribute('capture', 'environment');
        this.imageInput.setAttribute('accept', 'image/*');
        this.output.textContent = 'Opening camera...';
        this.imageInput.click();
    }

    async startCamera() {
        // Check if running on mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            this.openNativeCamera();
        } else {
            // Use web camera for desktop
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                this.setupStream(stream);
            } catch (err) {
                console.error('Error accessing camera:', err);
                this.handleCameraError(err);
            }
        }
    }

    handleCameraError(err) {
        let errorMessage = 'Error accessing camera. ';
        
        switch (err.name) {
            case 'NotAllowedError':
                errorMessage += 'Please grant camera permissions.';
                break;
            case 'NotFoundError':
                errorMessage += 'No camera found on your device.';
                break;
            case 'NotReadableError':
                errorMessage += 'Camera is already in use by another application.';
                break;
            case 'SecurityError':
                errorMessage += 'Camera access blocked. Please use HTTPS.';
                break;
            default:
                errorMessage += err.message;
        }
        
        errorHandler.showError(errorMessage);
    }

    setupStream(stream) {
        this.currentStream = stream;
        this.video.srcObject = stream;
        
        // Handle video orientation changes
        if ('orientation' in window) {
            window.addEventListener('orientationchange', () => {
                // Brief timeout to let orientation change complete
                setTimeout(() => {
                    this.adjustVideoOrientation();
                }, 200);
            });
        }

        this.video.onloadedmetadata = () => {
            this.video.play();
            this.scanning = true;
            this.adjustVideoOrientation();
            this.scan();
            
            this.output.textContent = 'Scanning for QR code...';
            document.getElementById('startCamera').textContent = 'Stop Camera';
        };
    }

    adjustVideoOrientation() {
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        if (isPortrait) {
            this.video.style.transform = 'scaleX(-1) rotate(0deg)';
        } else {
            this.video.style.transform = 'scaleX(-1) rotate(0deg)';
        }
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
            this.video.srcObject = null;
            this.scanning = false;
            this.output.textContent = 'Camera stopped';
            document.getElementById('startCamera').textContent = 'Start Camera';
        }
    }

    scan() {
        if (!this.scanning) return;

        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                this.output.textContent = `QR Code detected: ${code.data}`;
                
                // Try to load the QR code URL if it's a PDF
                if (code.data.toLowerCase().endsWith('.pdf')) {
                    pdfViewer.loadPDF(code.data);
                } else {
                    // If not a PDF URL, load the sample PDF
                    pdfViewer.loadPDF(SAMPLE_PDF);
                }
                
                // Stop the camera after successful scan
                this.stopCamera();
                return;
            }
        }
        requestAnimationFrame(() => this.scan());
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