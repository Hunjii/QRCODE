class DocumentScanner {
    constructor() {
        this.capturedImages = [];
        this.stream = null;
        this.initializeElements();
        this.addEventListeners();
    }

    initializeElements() {
        this.cameraView = document.getElementById('camera-view');
        this.startButton = document.getElementById('start-camera');
        this.captureButton = document.getElementById('capture-image');
        this.generatePdfButton = document.getElementById('generate-pdf');
        this.imageGallery = document.getElementById('image-gallery');
    }

    addEventListeners() {
        this.startButton.addEventListener('click', () => this.startCamera());
        this.captureButton.addEventListener('click', () => this.captureImage());
        this.generatePdfButton.addEventListener('click', () => this.generatePDF());
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            this.cameraView.srcObject = this.stream;
            this.startButton.disabled = true;
            this.captureButton.disabled = false;
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Error accessing camera. Please make sure you have granted camera permissions.');
        }
    }

    captureImage() {
        const canvas = document.createElement('canvas');
        canvas.width = this.cameraView.videoWidth;
        canvas.height = this.cameraView.videoHeight;
        canvas.getContext('2d').drawImage(this.cameraView, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg');
        this.addImageToGallery(imageData);
    }

    addImageToGallery(imageData) {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = imageData;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-btn';
        removeButton.innerHTML = '×';
        removeButton.addEventListener('click', () => {
            this.capturedImages = this.capturedImages.filter(img => img !== imageData);
            galleryItem.remove();
            this.updateGeneratePdfButton();
        });

        galleryItem.appendChild(img);
        galleryItem.appendChild(removeButton);
        this.imageGallery.appendChild(galleryItem);

        this.capturedImages.push(imageData);
        this.updateGeneratePdfButton();
    }

    updateGeneratePdfButton() {
        this.generatePdfButton.disabled = this.capturedImages.length === 0;
    }

    async generatePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        for (let i = 0; i < this.capturedImages.length; i++) {
            if (i > 0) {
                doc.addPage();
            }
            
            const img = this.capturedImages[i];
            const imgProps = doc.getImageProperties(img);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            doc.addImage(img, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        doc.save('scanned_document.pdf');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentScanner();
}); 