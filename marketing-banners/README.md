# Storo Marketing Banners for WhatsApp

This folder contains 5 marketing banners designed for WhatsApp distribution using Storo's brand theme (blue #4169df and orange #f3973b).

## Banner List

1. **1-how-storo-works.html** - Shows the 3-step process of how Storo works
2. **2-why-choose-storo.html** - Highlights 6 key reasons to choose Storo
3. **3-pricing-plans.html** - Displays all 5 pricing plans (Starter, Pro, Advance, Flexible, Custom)
4. **4-quick-benefits.html** - Square format (1080x1080) with quick benefits overview
5. **5-whatsapp-cta.html** - WhatsApp-themed call-to-action banner with contact info

## How to Convert HTML to JPG

### Method 1: Using Browser Screenshot (Easiest)

1. Open each HTML file in your browser (Chrome, Edge, or Firefox)
2. Press F11 for fullscreen mode (optional, for cleaner capture)
3. Use browser developer tools:
   - Press F12 to open Developer Tools
   - Press Ctrl+Shift+P (Windows) or Cmd+Shift+P (Mac)
   - Type "screenshot" and select "Capture full size screenshot"
4. Save the PNG file
5. Convert PNG to JPG using any image editor or online tool

### Method 2: Using Online Tools

**Option A: HTML to Image Converters**
- Visit: https://htmlcsstoimage.com/
- Upload or paste your HTML code
- Download as JPG

**Option B: Screenshot Tools**
- Use screenshot tools like:
  - Awesome Screenshot (browser extension)
  - Lightshot
  - Snipping Tool (Windows 11)

### Method 3: Using Browser Extensions

1. Install "GoFullPage" or "Awesome Screenshot" extension
2. Open HTML file in browser
3. Click extension icon
4. Select "Capture Visible Part" or "Full Page"
5. Download as JPG

### Method 4: Using Command Line (Node.js - Advanced)

If you have Node.js installed, you can use Puppeteer:

```bash
npm install puppeteer

# Create convert.js file with this code:
```

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const files = [
    '1-how-storo-works.html',
    '2-why-choose-storo.html',
    '3-pricing-plans.html',
    '4-quick-benefits.html',
    '5-whatsapp-cta.html'
  ];

  for (const file of files) {
    const filePath = path.join(__dirname, file);
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });

    // For square banners (4 and 5), set viewport
    if (file.includes('quick-benefits') || file.includes('whatsapp-cta')) {
      await page.setViewport({ width: 1080, height: 1080 });
    }

    const outputName = file.replace('.html', '.jpg');
    await page.screenshot({
      path: outputName,
      type: 'jpeg',
      quality: 90,
      fullPage: true
    });

    console.log(`Created: ${outputName}`);
  }

  await browser.close();
})();
```

Then run:
```bash
node convert.js
```

## Recommended Image Specifications for WhatsApp

- **Format**: JPG or PNG
- **Optimal size**: 1080px width (landscape) or 1080x1080px (square)
- **File size**: Keep under 5MB for easy sharing
- **Quality**: 85-90% JPG quality for good balance

## Tips for WhatsApp Distribution

1. **Image Size**: WhatsApp compresses images, so start with high quality
2. **Text Readability**: Keep text large and bold (already implemented)
3. **Call-to-Action**: Make sure phone number is clearly visible
4. **Testing**: Send to yourself first to check compression quality
5. **Timing**: Send during business hours for better engagement

## Customization

To customize the banners:

1. Open the HTML file in any text editor
2. Look for the `<style>` section to change colors
3. Primary colors are defined as:
   - Blue: `#4169df`
   - Orange: `#f3973b`
   - Green (WhatsApp): `#25D366`
4. Edit text content in the `<body>` section
5. Save and re-convert to JPG

## Need Help?

Contact Storo support via WhatsApp: +62 856-4748-6700
