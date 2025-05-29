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

// RGB to color name mapping with perceptually adjusted colors
function getClosestColor(r, g, b) {
    const colors = {
        red: [255, 0, 0],
        orange: [255, 140, 0],
        yellow: [255, 255, 0],
        green: [0, 200, 0],
        blue: [0, 0, 255],
        lightBlue: [135, 206, 235],
        purple: [160, 32, 240],
        black: [0, 0, 0],
        white: [255, 255, 255],
        brown: [139, 69, 19]
    };

    let minDistance = Infinity;
    let closestColor = 'black';

    // Special handling for blue detection
    if (b > r && b > g) {
        // Calculate color saturation to avoid detecting grayish colors as blue
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        
        // Only consider it blue if it has sufficient saturation and blue dominance
        if (saturation > 0.15 && (b - Math.max(r, g)) > 20) {
            for (const [color, [r2, g2, b2]] of Object.entries(colors)) {
                if (color === 'blue' || color === 'lightBlue') {
                    // Weight blue channel more heavily for blue detection
                    const distance = Math.sqrt(
                        Math.pow(r - r2, 2) * 0.3 +
                        Math.pow(g - g2, 2) * 0.3 +
                        Math.pow(b - b2, 2) * 1.5
                    );
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestColor = color;
                    }
                }
            }
            
            // If we found a blue match, return it
            if (closestColor === 'blue' || closestColor === 'lightBlue') {
                return 'blue';  // Map both light and dark blue to blue emoji
            }
        }
    }

    // For non-blue colors, use LAB color space
    for (const [color, [r2, g2, b2]] of Object.entries(colors)) {
        if (color === 'lightBlue') continue;  // Skip light blue in LAB comparison
        
        const lab1 = rgbToLab(r, g, b);
        const lab2 = rgbToLab(r2, g2, b2);
        
        const distance = Math.sqrt(
            Math.pow(lab1[0] - lab2[0], 2) +
            Math.pow(lab1[1] - lab2[1], 2) +
            Math.pow(lab1[2] - lab2[2], 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }

    return closestColor;
}

// Helper function to convert RGB to LAB color space
function rgbToLab(r, g, b) {
    // First convert RGB to XYZ
    let r1 = r / 255;
    let g1 = g / 255;
    let b1 = b / 255;

    r1 = r1 > 0.04045 ? Math.pow((r1 + 0.055) / 1.055, 2.4) : r1 / 12.92;
    g1 = g1 > 0.04045 ? Math.pow((g1 + 0.055) / 1.055, 2.4) : g1 / 12.92;
    b1 = b1 > 0.04045 ? Math.pow((b1 + 0.055) / 1.055, 2.4) : b1 / 12.92;

    r1 *= 100;
    g1 *= 100;
    b1 *= 100;

    const x = r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805;
    const y = r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722;
    const z = r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505;

    // Then convert XYZ to LAB
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    const x1 = x / xn;
    const y1 = y / yn;
    const z1 = z / zn;

    const fx = x1 > 0.008856 ? Math.pow(x1, 1/3) : (7.787 * x1) + 16/116;
    const fy = y1 > 0.008856 ? Math.pow(y1, 1/3) : (7.787 * y1) + 16/116;
    const fz = z1 > 0.008856 ? Math.pow(z1, 1/3) : (7.787 * z1) + 16/116;

    const L = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b2 = 200 * (fy - fz);

    return [L, a, b2];
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