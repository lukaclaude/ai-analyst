const v2 = require("firebase-functions/v2");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

// Define the secret parameter using the main v2 object
const financialModelingPrepKey = v2.params.defineSecret("FINANCIALMODELINGPREP_KEY");

// Function 1: Get live stock price
exports.getStockPrice = v2.https.onRequest({ secrets: [financialModelingPrepKey] }, (req, res) => {
    cors(req, res, async () => {
        const ticker = req.query.ticker;
        if (!ticker) {
            res.status(400).send({ error: 'Ticker symbol is required' });
            return;
        }

        // Access the secret's value
        const apiKey = financialModelingPrepKey.value();
        const url = `https://financialmodelingprep.com/api/v3/quote-short/${ticker}?apikey=${apiKey}`;

        try {
            const response = await fetch(url);
            const result = await response.json();

            if (result && result[0]) {
                res.status(200).send({ price: result[0].price });
            } else {
                res.status(404).send({ error: 'Stock price not found' });
            }
        } catch (error) {
            console.error('Error fetching stock price:', error);
            res.status(500).send({ error: 'Failed to fetch stock price' });
        }
    });
});

// Function 2: Get chart data
exports.getChartData = v2.https.onRequest({ secrets: [financialModelingPrepKey] }, (req, res) => {
    cors(req, res, async () => {
        const ticker = req.query.ticker;
        const timeframe = req.query.timeframe || '1M';

        if (!ticker) {
            res.status(400).send({ error: 'Ticker symbol is required' });
            return;
        }

        // Access the secret's value
        const apiKey = financialModelingPrepKey.value();
        const to = new Date();
        const from = new Date();
        let interval = '1hour';

        switch(timeframe) {
            case '1D': from.setDate(to.getDate() - 2); interval = '5min'; break;
            case '5D': from.setDate(to.getDate() - 7); interval = '15min'; break;
            case '1M': from.setMonth(to.getMonth() - 1); interval = '1hour'; break;
            case '3M': from.setMonth(to.getMonth() - 3); interval = '4hour'; break;
        }

        const fromDateStr = from.toISOString().split('T')[0];
        const toDateStr = to.toISOString().split('T')[0];
        const url = `https://financialmodelingprep.com/api/v3/historical-chart/${interval}/${ticker}?from=${fromDateStr}&to=${toDateStr}&apikey=${apiKey}`;

        try {
            const response = await fetch(url);
            const result = await response.json();
            res.status(200).send({ data: result });
        } catch (error) {
            console.error('Error fetching chart data:', error);
            res.status(500).send({ error: 'Failed to fetch chart data' });
        }
    });
});