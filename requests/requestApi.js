'use strict'

const request = require('request')

let requestApi = function() {
    let self = this;
    self.bleuLastUpdate = 0;
    self.ccexLastUpdate = 0;
    self.novaLastUpdate = 0;
    self.valueLastUpdate = 0;

    self.bleuLastResponse = {};
    self.ccexLastResponse = {};
    self.novaLastResponse = {};
    self.valueLastResponse = {};



    self.getBleu = function() {
        if (Date.now() < (self.bleuLastUpdate + 300*1000)) {
            return new Promise(
                (resolve, reject) => {
                    console.log('returning from cache');
                    resolve(self.bleuLastResponse);
                });
        }

        var valueResponse;
        var volumeResponse;
        var wallResponse;
        console.log("Get bleu data");

        return new Promise(
            (resolve, reject) => {
                request.get('https://bleutrade.com/api/v2/public/getmarketsummary?market=MOON_BTC', function (err, response, body) {
                console.log("updating cache");
                    request.get('https://bleutrade.com/api/v2/public/getorderbook?market=MOON_BTC&type=ALL&depth=1', function (err2, response2, body2) {
                        var summary = JSON.parse(body);

                        var avgPrice = (summary.result[0].Average * 100000000).toFixed(0);
                        valueResponse = avgPrice + " Satoshi";

                        var avgPrice = (summary.result[0].BaseVolume*1).toFixed(2);
                        volumeResponse = avgPrice + " BTC";

                        var orderBook = JSON.parse(body2);
                        var buyWall = (orderBook.result.buy[0].Quantity * orderBook.result.buy[0].Rate).toFixed(2);
                        var sellWall = (orderBook.result.sell[0].Quantity * orderBook.result.sell[0].Rate).toFixed(2);
                        var buyPrice = orderBook.result.buy[0].Rate * 100000000;
                        var sellPrice = orderBook.result.sell[0].Rate * 100000000;
                        wallResponse = "Buy: " + buyWall + " BTC @ " + buyPrice.toFixed(0) + " SAT\n";
                        wallResponse += "Sell: " + sellWall + " BTC @ " + sellPrice.toFixed(0) + " SAT";

                        var response = {};
                        response.value = valueResponse;
                        response.volume = volumeResponse;
                        response.wall = wallResponse;
                        console.log(response);
                        self.bleuLastResponse = response;
                        self.bleuLastUpdate = Date.now();

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