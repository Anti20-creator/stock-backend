const Finance  = require('yahoo-finance')
const fs       = require('fs')
const Data     = require('./DataHandler')
const express  = require('express')
const app      = express()
const cors     = require('cors')

app.use(cors({credentials: true, origin: 'http://localhost:3000'}));
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', req.header('origin') );
    next();
});

const types = [
    'Communication Services',
    'Consumer Cyclical',
    'Consumer Defensive',
    'Energy',
    'Financial Services',
    'HealthCare',
    'Industrials',
    'Real Estate',
    'Technology',
    'Utilities'
]


async function fetchAndGetistory() {
    await types.map(async type => {
        let store = new Data()

        const symbols  = fs.readFileSync('./utils/' + type + '.txt').toString().split('\n')
            .map(x => x.split(' - ')[0]).filter(x => x.length != 0)

        /*await fetch(symbols, store).then(async () => {
            await store.scoreMetrics(type)
        })*/

        await getHistorical(symbols, store)
    })
}

async function fetch(symbols, store) {
    await Finance.quote({
        symbols: symbols,
        modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData']
    }, (err, data) => {
        Object.keys(data).map(key => {
            store.push(key, data[key].summaryDetail, data[key].defaultKeyStatistics, data[key].financialData)
        })
    })
}

async function getHistorical(symbols, store) {
    const result = await Finance.historical({
        symbols: symbols,
        from: '2021-01-01',
        to: '2021-06-20',
        period: 'd'
    })

    return result
}

app.listen(4000, () => {
    console.log('Stock backend started!')
})

app.get('/', async(req, res) => {

    console.log(req.query.industry)

    let store = new Data()
    const symbols  = fs.readFileSync('./utils/' + req.query.industry + '.txt').toString().split('\n')
        .map(x => x.split(' - ')[0]).filter(x => x.length != 0)

    await fetch(symbols, store).then(async () => {
        await store.scoreMetrics(req.query.industry).then(async (scores) => {
            await getHistorical(symbols, store).then((history) => {
                console.log('History:', history)
                res.status(200).send({scores, history})
            })
        })
    })

})