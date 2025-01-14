class DocumentScanner {
    constructor() {
        this.capturedImages = [];
        this.stream = null;
        this.scanning = false;
        this.scanningQR = false;
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
        
        // Create canvas for QR scanning
        this.canvas = document.createElement('canvas');
        this.canvasContext = this.canvas.getContext('2d');
    }

    addEventListeners() {
        this.startButton.addEventListener('click', () => this.startCamera());
        this.captureButton.addEventListener('click', () => {
            if (this.scanningQR) {
                this.toggleQRScanning();
            } else {
                this.captureImage();
            }
        });
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
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            let constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            if (videoDevices.length > 1) {
                const backCamera = videoDevices.find(device => 
                    device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('rear')
                );
                
                if (backCamera) {
                    constraints.video.deviceId = { exact: backCamera.deviceId };
                }
            }

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.cameraView.srcObject = this.stream;
            await this.cameraView.play();

            this.startButton.disabled = true;
            this.captureButton.disabled = false;

            // Start QR scanning
            this.startQRScanning();

        } catch (error) {
            console.error('Camera access error:', error);
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
            this.startButton.disabled = false;
            this.captureButton.disabled = true;
        }
    }

    startQRScanning() {
        this.scanningQR = true;
        this.scanning = true;
        this.scanQRCode();
    }

    toggleQRScanning() {
        this.scanningQR = !this.scanningQR;
        if (this.scanningQR) {
            this.scanning = true;
            this.scanQRCode();
        } else {
            this.scanning = false;
        }
    }

    async scanQRCode() {
        if (!this.scanning || !this.scanningQR) return;

        if (this.cameraView.readyState === this.cameraView.HAVE_ENOUGH_DATA) {
            this.canvas.width = this.cameraView.videoWidth;
            this.canvas.height = this.cameraView.videoHeight;
            this.canvasContext.drawImage(this.cameraView, 0, 0);
            
            const imageData = this.canvasContext.getImageData(
                0, 0, this.canvas.width, this.canvas.height
            );

            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                console.log('Found QR code:', code.data);
                // Handle the QR code data here
                this.handleQRCode(code.data);
                // Optionally pause scanning after finding a code
                this.scanning = false;
                this.scanningQR = false;
                return;
            }
        }

        requestAnimationFrame(() => this.scanQRCode());
    }

    handleQRCode(data) {
        // Create a text element to display the QR code data
        const qrResult = document.createElement('div');
        qrResult.className = 'qr-result';
        qrResult.textContent = `QR Code: ${data}`;
        
        // Add to gallery or handle the data as needed
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.appendChild(qrResult);
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-btn';
        removeButton.innerHTML = '×';
        removeButton.addEventListener('click', () => {
            galleryItem.remove();
        });

        galleryItem.appendChild(removeButton);
        this.imageGallery.appendChild(galleryItem);

        // Alert the user
        alert(`QR Code detected: ${data}`);
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