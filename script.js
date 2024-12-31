document.addEventListener('DOMContentLoaded', function() {
    const APP_CONFIG = {
        version: '1.0.0',
        lastUpdated: '2024-03-20' // Update this whenever you make changes
    };

    // Update version display
    document.getElementById('version').textContent = `Version ${APP_CONFIG.version}`;
    document.getElementById('lastUpdated').textContent = `Last Updated: ${APP_CONFIG.lastUpdated}`;

    const html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", 
        { 
            fps: 10,
            qrbox: { width: 250, height: 250 }
        }
    );

    const modal = document.getElementById("pdfModal");
    const closeBtn = document.getElementsByClassName("close")[0];
    const resultDiv = document.getElementById("result");
    const pdfViewer = document.getElementById("pdfViewer");

    function onScanSuccess(decodedText) {
        // Check if the scanned URL ends with .pdf
        if (decodedText.toLowerCase().endsWith('.pdf')) {
            resultDiv.style.display = "block";
            resultDiv.innerHTML = `<p>PDF detected: ${decodedText}</p>`;
            
            // Set the PDF URL to the iframe
            pdfViewer.src = decodedText;
            
            // Show the modal
            modal.style.display = "block";
        } else {
            resultDiv.style.display = "block";
            resultDiv.innerHTML = "<p>Error: The scanned QR code does not contain a PDF link.</p>";
        }
    }

    function onScanError(error) {
        console.warn(`QR Code scan error: ${error}`);
    }

    // Start QR scanner
    html5QrcodeScanner.render(onScanSuccess, onScanError);

    // Close modal when clicking the close button
    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    // Close modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}); 