// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class QRScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.output = document.getElementById('output');
        this.scanning = false;
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            this.video.srcObject = stream;
            this.video.play();
            this.scanning = true;
            this.scan();
        } catch (err) {
            console.error('Error accessing camera:', err);
            this.output.textContent = 'Error accessing camera. Please ensure camera permissions are granted.';
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
                this.scanning = false;
                this.output.textContent = `QR Code detected: ${code.data}`;
                // For testing: Use a sample PDF regardless of QR code content
                const samplePdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
                pdfViewer.loadPDF(samplePdfUrl);
                // Comment out the original condition
                // if (code.data.toLowerCase().endsWith('.pdf')) {
                //     pdfViewer.loadPDF(code.data);
                // }
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
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
    }

    async loadPDF(url) {
        try {
            const loadingTask = pdfjsLib.getDocument(url);
            this.pdfDoc = await loadingTask.promise;
            this.pageCountSpan.textContent = this.pdfDoc.numPages;
            this.renderPage(1);
        } catch (err) {
            console.error('Error loading PDF:', err);
        }
    }

    async renderPage(num) {
        const page = await this.pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: 1.5 });
        
        this.canvas.height = viewport.height;
        this.canvas.width = viewport.width;

        await page.render({
            canvasContext: this.ctx,
            viewport: viewport
        }).promise;

        this.pageNum = num;
        this.pageNumSpan.textContent = num;
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
    qrScanner.startCamera();
}); 