
// This is a node script to trigger a data export from the SQLite database.
// Note: In a real Expo environment, this would be a button in the app's settings.
// Here we are creating a bridge to the exported logic.

const fs = require('fs');
const path = require('path');

// Mocking some parts because node environment doesn't have native mobile SQLite
// but the purpose is to show the export structure and enable the user to see the format.

async function generateSampleDataset() {
    console.log("Generating sample dataset for LLM training format check...");
    
    // In production, this would call localStorageService.exportDatabaseToJson()
    const dataset = {
        exportDate: new Date().toISOString(),
        description: "AQI Intelligence Dataset for LLM Training and RAG",
        schema: {
            news: ["id", "title", "description", "content", "source", "publishedAt"],
            readings: ["id", "deviceId", "timestamp", "pm25", "contextTag"],
            stations: ["uid", "name", "aqi", "city", "lastUpdated"]
        },
        data: {
            news: [
                {
                    id: "news_1",
                    title: "Pollution Alert: PM2.5 levels exceed safety norms in Delhi",
                    content: "The Central Pollution Control Board reported that PM2.5 levels reached 300 in several parts of the capital today. Residents are advised to avoid outdoor activities.",
                    source: "CPCB News",
                    publishedAt: "2026-03-25T10:00:00Z"
                }
            ],
            readings: [
                {
                    id: "read_1",
                    deviceId: "official_delhi",
                    timestamp: "2026-03-25T11:00:00Z",
                    pm25: 155.5,
                    contextTag: "urban"
                }
            ],
            stations: [
                {
                    uid: 1234,
                    name: "Anand Vihar",
                    aqi: 280,
                    city: "Delhi",
                    lastUpdated: "2026-03-25T11:30:00Z"
                }
            ]
        }
    };

    const targetPath = path.join(__dirname, 'AQI_Intelligence_Dataset.json');
    fs.writeFileSync(targetPath, JSON.stringify(dataset, null, 2));
    console.log(`Dataset generated at: ${targetPath}`);
}

generateSampleDataset();
