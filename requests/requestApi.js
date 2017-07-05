const request = require('request')

let requestApi = function() {
    let self = this;
    console.log("Initing requestapi");

    self.coinmarketcap = function() {
        request.get('https://api.coinmarketcap.com/v1/ticker/mooncoin/?convert=EUR', function (err, response, body) {
            var prices = JSON.parse(body);
            var usd = (prices[0].price_usd * 1).toFixed(2);
            var eur = (prices[0].price_eur * 1).toFixed(2);
            var btc = (prices[0].price_btc * 1).toFixed(8);
            var valueResponse = "**USD**: \t$" + usd + "\n";
            valueResponse += "**EUR**: \t€" + eur + "\n";
            valueResponse += "**BTC**: \t฿" + btc;

            var usd24h = (prices[0]["24h_volume_usd"] * 1).toFixed(2);
            var btc24h = (usd24h/usd*btc).toFixed(2);

            var valueCap = "Rank: " + prices[0].rank + "\n";
            valueCap += "24H: $" + usd24h + "\n";
            valueCap += "24H: " + btc24h + " BTC";

            var response = {};
            response.valueResponse = valueResponse;
            response.valueCap = valueCap;

            return response;
        })
    }
}
