const fs = require('fs');

try {
    let html = fs.readFileSync('index.html', 'utf8');
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        console.error("ERROR: GOOGLE_API_KEY environment variable is missing in Netlify settings!");
        process.exit(1);
    }

    // Perform the text replacement safely
    html = html.replace('GEMINI_API_KEY_PLACEHOLDER', apiKey);
    
    fs.writeFileSync('index.html', html);
    console.log("SUCCESS: Gemini API Key successfully injected into index.html.");
} catch (error) {
    console.error("Build script failed:", error);
    process.exit(1);
}
