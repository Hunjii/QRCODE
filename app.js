class DocumentScanner {
    constructor() {
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
        this.toggleScanButton = document.getElementById('toggle-scan');
        this.imageGallery = document.getElementById('image-gallery');
        
        // Create canvas for QR scanning
        this.canvas = document.createElement('canvas');
        this.canvasContext = this.canvas.getContext('2d');
    }

    addEventListeners() {
        this.startButton.addEventListener('click', () => this.startCamera());
        this.toggleScanButton.addEventListener('click', () => this.toggleQRScanning());
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
            this.toggleScanButton.disabled = false;

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
            this.toggleScanButton.disabled = true;
        }
    }

    startQRScanning() {
        this.scanningQR = true;
        this.scanning = true;
        this.toggleScanButton.textContent = 'Stop Scanning';
        this.scanner-container.classList.add('scanning-qr');
        this.scanQRCode();
    }

    toggleQRScanning() {
        this.scanningQR = !this.scanningQR;
        if (this.scanningQR) {
            this.scanning = true;
            this.toggleScanButton.textContent = 'Stop Scanning';
            this.scanner-container.classList.add('scanning-qr');
            this.scanQRCode();
        } else {
            this.scanning = false;
            this.toggleScanButton.textContent = 'Start Scanning';
            this.scanner-container.classList.remove('scanning-qr');
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
        const qrResult = document.createElement('div');
        qrResult.className = 'qr-result';
        
        const qrData = document.createElement('div');
        qrData.className = 'qr-data';
        qrData.textContent = data;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        qrResult.appendChild(qrData);
        qrResult.appendChild(timestamp);
        galleryItem.appendChild(qrResult);
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-btn';
        removeButton.innerHTML = '×';
        removeButton.addEventListener('click', () => {
            galleryItem.remove();
        });

        galleryItem.appendChild(removeButton);
        this.imageGallery.insertBefore(galleryItem, this.imageGallery.firstChild);

        // Play a success sound or vibrate to indicate successful scan
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentScanner();
}); 