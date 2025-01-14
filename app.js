class DocumentScanner {
    constructor() {
        this.capturedImages = [];
        this.stream = null;
        this.initializeElements();
        this.addEventListeners();
        this.checkCameraSupport();
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

    async checkCameraSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support camera access. Please try using a modern browser.');
            this.startButton.disabled = true;
            return false;
        }
        return true;
    }

    async startCamera() {
        try {
            // Stop any existing stream
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            // Try to get available video devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            // Configure constraints based on available devices
            let constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            // If there are multiple cameras, try to use the back camera
            if (videoDevices.length > 1) {
                const backCamera = videoDevices.find(device => 
                    device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('rear')
                );
                
                if (backCamera) {
                    constraints.video.deviceId = { exact: backCamera.deviceId };
                }
            }

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Set up video stream
            this.cameraView.srcObject = this.stream;
            await this.cameraView.play();  // Ensure video is playing
            
            // Enable/disable buttons
            this.startButton.disabled = true;
            this.captureButton.disabled = false;

        } catch (error) {
            console.error('Camera access error:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Error accessing camera. ';
            
            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage += 'Please grant camera permissions in your browser settings.';
                    break;
                case 'NotFoundError':
                    errorMessage += 'No camera device found.';
                    break;
                case 'NotReadableError':
                    errorMessage += 'Camera is already in use by another application.';
                    break;
                case 'OverconstrainedError':
                    errorMessage += 'Camera does not meet the required constraints.';
                    break;
                default:
                    errorMessage += 'Please check your camera and try again.';
            }

            alert(errorMessage);
            
            // Reset buttons
            this.startButton.disabled = false;
            this.captureButton.disabled = true;
        }
    }

    captureImage() {
        try {
            const canvas = document.createElement('canvas');
            // Ensure we have valid video dimensions
            const width = this.cameraView.videoWidth;
            const height = this.cameraView.videoHeight;
            
            if (!width || !height) {
                throw new Error('Video stream not ready');
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.cameraView, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            this.addImageToGallery(imageData);
        } catch (error) {
            console.error('Error capturing image:', error);
            alert('Failed to capture image. Please try again.');
        }
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