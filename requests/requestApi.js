'use strict'

const request = require('request');
const moment = require('moment');
const momentDuration = require("moment-duration-format");
var ccexapi = require('./ccex');
var ccex = new ccexapi();

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
        var valueResponse;
        var volumeResponse;
        var wallResponse;
        var tradeResponse;
        var hourResponse;

        return new Promise(
            (resolve, reject) => {
                if (Date.now() < (self.bleuLastUpdate + 300*1000)) {
                    console.log('returning from cache');
                    resolve(self.bleuLastResponse);
                    return;
                }

                request.get('https://bleutrade.com/api/v2/public/getmarketsummary?market=MOON_BTC', function (summaryErr, summaryResponse, summaryBody) {
                    request.get('https://bleutrade.com/api/v2/public/getorderbook?market=MOON_BTC&type=ALL&depth=1', function (orderBookErr, orderBookResponse, orderBookBody) {
                        request.get('https://bleutrade.com/api/v2/public/getmarkethistory?market=MOON_BTC&count=100', function (historyErr, historyResponse, historyBody) {
                            var summary = JSON.parse(summaryBody);

                            //Value
                            var avgPrice = (summary.result[0].Average * 100000000).toFixed(0);
                            valueResponse = avgPrice + " Satoshi";

                            //Volume
                            var avgPrice = (summary.result[0].BaseVolume * 1).toFixed(2);
                            volumeResponse = avgPrice + " BTC";

                            //Walls
                            var orderBook = JSON.parse(orderBookBody);
                            var buyWall = (orderBook.result.buy[0].Quantity * orderBook.result.buy[0].Rate).toFixed(2);
                            var sellWall = (orderBook.result.sell[0].Quantity * orderBook.result.sell[0].Rate).toFixed(2);
                            var buyPrice = orderBook.result.buy[0].Rate * 100000000;
                            var sellPrice = orderBook.result.sell[0].Rate * 100000000;
                            wallResponse = "Buy: " + buyWall + " BTC @ " + buyPrice.toFixed(0) + " SAT\n";
                            wallResponse += "Sell: " + sellWall + " BTC @ " + sellPrice.toFixed(0) + " SAT";

                            //Trades + Hours
                            var history = JSON.parse(historyBody);
                            var lastHourBuyCount = 0;
                            var lastHourSellCount = 0;
                            var lastHourBuyVolume = 0;
                            var lastHourSellVolume = 0;

                            var lastTradesTotal = 0;
                            var lastTradesDuration = 0;

                            for (var i = 0; i < history.result.length; ++i) {
                                if((Date.parse(history.result[i].TimeStamp) + 3600 * 1000) > Date.now()){
                                    if(history.result[i].OrderType == "BUY") {
                                        lastHourBuyCount++;
                                        lastHourBuyVolume += parseFloat(history.result[i].Total);
                                    } else if(history.result[i].OrderType == "SELL") {
                                        lastHourSellCount++;
                                        lastHourSellVolume += parseFloat(history.result[i].Total);
                                    }
                                }

                                lastTradesTotal += parseFloat(history.result[i].Total);
                            }

                            lastTradesDuration = (Date.parse(history.result[0].TimeStamp) - Date.parse(history.result[history.result.length - 1].TimeStamp))/1000;

                            //Trades
                            console.log("Duration: " + lastTradesDuration);
                            var durationString = moment.duration(lastTradesDuration, "seconds").format("h:mm:ss");

                            tradeResponse = lastTradesTotal.toFixed(2) + " BTC\n";
                            tradeResponse += "Duration: " + durationString;

                            //Last Hour
                            hourResponse = "Buy: " + lastHourBuyCount + " - " + lastHourBuyVolume.toFixed(2) + " BTC\n";
                            hourResponse += "Sell: " + lastHourSellCount + " - " + lastHourSellVolume.toFixed(2) + " BTC";

                            var response = {};
                            response.value = valueResponse;
                            response.volume = volumeResponse;
                            response.wall = wallResponse;
                            response.trade = tradeResponse;
                            response.hour = hourResponse;
                            console.log(response);

                            console.log("updating cache");
                            self.bleuLastResponse = response;
                            self.bleuLastUpdate = Date.now();

                            resolve(response);
                        })
                    })
                })
            })
    }

    self.getCcex = function() {
        var response = {};

        return new Promise(
            (resolve, reject) => {
                Promise.all([ccex.summaryMsg(), ccex.orderBookMsg(), /*ccex.historyMsg(),*/ ccex.volumeMsg()])
                    .then(ccexData => {
                        console.log('i should trigger last')
                        response.value = ccexData[0];
                        response.volume = ccexData[2];
                        response.wall = ccexData[1];
                        // response.trade = ccexData[2].trade;
                        // response.hour = ccexData[2].hour;
                        resolve(response);
                        return response;
                    })
                    .catch(() => { console.log('failed!') });
            })
    }

    //
    self.getNova = function() {
        var valueResponse;
        var volumeResponse;
        var wallResponse;
        var tradeResponse;
        var hourResponse;

        return new Promise(
                (resolve, reject) => {
                if (Date.now() < (self.novaLastUpdate + 300*1000)) {
            console.log('returning from cache');
            resolve(self.novaLastResponse);
            return;
        }

        request.get('https://novaexchange.com/remote/v2/market/info/BTC_MOON/', function (summaryErr, summaryResponse, summaryBody) {
            request.get('https://novaexchange.com/remote/v2/market/openorders/BTC_MOON/BOTH/', function (orderBookErr, orderBookResponse, orderBookBody) {
                request.get('https://novaexchange.com/remote/v2/market/orderhistory/BTC_MOON/', function (historyErr, historyResponse, historyBody) {
                    var summary = JSON.parse(summaryBody);

                    //Value
                    var avgPrice = (summary.markets[0].last_price * 100000000).toFixed(0);
                    valueResponse = avgPrice + " Satoshi";

                    //Volume
                    var avgPrice = parseFloat(summary.markets[0].volume24h).toFixed(2);
                    volumeResponse = avgPrice + " BTC";

                    //Walls
                    var orderBook = JSON.parse(orderBookBody);
                    var buyWall = parseFloat(orderBook.buyorders[0].baseamount).toFixed(2);
                    var sellWall = parseFloat(orderBook.sellorders[0].baseamount).toFixed(2);
                    var buyPrice = parseFloat(orderBook.buyorders[0].price) * 100000000;
                    var sellPrice = parseFloat(orderBook.sellorders[0].price) * 100000000;
                    wallResponse = "Buy: " + buyWall + " BTC @ " + buyPrice.toFixed(0) + " SAT\n";
                    wallResponse += "Sell: " + sellWall + " BTC @ " + sellPrice.toFixed(0) + " SAT";

                    //Trades + Hours
                    var history = JSON.parse(historyBody);
                    var lastHourBuyCount = 0;
                    var lastHourSellCount = 0;
                    var lastHourBuyVolume = 0;
                    var lastHourSellVolume = 0;

                    var lastTradesTotal = 0;
                    var lastTradesDuration = 0;

                    for (var i = 0; i < history.items.length; ++i) {
                        if((Date.parse(history.items[i].datestamp) + 3600 * 1000) > Date.now()){
                            if(history.items[i].tradetype == "BUY") {
                                lastHourBuyCount++;
                                lastHourBuyVolume += parseFloat(history.items[i].baseamount);
                            } else if(history.items[i].tradetype == "SELL") {
                                lastHourSellCount++;
                                lastHourSellVolume += parseFloat(history.items[i].baseamount);
                            }
                        }

                        lastTradesTotal += parseFloat(history.items[i].baseamount);
                    }

                    lastTradesDuration = (Date.parse(history.items[0].datestamp) - Date.parse(history.items[history.items.length - 1].datestamp))/1000;

                    //Trades
                    console.log("Duration: " + lastTradesDuration);
                    var durationString = moment.duration(lastTradesDuration, "seconds").format("h:mm:ss");

                    tradeResponse = lastTradesTotal.toFixed(2) + " BTC\n";
                    tradeResponse += "Duration: " + durationString;

                    //Last Hour
                    hourResponse = "Buy: " + lastHourBuyCount + " - " + lastHourBuyVolume.toFixed(2) + " BTC\n";
                    hourResponse += "Sell: " + lastHourSellCount + " - " + lastHourSellVolume.toFixed(2) + " BTC";

                    var response = {};
                    response.value = valueResponse;
                    response.volume = volumeResponse;
                    response.wall = wallResponse;
                    response.trade = tradeResponse;
                    response.hour = hourResponse;
                    console.log(response);

                    console.log("updating cache");
                    self.novaLastResponse = response;
                    self.novaLastUpdate = Date.now();

                    resolve(response);
                })
            })
        })
    })
    }
    //

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

    self.shitpost = function() {
        return new Promise(
            (resolve, reject) => {
                Promise.all([self.getCMC(), self.getBleu(), self.getCcex()/*, self.getNova()*/])
                    .then(response => {
                        console.log(response);
                        resolve(response);
                    })
            }
        )

    }

}

module.exports = requestApi