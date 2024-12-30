// Initialize PDF.js with proper configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Use a reliable PDF URL
const SAMPLE_PDF = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
// Alternative backup URLs if needed:
// const SAMPLE_PDF = 'https://arxiv.org/pdf/2212.08011.pdf';
// const SAMPLE_PDF = 'https://www.adobe.com/content/dam/acom/en/devnet/pdf/pdfs/PDF32000_2008.pdf';

const APP_VERSION = '1.2.0';

// Add changelog for tracking updates
const CHANGELOG = {
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
        this.currentStream = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Select image button
        document.getElementById('selectImage').addEventListener('click', () => {
            this.imageInput.click();
        });

        // Take photo button
        document.getElementById('takePhoto').addEventListener('click', () => {
            if (this.currentStream) {
                this.stopCamera();
            } else {
                this.startCamera();
            }
        });

        // Handle file selection
        this.imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processImage(file);
            }
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

    async processImage(file) {
        try {
            const image = await this.loadImage(file);
            this.canvas.width = image.width;
            this.canvas.height = image.height;
            this.ctx.drawImage(image, 0, 0);

            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                this.output.textContent = `QR Code detected: ${code.data}`;
                if (code.data.toLowerCase().endsWith('.pdf')) {
                    pdfViewer.loadPDF(code.data);
                } else {
                    pdfViewer.loadPDF(SAMPLE_PDF);
                }
            } else {
                this.output.textContent = 'No QR code found in the image.';
            }
        } catch (err) {
            console.error('Error processing image:', err);
            this.output.textContent = 'Error processing image. Please try again.';
        }
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async startCamera() {
        try {
            // Check if running on mobile
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                // For mobile devices, try to use the native camera app if possible
                const constraints = {
                    video: {
                        facingMode: { ideal: 'environment' }, // Prefer back camera
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        // Add advanced mobile constraints
                        aspectRatio: { ideal: 1.7777777778 },
                        frameRate: { ideal: 30 },
                        // Enable auto-focus and auto-exposure
                        focusMode: { ideal: 'continuous' },
                        exposureMode: { ideal: 'continuous' },
                        // Optimize for QR scanning
                        whiteBalanceMode: { ideal: 'continuous' }
                    }
                };

                try {
                    // First try to get the back camera
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            ...constraints.video,
                            facingMode: { exact: 'environment' } // Force back camera
                        }
                    });
                    this.setupStream(stream);
                } catch (err) {
                    console.log('Back camera failed, trying any available camera:', err);
                    // If back camera fails, try any camera
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    this.setupStream(stream);
                }
            } else {
                // For desktop, use simpler constraints
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                this.setupStream(stream);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            
            // More detailed error messages
            if (err.name === 'NotAllowedError') {
                this.output.textContent = 'Camera access denied. Please grant camera permissions.';
            } else if (err.name === 'NotFoundError') {
                this.output.textContent = 'No camera found on your device.';
            } else if (err.name === 'NotReadableError') {
                this.output.textContent = 'Camera is already in use by another application.';
            } else if (err.name === 'SecurityError') {
                this.output.textContent = 'Camera access blocked. Please use HTTPS.';
            } else {
                this.output.textContent = `Error accessing camera: ${err.message}`;
            }
        }
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