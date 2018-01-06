/**
 * TickerController
 *
 * @description :: Server-side logic for managing tickers
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var moment = require('moment');
var statusOne = sails.config.common.statusOne;
var statusTwo = sails.config.common.statusTwo;
var statusThree = sails.config.common.statusThree;
const BTCMARKETID = sails.config.common.BTCMARKETID;

module.exports = {
  getBTC_VCN: function(req, res, next) {
    console.log("Enter Into getBTC_VCN");
    BidVCN.find({
        status: {
          'like': statusOne
        },
        marketId: {
          'like': BTCMARKETID
        }
      })
      .min('bidAmountBTC')
      .exec(function(err, bidAmountVCNSum) {
        if (err) {
          return res.json({
            "message": "Error to min Of BidVCN",
            statusCode: 401
          });
        }
        AskVCN.find({
            status: {
              'like': statusOne
            },
            marketId: {
              'like': BTCMARKETID
            }
          })
          .max('askAmountBTC')
          .exec(function(err, askAmountBTCSum) {
            if (err) {
              return res.json({
                "message": "Error to max Of AskVCN",
                statusCode: 401
              });
            }
            var timestamp = Date.parse(moment.utc().format()) / 1000;
            return res.json({
              timestamp: timestamp,
              bid: bidAmountVCNSum[0].bidAmountBTC ? bidAmountVCNSum[0].bidAmountBTC : 0,
              ask: askAmountBTCSum[0].askAmountBTC ? askAmountBTCSum[0].askAmountBTC : 0,
              statusCode: 200
            });
          });
      });
  }
};