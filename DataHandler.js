const RealData = require('yahoo-stock-prices')
const fs       = require('fs')

class Data {

    stored = []
    scores = []

    constructor() {
        this.stored = []
    }

    push(symbol, summary, stat, fin) {
        if(summary == undefined || stat == undefined || fin == undefined) {
            return
        }
        this.stored.push({
            symbol: symbol,
            PE: summary.trailingPE,
            forwardPE: summary.forwardPE,
            yearHigh: summary.fiftyTwoWeekHigh,
            PB: stat.priceToBook,
            EPS: stat.trailingEps,
            forwardEPS: stat.forwardEPS,
            PEG: stat.pegRatio,
            incomeToCommon: stat.netIncomeToCommon,
            price: fin.currentPrice,
            targetMPrice: fin.targetMeanPrice,
            FCF: fin.freeCashflow,
            CPS: fin.totalCashPerShare,
            recommendation: fin.recommendationKey,
            analystsCount: fin.numberOfAnalystOpinions
        })
        this.scores.push({
            symbol: symbol,
            points: 0
        })
    }

    async scoreMetrics(type) {
        console.log('SCORING')

        const keys = Object.keys(this.stored[0])

        keys.map(async key => {

            for (let i = 0; i < this.stored.length; ++i) {
                for (let j = 0; j < this.stored.length - i - 1; ++j) {
                    //console.log(this.stored[j][key])
                    if(this.stored[j][key] > this.stored[j+1][key]) {
                        [this.stored[j], this.stored[j+1]] = [this.stored[j+1], this.stored[j]]
                    }
                }
            }

            for(let i = 0; i < this.stored.length; ++i) {

                const idx = this.scores.findIndex(x => x['symbol'] == this.stored[i]['symbol'])

                switch(key) {

                    /*
                    * If PE is small, it means that the stock is undervalued, so there is a chance that it can be go upper in the future
                    * If PE is big, than the stock is overvalued => it's price will decrease
                    * */

                    case 'PE':
                        this.scores[idx]['points'] += i+1
                        //this.scores[this.stored[i]['symbol']] += i+1
                        break;

                    case 'forwardPE':
                        if(this.stored[i]['forwardPE'] < 0){
                            this.scores[idx]['points'] += 1000
                        }else{
                            this.scores[idx]['points'] += i+1
                        }

                        //give warn points where PE is less than forward PE
                        if(this.stored[i]['forwardPE'] > this.stored[i]['PE']){
                            this.scores[idx]['points'] += 1
                        }
                        break;

                    /*
                    * If Price To Book Ratio is less than 1, then we found a great one.
                    * Between 1 and 2 we give a small warning
                    * Between 2 and 5 a bit smaller warning
                    * Over 5 we give a bigger warning
                    * */
                    case 'PB':
                        if(this.stored[i]['PB'] < 1) {
                            this.scores[idx]['points'] -= 5
                        }else if(this.stored[i]['PB'] >= 1 && this.stored[i]['PB'] < 2){
                            this.scores[idx]['points'] += 1
                        }else if(this.stored[i]['PB'] >= 2 && this.stored[i]['PB'] < 5){
                            this.scores[idx]['points'] += 2
                        }else{
                            this.scores[idx]['points'] += 5
                        }
                        break;

                    case 'PEG':
                        console.log(this.stored[i]['PEG'])
                        const PEG = parseFloat(this.stored[i]['PEG'])
                        if(PEG < 1.3 && PEG > 0) {
                            this.scores[idx]['points'] += 1
                        }else if(PEG < 0){
                            console.log('MINUS', this.stored[i]["symbol"])
                            this.scores[idx]['points'] += 100
                        }else{
                            this.scores[idx]['points'] += 3
                        }
                        break;

                    case 'EPS':
                        if(this.stored[i]['EPS'] < 0) {
                            this.scores[idx]['points'] += 100
                        }else{
                            this.scores[idx]['points'] += 10 - Math.floor(this.stored[i]['EPS'] / 10)
                        }
                        break;

                    case 'yearHigh':
                        const priceNow = this.stored[i]['price']
                        if(this.stored[i]['yearHigh'] < priceNow) {
                            this.scores[idx]['points'] += 5
                        }
                        break;

                    case 'incomeToCommon':
                        if(this.stored[i]['incomeToCommon'] < 0) {
                            this.scores[idx]['points'] += 40
                        }
                        break;

                    case 'CPS':
                        if(this.stored[i]['CPS'] > 0 && this.stored[i]['CPS'] < 15){
                            this.scores[idx]['points'] += 1
                        }else if(this.stored[i]['CPS'] < 40){
                            this.scores[idx]['points'] += 3
                        }else{
                            this.scores[idx]['points'] += 5
                        }
                        break;

                    case 'FCF':
                        this.scores[idx]['points'] += this.scores.length - i

                    default:
                        break;
                }
            }

            fs.writeFileSync('./saved/' + key + '.json', JSON.stringify(this.stored, null, 1), { flag: 'w+', encoding: 'utf-8'})

        })

        this.scores.sort(compare)
        console.log(this.scores)
        const symbols = this.stored.map(x => x['symbol'])


        fs.writeFileSync('./results/' + type + '.json', JSON.stringify(this.scores, null, 1), { flag: 'w+', encoding: 'utf-8'})

        return this.scores
    }



}

function compare(a, b) {
    if (a['points'] < b['points']) {
        return -1;
    }
    if (a['points'] > b['points']) {
        return 1;
    }
    return 0;
}

module.exports = Data