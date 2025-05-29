// Color mapping for emoji squares
const colorMap = {
    red: '🟥',
    orange: '🟧',
    yellow: '🟨',
    green: '🟩',
    blue: '🟦',
    purple: '🟪',
    black: '⬛️',
    white: '⬜️',
    brown: '🟫'
};

// RGB to color name mapping
function getClosestColor(r, g, b) {
    const colors = {
        red: [255, 0, 0],
        orange: [255, 165, 0],
        yellow: [255, 255, 0],
        green: [0, 255, 0],
        blue: [0, 0, 255],
        purple: [128, 0, 128],
        black: [0, 0, 0],
        white: [255, 255, 255],
        brown: [165, 42, 42]
    };

    let minDistance = Infinity;
    let closestColor = 'black';

    for (const [color, [r2, g2, b2]] of Object.entries(colors)) {
        const distance = Math.sqrt(
            Math.pow(r - r2, 2) +
            Math.pow(g - g2, 2) +
            Math.pow(b - b2, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }

    return closestColor;
}

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const infoBox = document.getElementById('infoBox'); 
const resultContainer = document.getElementById('resultContainer');
const emojiOutput = document.getElementById('emojiOutput');
const copyButton = document.getElementById('copyButton');

// Create hidden canvas for image processing
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Handle drag and drop events
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

// Handle file input
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        processImage(file);
    }
});

// Process the uploaded image
function processImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // For images 32x32 or smaller, use exact pixels
            if (img.width <= 32 && img.height <= 32) {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            } else {
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;
                const maxSize = 32;

                if (width > height) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }

                // Set canvas size and draw image
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
            }

            // Get image data and convert to emoji
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const emojiArt = convertToEmoji(imageData, canvas.width, canvas.height);
            
            // Display result
            emojiOutput.textContent = emojiArt;
            resultContainer.style.display = 'block';
            infoBox.style.display = 'none'; 
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Convert image data to emoji art
function convertToEmoji(imageData, width, height) {
    let emojiArt = '';
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const color = getClosestColor(r, g, b);
            emojiArt += colorMap[color];
        }
        emojiArt += '\n';
    }

    return emojiArt;
}

// Copy to clipboard functionality
copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(emojiOutput.textContent)
        .then(() => {
            const originalText = copyButton.textContent;
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = originalText;
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
}); 