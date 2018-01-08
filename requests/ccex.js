'use strict'

const request = require('request');
const moment = require('moment');
const momentDuration = require("moment-duration-format");

let ccex = function() {
    let self = this;

    this.cache = {};
    this.cache.summaryMsg = {time: 0, response: ""};
    this.cache.orderBookMsg = {time: 0, response: ""};
    this.cache.historyMsg = {time: 0, response: {}};
    this.cache.volumeMsg = {time: 0, response: ""};

    self.summaryMsg = function() {
        var responseMsg;
        return new Promise(
            (resolve, reject) => {
                if (Date.now() < (self.cache.summaryMsg.time + 300*1000)) {
                    console.log('returning from cache');
                    resolve(self.cache.summaryMsg.response);
                    return;
                }

                console.log("Ik trigger sowieso");

                request.get('https://www.coinexchange.io/api/v1/getmarketsummary?market_id=334', function (err, response, body) {
                    console.log("TRIGGER DAN");
                    console.log("CCEX Api body is:", body);
                    try {
                        var summary = JSON.parse(body);
                        var avgPrice = (summary.result.LastPrice * 100000000).toFixed(0);
                        responseMsg = avgPrice + " Satoshi";
                    } catch (e) {
                        responseMsg = "API Unavailable";
                    }

                    self.cache.summaryMsg.response = responseMsg;
                    self.cache.summaryMsg.time = Date.now();
                    resolve(responseMsg);
                })
            })
    }

    self.orderBookMsg = function() {
        var responseMsg;
        return new Promise(
            (resolve, reject) => {
                if (Date.now() < (self.cache.orderBookMsg.time + 300*1000)) {
                    console.log('returning from cache');
                    resolve(self.cache.orderBookMsg.response);
                    return;
                }

                request.get('https://www.coinexchange.io/api/v1/getmarketsummary?market_id=334', function (orderBookErr, orderBookResponse, orderBookBody) {
                    try {
                        //Walls
                        var orderBook = JSON.parse(orderBookBody);
                        console.log(orderBook);

                        // var buyWall = (orderBook.result.buy[0].Quantity * orderBook.result.buy[0].Rate).toFixed(2);
                        // var sellWall = (orderBook.result.sell[0].Quantity * orderBook.result.sell[0].Rate).toFixed(2);
                        // var buyPrice = orderBook.result.buy[0].Rate * 100000000;
                        // var sellPrice = orderBook.result.sell[0].Rate * 100000000;
                        // responseMsg = "Buy: " + buyWall + " BTC @ " + buyPrice.toFixed(0) + " SAT\n";
                        // responseMsg += "Sell: " + sellWall + " BTC @ " + sellPrice.toFixed(0) + " SAT";

                        var buyPrice = orderBook.result.BidPrice * 100000000;
                        var sellPrice = orderBook.result.AskPrice * 100000000;
                        responseMsg = "Buy: @ " + buyPrice.toFixed(0) + " SAT\n";
                        responseMsg += "Sell: @ " + sellPrice.toFixed(0) + " SAT";
                    } catch (e) {
                        responseMsg = "API Unavailable";
                    }

                    self.cache.orderBookMsg.response = responseMsg;
                    self.cache.orderBookMsg.time = Date.now();
                    console.log("Returning:", responseMsg);
                    resolve(responseMsg);
                })

            })
    }


    self.historyMsg = function() {
        var responseData = {};
        var tradeResponse;
        var hourResponse;

        return new Promise(
            (resolve, reject) => {
                if (Date.now() < (self.cache.historyMsg.time + 300*1000)) {
                    console.log('returning from cache');
                    resolve(self.cache.historyMsg.response);
                    return;
                }

                request.get('https://c-cex.com/t/api_pub.html?a=getmarkethistory&market=moon-btc&count=100', function (historyErr, historyResponse, historyBody) {
                    try {
                        //Trades + Hours
                        var history = JSON.parse(historyBody);
                        var lastHourBuyCount;
                        var lastHourSellCount;
                        var lastHourBuyVolume;
                        var lastHourSellVolume;

                        var lastTradesTotal;
                        var lastTradesDuration;

                        console.log("Processing trades");

                        for (var i = 0; i < history.result.length; ++i) {
                            if ((Date.parse(history.result[i].TimeStamp) + 3600 * 1000) > Date.now()) {
                                if (history.result[i].OrderType == "BUY") {
                                    lastHourBuyCount++;
                                    lastHourBuyVolume += parseFloat(history.result[i].Total);
                                } else if (history.result[i].OrderType == "SELL") {
                                    lastHourSellCount++;
                                    lastHourSellVolume += parseFloat(history.result[i].Total);
                                }
                            }

                            lastTradesTotal += parseFloat(history.result[i].Total);
                        }

                        lastTradesDuration = (Date.parse(history.result[0].TimeStamp) - Date.parse(history.result[history.result.length - 1].TimeStamp)) / 1000;

                        console.log("Setting trades");
                        //Trades
                        console.log("Duration: " + lastTradesDuration);
                        var durationString = moment.duration(lastTradesDuration, "seconds").format("h:mm:ss");

                        tradeResponse = lastTradesTotal.toFixed(2) + " BTC\n";
                        tradeResponse += "Duration: " + durationString;

                        console.log("Setting hours");

                        //Last Hour
                        hourResponse = "Buy: " + lastHourBuyCount + " - " + lastHourBuyVolume.toFixed(2) + " BTC\n";
                        hourResponse += "Sell: " + lastHourSellCount + " - " + lastHourSellVolume.toFixed(2) + " BTC";
                    } catch (e) {
                        tradeResponse = "API Unavailable";
                        hourResponse = "API Unavailable";
                    }

                    responseData.trade = tradeResponse;
                    responseData.hour = hourResponse;

                    self.cache.historyMsg.response = responseData;
                    self.cache.historyMsg.time = Date.now();
                    console.log("Returning:", responseData);
                    resolve(responseData);
                })

            })
    }

    self.volumeMsg = function() {
        var responseMsg;
        return new Promise(
            (resolve, reject) => {
                if (Date.now() < (self.cache.volumeMsg.time + 300*1000)) {
                    console.log('returning from cache');
                    resolve(self.cache.volumeMsg.response);
                    return;
                }

                request.get('https://www.coinexchange.io/api/v1/getmarketsummary?market_id=334', function (volumeErr, volumeResponse, volumeBody) {
                    try {
                        console.log("Setting volume");
                        //Volume
                        var volume = JSON.parse(volumeBody);
                        responseMsg = parseFloat(volume.result.Volume).toFixed(2) + " BTC";
                    } catch (e) {
                        responseMsg = "API Unavailable";
                    }

                    self.cache.volumeMsg.response = responseMsg;
                    self.cache.volumeMsg.time = Date.now();
                    console.log("Returning:", responseMsg);
                    resolve(responseMsg);
                })

            })
    }
}

    module.exports = ccex