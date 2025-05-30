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
    brown: '🟫',
    lightBlue: '🟦' // Map lightBlue to blue emoji
};

// Helper: Convert RGB to HSL
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: h = ((b - r) / d + 2); break;
            case b: h = ((r - g) / d + 4); break;
        }
        h /= 6;
    }
    return [h * 360, s, l];
}

// Improved color detection
function getClosestColor(r, g, b) {
    const colors = {
        red: [220, 20, 60],
        orange: [255, 140, 0],
        yellow: [255, 215, 0],
        green: [0, 200, 40],      // More saturated green
        blue: [0, 120, 255],      // More saturated blue
        lightBlue: [135, 206, 250], // Add light blue reference
        purple: [128, 0, 128],
        black: [0, 0, 0],
        white: [255, 255, 255],
        brown: [160, 82, 45]
    };

    // Calculate luminance and chroma
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const chroma = max - min;

    // Only force black/white if the color is not colorful (chroma < 30)
    if (chroma < 30) {
        if (luminance < 30) return 'black';
        if (luminance > 235) return 'white';
    }

    let minDistance = Infinity;
    let closestColor = 'black';
    for (const [color, [r2, g2, b2]] of Object.entries(colors)) {
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
    // Treat lightBlue as blue for emoji output
    if (closestColor === 'lightBlue') return 'blue';
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
const ctx = canvas.getContext('2d', { willReadFrequently: true });

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
    if (file.type === 'image/svg+xml') {
        // Read SVG as text
        const reader = new FileReader();
        reader.onload = (e) => {
            // Create a data URL for the SVG
            const svgText = e.target.result;
            const svgBase64 = btoa(unescape(encodeURIComponent(svgText)));
            const dataUrl = 'data:image/svg+xml;base64,' + svgBase64;

            const img = new Image();
            img.onload = () => {
                // Set default size for SVG if not specified
                let width = img.width || 32;
                let height = img.height || 32;
                // Optionally, scale to fit max 32x32
                if (width > 32 || height > 32) {
                    if (width > height) {
                        height = Math.round((height * 32) / width);
                        width = 32;
                    } else {
                        width = Math.round((width * 32) / height);
                        height = 32;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, width, height);

                // Get image data and convert to emoji
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const emojiArt = convertToEmoji(imageData, canvas.width, canvas.height);

                // Display result
                emojiOutput.textContent = emojiArt;
                resultContainer.style.display = 'block';
                infoBox.style.display = 'none';
            };
            img.src = dataUrl;
        };
        reader.readAsText(file);
    } else {
        // Existing code for raster images
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // For images 32x32 or smaller, use exact pixels
                if (img.width <= 32 && img.height <= 32) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.imageSmoothingEnabled = true; // No resampling, keep original
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

                    // Set canvas size and draw image with nearest neighbor resampling
                    canvas.width = width;
                    canvas.height = height;
                    ctx.imageSmoothingEnabled = false; // Nearest neighbor
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
}

function isLightColor(colorName) {
    // Add any other color names you want to treat as light
    return ['white', 'yellow', 'green', 'blue', 'orange', 'lightBlue'].includes(colorName);
}

function convertToEmoji(imageData, width, height) {
    let emojiArt = '';
    const data = imageData.data;

    // Analyze only non-transparent pixels to see if the image is mostly light
    let lightCount = 0;
    let nonTransparentCount = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a >= 128) {
                nonTransparentCount++;
                const color = getClosestColor(r, g, b);
                if (isLightColor(color)) lightCount++;
            }
        }
    }
    const mostlyLight = nonTransparentCount > 0 && (lightCount / nonTransparentCount) > 0.6;

    // Convert to emoji, handling transparency
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 128) {
                // Transparent pixel
                emojiArt += mostlyLight ? colorMap['black'] : colorMap['white'];
            } else {
                const color = getClosestColor(r, g, b);
                emojiArt += colorMap[color];
            }
        }
        emojiArt += '\n';
    }
    return emojiArt;
}

// Helper to check if a pixel is white
function isWhite(r, g, b) {
    return r > 220 && g > 220 && b > 220;
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