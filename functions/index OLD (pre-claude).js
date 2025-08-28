const functions = require("firebase-functions");
const fetch = require("node-fetch");
const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK, which allows functions to edit the database
admin.initializeApp();

/**
 * Splits an array into smaller chunks of a specified size.
 * This is used to handle a large number of stocks without exceeding API limits.
 * @param {Array<any>} array The array to chunk.
 * @param {number} size The size of each chunk.
 * @returns {Array<Array<any>>} An array of smaller arrays (chunks).
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// --- AUTOMATED FUNCTION 1: Update Live Prices ---
// This function runs every 15 minutes during market hours (Mon-Fri, 9:30 AM - 4:00 PM New York time).
// It fetches live prices for ALL stocks in bulk to save API calls.
exports.updateLivePrices = functions.pubsub.schedule('every 15 minutes from 09:30 to 16:00').timeZone('America/New_York').onRun(async (context) => {
    console.log('Starting scheduled update of live stock prices.');
    const apiKey = functions.config().financialmodelingprep.key;
    const db = admin.firestore();
    const stocksRef = db.collection('stocks');

    try {
        const snapshot = await stocksRef.get();
        if (snapshot.empty) {
            console.log('No stocks found in Firestore.');
            return null;
        }

        // Get all tickers and their document IDs
        const tickersAndDocs = snapshot.docs.map(doc => ({
            ticker: doc.data().Portfolio?.ticker,
            docId: doc.id
        })).filter(item => item.ticker); // Filter out any stocks that might be missing a ticker

        if (tickersAndDocs.length === 0) {
            console.log('No valid tickers found to update.');
            return null;
        }

        const allTickers = tickersAndDocs.map(item => item.ticker);
        
        // Split tickers into chunks of 100 to stay within practical API limits
        const tickerChunks = chunkArray(allTickers, 100);
        const updatePromises = [];

        for (const chunk of tickerChunks) {
            const tickerString = chunk.join(',');
            const url = `https://financialmodelingprep.com/api/v3/quote-short/${tickerString}?apikey=${apiKey}`;
            
            console.log(`Fetching prices for chunk: ${tickerString}`);
            const response = await fetch(url);
            const priceData = await response.json();

            if (priceData && Array.isArray(priceData)) {
                // Loop through the results from the API call
                for (const item of priceData) {
                    // Find the corresponding document in our database
                    const stockToUpdate = tickersAndDocs.find(s => s.ticker === item.symbol);
                    if (stockToUpdate) {
                        // Create a promise to update the 'stockPriceNow' field
                        const docRef = db.collection('stocks').doc(stockToUpdate.docId);
                        const promise = docRef.update({
                            'Portfolio.stockPriceNow': item.price
                        });
                        updatePromises.push(promise);
                    }
                }
            }
        }

        // Wait for all the individual database updates to complete
        await Promise.all(updatePromises);
        console.log(`Successfully updated live prices for ${updatePromises.length} stocks.`);
        return null;

    } catch (error) {
        console.error('An error occurred during the live price update:', error);
        return null;
    }
});


// --- AUTOMATED FUNCTION 2: Update Historical Chart Data ---
// This function runs once every 24 hours.
// It fetches 3 months of historical data for EACH stock and saves it.
exports.updateChartData = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    console.log('Starting daily chart data update for all stocks.');
    const apiKey = functions.config().financialmodelingprep.key;
    const db = admin.firestore();
    const stocksRef = db.collection('stocks');

    try {
        const snapshot = await stocksRef.get();
        if (snapshot.empty) {
            console.log('No stocks found to update.');
            return null;
        }

        const updatePromises = [];

        for (const doc of snapshot.docs) {
            const stockData = doc.data();
            const ticker = stockData.Portfolio?.ticker;

            if (ticker) {
                console.log(`Fetching chart data for ${ticker}...`);
                
                const to = new Date();
                let from = new Date();
                from.setMonth(to.getMonth() - 3);
                const fromDateStr = from.toISOString().split('T')[0];
                const toDateStr = to.toISOString().split('T')[0];

                const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?from=${fromDateStr}&to=${toDateStr}&apikey=${apiKey}`;
                
                const apiResponse = await fetch(url);
                const apiData = await apiResponse.json();

                if (apiData && apiData.historical) {
                    // Create a promise to update the 'Chart_Data' field
                    const promise = doc.ref.update({
                        'Chart_Data': apiData.historical
                    });
                    updatePromises.push(promise);
                    console.log(`Successfully queued chart data update for ${ticker}.`);
                } else {
                    console.warn(`No historical data found for ${ticker}.`);
                }
            }
        }

        await Promise.all(updatePromises);
        console.log('All chart data updates are complete.');
        return null;

    } catch (error) {
        console.error('Error updating chart data:', error);
        return null;
    }
});
