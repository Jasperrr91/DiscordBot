'use strict'

const request = require('request')

let requestApi = function() {
    let self = this;

    self.getBleu = function() {
        var valueResponse;
        var volumeResponse;
        var wallResponse;

        return new Promise(
            (resolve, reject) => {
                request.get('https://bleutrade.com/api/v2/public/getmarketsummary?market=MOON_BTC', function (err, response, body) {
                    request.get('https://bleutrade.com/api/v2/public/getorderbook?market=MOON_BTC&type=ALL&depth=1', function (err2, response2, body2) {
                        var summary = JSON.parse(body);

                        var avgPrice = summary[0].result[0].Average * 100000000;
                        valueResponse = avgPrice + " Satoshi";

                        var avgPrice = (summary[0].result[0].BaseVolume*1).toFixed(2);
                        volumeResponse = avgPrice + " BTC";

                        var orderBook = JSON.parse(body2);
                        var buyWall = (orderBook[0].result.buy[0].Quantity * orderBook[0].result.buy.Rate).toFixed(2);
                        var sellWall = (orderBook[0].result.sell[0].Quantity * orderBook[0].result.sell.Rate).toFixed(2);
                        var buyPrice = orderBook[0].result.buy[0].Rate * 100000000;
                        var sellPrice = orderBook[0].result.sell[0].Rate * 100000000;
                        wallResponse += "Buy: " + buyWall + " BTC @ " + buyPrice + " SAT\n";
                        wallResponse += "Sell: " + sellWall + " BTC @ " + sellPrice + " SAT";

                        var response = {};
                        response.value = valueResponse;
                        response.volume = volumeResponse;
                        response.wall = wallResponse;
                        resolve(response);
                    })
                })
            })
    }

    self.getCMC = function() {
        return new Promise(
            (resolve, reject) => {
                request.get('https://api.coinmarketcap.com/v1/ticker/mooncoin/?convert=EUR', function (err, response, body) {
                    var prices = JSON.parse(body);
                    var usd = (prices[0].price_usd * 1).toFixed(2);
                    var eur = (prices[0].price_eur * 1).toFixed(2);
                    var btc = (prices[0].price_btc * 1).toFixed(8);
                    var valueResponse = "**USD**: \t$" + usd + "\n";
                    valueResponse += "**EUR**: \t€" + eur + "\n";
                    valueResponse += "**BTC**: \t฿" + btc;

                    var usd24h = (prices[0]["24h_volume_usd"] * 1).toFixed(2);
                    var btc24h = (prices[0]["24h_volume_usd"]/prices[0].price_usd * prices[0].price_btc).toFixed(2);

                    var valueCap = "Rank: " + prices[0].rank + "\n";
                    valueCap += "24H: $" + usd24h + "\n";
                    valueCap += "24H: " + btc24h + " BTC";

                    var response = {};
                    response.valueResponse = valueResponse;
                    response.valueCap = valueCap;
                    resolve(response);
                })
        })
    }

}

module.exports = requestApi