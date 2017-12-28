/**
 * TrademarketBTCLTCController
 *
 * @description :: Server-side logic for managing trademarketbtcltcs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

var statusZero = sails.config.common.statusZero;
var statusOne = sails.config.common.statusOne;
var statusTwo = sails.config.common.statusTwo;
var statusThree = sails.config.common.statusThree;
var statusZeroCreated = sails.config.common.statusZeroCreated;
var statusOneSuccessfull = sails.config.common.statusOneSuccessfull;
var statusTwoPending = sails.config.common.statusTwoPending;
var statusThreeCancelled = sails.config.common.statusThreeCancelled;
var constants = require('./../../config/constants');
const txFeeWithdrawSuccessBTC = sails.config.common.txFeeWithdrawSuccessBTC;
const BTCMARKETID = sails.config.common.BTCMARKETID;

module.exports = {
  addAskLTCMarket: async function(req, res) {
    console.log("Enter into ask api addAskLTCMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountLTC || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountLTC < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
      console.log("Negative Paramter");
      return res.json({
        "message": "Negative Paramter!!!!",
        statusCode: 400
      });
    }
    try {
      var userAsker = await User.findOne({
        id: userAskownerId
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Error in fetching user',
        statusCode: 401
      });
    }
    if (!userAsker) {
      return res.json({
        "message": "Invalid Id!",
        statusCode: 401
      });
    }
    console.log("User details find successfully :::: " + JSON.stringify(userAsker));
    var userLTCBalanceInDb = new BigNumber(userAsker.LTCbalance);
    var userFreezedLTCBalanceInDb = new BigNumber(userAsker.FreezedLTCbalance);

    userLTCBalanceInDb = parseFloat(userLTCBalanceInDb);
    userFreezedLTCBalanceInDb = parseFloat(userFreezedLTCBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountLTC.greaterThanOrEqualTo(userLTCBalanceInDb)) {
      return res.json({
        "message": "You have insufficient LTC Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountLTC :: " + userAskAmountLTC);
    console.log("userLTCBalanceInDb :: " + userLTCBalanceInDb);
    // if (userAskAmountLTC >= userLTCBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient LTC Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskLTC.create({
        askAmountBTC: userAskAmountBTC,
        askAmountLTC: userAskAmountLTC,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountLTC: userAskAmountLTC,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerLTC: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.LTC_ASK_ADDED, askDetails);
    // var updateUserLTCBalance = (parseFloat(userLTCBalanceInDb) - parseFloat(userAskAmountLTC));
    // var updateFreezedLTCBalance = (parseFloat(userFreezedLTCBalanceInDb) + parseFloat(userAskAmountLTC));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userLTCBalanceInDb = new BigNumber(userLTCBalanceInDb);
    var updateUserLTCBalance = userLTCBalanceInDb.minus(userAskAmountLTC);
    updateUserLTCBalance = parseFloat(updateUserLTCBalance);
    userFreezedLTCBalanceInDb = new BigNumber(userFreezedLTCBalanceInDb);
    var updateFreezedLTCBalance = userFreezedLTCBalanceInDb.plus(userAskAmountLTC);
    updateFreezedLTCBalance = parseFloat(updateFreezedLTCBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedLTCbalance: updateFreezedLTCBalance,
        LTCbalance: updateUserLTCBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidLTC.find({
        bidRate: {
          'like': parseFloat(userAskRate)
        },
        marketId: {
          'like': BTCMARKETID
        },
        status: {
          'like': statusTwo
        }
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to find LTC bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of LTC
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountLTC;
      }
      if (total_bid <= totoalAskRemainingLTC) {
        console.log("Inside of total_bid <= totoalAskRemainingLTC");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingLTC");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingLTC == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingLTC == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerLTC
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerLTC
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.LTCbalance) + parseFloat(currentBidDetails.bidAmountLTC));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.LTCbalance);
            updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(currentBidDetails.bidAmountLTC);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of LTC Update user " + updatedLTCbalanceBidder);
            //var txFeesBidderLTC = (parseFloat(currentBidDetails.bidAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            // var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            //
            // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC)
            // console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
            // //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
            // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
            updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);


            //updatedLTCbalanceBidder =  parseFloat(updatedLTCbalanceBidder);

            console.log("After deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerLTC
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                LTCbalance: updatedLTCbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and LTC balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedLTCbalanceAsker = parseFloat(totoalAskRemainingLTC);
            //var updatedFreezedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(userAskAmountLTC)) + parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
            updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(userAskAmountLTC);
            updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.plus(totoalAskRemainingLTC);

            //updatedFreezedLTCbalanceAsker =  parseFloat(updatedFreezedLTCbalanceAsker);
            //Deduct Transation Fee Asker
            //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var BTCAmountSucess = new BigNumber(userAskAmountBTC);
            BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount BTC updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(BTCAmountSucess) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            updatedBTCbalanceAsker = parseFloat(updatedBTCbalanceAsker);
            console.log("After deduct TX Fees of LTC Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerLTC
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedLTCbalance: updatedFreezedLTCbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed LTCBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidLTC:: ");
            try {
              var bidDestroy = await BidLTC.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
            } catch (e) {
              return res.json({
                error: e,
                "message": "Failed with an error",
                statusCode: 200
              });
            }
            sails.sockets.blast(constants.LTC_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskLTC.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskLTC.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskLTC',
                statusCode: 401
              });
            }
            //emitting event of destruction of LTC_ask
            sails.sockets.blast(constants.LTC_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingLTC == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerLTC " + currentBidDetails.bidownerLTC);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerLTC
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.LTCbalance) + parseFloat(currentBidDetails.bidAmountLTC));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.LTCbalance);
            updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(currentBidDetails.bidAmountLTC);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of LTC 089089Update user " + updatedLTCbalanceBidder);
            // var txFeesBidderLTC = (parseFloat(currentBidDetails.bidAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            // var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            // console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
            // // updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
            // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
            updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);


            console.log("After deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedLTCbalanceBidder:: " + updatedLTCbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerLTC
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                LTCbalance: updatedLTCbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);

            try {
              var desctroyCurrentBid = await BidLTC.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
            } catch (e) {
              return res.json({
                error: e,
                "message": "Failed with an error",
                statusCode: 200
              });
            }
            sails.sockets.blast(constants.LTC_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerLTC
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerLTC");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            //var updatedFreezedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(userAskAmountLTC)) + parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
            updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(userAskAmountLTC);
            updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.plus(totoalAskRemainingLTC);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainLTC userAllDetailsInDBAsker.FreezedLTCbalance " + userAllDetailsInDBAsker.FreezedLTCbalance);
            console.log("Total Ask RemainLTC updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var BTCAmountSucess = new BigNumber(userAskAmountBTC);
            BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);

            //var txFeesAskerBTC = (parseFloat(BTCAmountSucess) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of LTC Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceAsker ::: " + updatedFreezedLTCbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerLTC
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedLTCbalance: updatedFreezedLTCbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskLTC.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
                status: statusTwo,
                statusName: statusTwoPending,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            sails.sockets.blast(constants.LTC_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingLTC = totoalAskRemainingLTC - allBidsFromdb[i].bidAmountLTC;
          if (totoalAskRemainingLTC >= currentBidDetails.bidAmountLTC) {
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingLTC == 0::: " + totoalAskRemainingLTC);

            if (totoalAskRemainingLTC == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingLTC == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: askDetails.askownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerLTC :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.LTCbalance) + parseFloat(currentBidDetails.bidAmountLTC));
              var updatedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.LTCbalance);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(currentBidDetails.bidAmountLTC);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 LTC Update user " + updatedLTCbalanceBidder);
              //var txFeesBidderLTC = (parseFloat(currentBidDetails.bidAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));

              // var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              // console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              // //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
              // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);
              // console.log("After deduct TX Fees of LTC Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerLTC
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  LTCbalance: updatedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
              //var updatedFreezedLTCbalanceAsker = parseFloat(totoalAskRemainingLTC);
              //var updatedFreezedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
              //var updatedFreezedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(userAskAmountLTC)) + parseFloat(totoalAskRemainingLTC));
              var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
              updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(userAskAmountLTC);
              updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.plus(totoalAskRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainLTC userAllDetailsInDBAsker.FreezedLTCbalance " + userAllDetailsInDBAsker.FreezedLTCbalance);
              console.log("Total Ask RemainLTC updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var BTCAmountSucess = (parseFloat(userAskAmountBTC) - parseFloat(totoalAskRemainingBTC));
              var BTCAmountSucess = new BigNumber(userAskAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalAskRemainingBTC);
              //var txFeesAskerBTC = (parseFloat(updatedBTCbalanceAsker) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(BTCAmountSucess);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of LTC Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceAsker ::: " + updatedFreezedLTCbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerLTC
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedLTCbalance: updatedFreezedLTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidLTC.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidLTC.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidLTC.update({
                  id: currentBidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              sails.sockets.blast(constants.LTC_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskLTC.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskLTC.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskLTC.update({
                  id: askDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              sails.sockets.blast(constants.LTC_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingLTC == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerLTC " + currentBidDetails.bidownerLTC);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + JSON.stringify(userAllDetailsInDBBidder));
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);

              //var updatedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.LTCbalance) + parseFloat(currentBidDetails.bidAmountLTC));
              var updatedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.LTCbalance);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(currentBidDetails.bidAmountLTC);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of LTC Update user " + updatedLTCbalanceBidder);
              //var txFeesBidderLTC = (parseFloat(currentBidDetails.bidAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              // var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              // console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              // //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
              // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);
              // console.log("After deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedLTCbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerLTC
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  LTCbalance: updatedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidLTC.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidLTC.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.LTC_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerLTC
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update Bid
            //var updatedBidAmountBTC = (parseFloat(currentBidDetails.bidAmountBTC) - parseFloat(totoalAskRemainingBTC));
            var updatedBidAmountBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            updatedBidAmountBTC = updatedBidAmountBTC.minus(totoalAskRemainingBTC);
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);

            try {
              var updatedaskDetails = await BidLTC.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountLTC: updatedBidAmountLTC,
                status: statusTwo,
                statusName: statusTwoPending,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update socket.io
            sails.sockets.blast(constants.LTC_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerLTC
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBTCbalance) - parseFloat(totoalAskRemainingBTC));
            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(totoalAskRemainingBTC);


            //var updatedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.LTCbalance) + parseFloat(totoalAskRemainingLTC));

            var updatedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.LTCbalance);
            updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(totoalAskRemainingLTC);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of LTC Update user " + updatedLTCbalanceBidder);
            //var LTCAmountSucess = parseFloat(totoalAskRemainingLTC);
            //var LTCAmountSucess = new BigNumber(totoalAskRemainingLTC);
            //var txFeesBidderLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
            //var txFeesBidderLTC = (parseFloat(totoalAskRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));



            // var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            //
            // //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
            // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

            console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
            console.log("After deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedLTCbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerLTC
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                LTCbalance: updatedLTCbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerLTC");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(userAskAmountLTC));
            var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
            updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(userAskAmountLTC);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of LTC Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerLTC
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedLTCbalance: updatedFreezedLTCbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskLTC.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskLTC.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskLTC.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //emitting event for LTC_ask destruction
            sails.sockets.blast(constants.LTC_ASK_DESTROYED, askDestroy);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          }
        }
      }
    }
    console.log("Total Bid ::: " + total_bid);
    return res.json({
      "message": "Your ask placed successfully!!",
      statusCode: 200
    });
  },
  addBidLTCMarket: async function(req, res) {
    console.log("Enter into ask api addBidLTCMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountLTC || !userBidAmountBTC ||
      !userBidRate || !userBid1ownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Invalid parameter!!!!",
        statusCode: 400
      });
    }
    try {
      var userBidder = await User.findOne({
        id: userBid1ownerId
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    if (!userBidder) {
      return res.json({
        "message": "Invalid Id!",
        statusCode: 401
      });
    }
    console.log("Getting user details !! !");
    var userBTCBalanceInDb = new BigNumber(userBidder.BTCbalance);
    var userFreezedBTCBalanceInDb = new BigNumber(userBidder.FreezedBTCbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountBTC = new BigNumber(userBidAmountBTC);
    if (userBidAmountBTC.greaterThanOrEqualTo(userBTCBalanceInDb)) {
      return res.json({
        "message": "You have insufficient BTC Balance",
        statusCode: 401
      });
    }
    userBidAmountBTC = parseFloat(userBidAmountBTC);
    try {
      var bidDetails = await BidLTC.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountLTC: userBidAmountLTC,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountLTC: userBidAmountLTC,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerLTC: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.LTC_BID_ADDED, bidDetails);

    console.log("Bid created .........");
    //var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) - parseFloat(userBidAmountBTC));
    var updateUserBTCBalance = new BigNumber(userBTCBalanceInDb);
    updateUserBTCBalance = updateUserBTCBalance.minus(userBidAmountBTC);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedBTCBalance = (parseFloat(userFreezedBTCBalanceInDb) + parseFloat(userBidAmountBTC));
    var updateFreezedBTCBalance = new BigNumber(userBidder.FreezedBTCbalance);
    updateFreezedBTCBalance = updateFreezedBTCBalance.plus(userBidAmountBTC);

    console.log("Updating user's bid details sdfyrtyupdateFreezedBTCBalance  " + updateFreezedBTCBalance);
    console.log("Updating user's bid details asdfasdf updateUserBTCBalance  " + updateUserBTCBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedBTCbalance: parseFloat(updateFreezedBTCBalance),
        BTCbalance: parseFloat(updateUserBTCBalance),
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    try {
      var allAsksFromdb = await AskLTC.find({
        askRate: {
          'like': parseFloat(userBidRate)
        },
        marketId: {
          'like': BTCMARKETID
        },
        status: {
          'like': statusTwo
        }
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }
    console.log("Getting all bids details.............");
    if (allAsksFromdb) {
      if (allAsksFromdb.length >= 1) {
        //Find exact bid if available in db
        var total_ask = 0;
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of LTC
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountLTC;
        }
        if (total_ask <= totoalBidRemainingLTC) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingLTC = totoalBidRemainingLTC - allAsksFromdb[i].bidAmountLTC;
            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingLTC == 0::: " + totoalBidRemainingLTC);
            if (totoalBidRemainingLTC == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingLTC == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerLTC totoalBidRemainingLTC == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(currentAskDetails.askAmountLTC));
              var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
              updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(currentAskDetails.askAmountLTC);
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of LTC Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedLTCbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerLTC
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              try {
                var BidderuserAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and LTC  give to bidder
              //var updatedLTCbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.LTCbalance) + parseFloat(totoalBidRemainingLTC)) - parseFloat(totoalBidRemainingBTC);
              //var updatedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.LTCbalance) + parseFloat(userBidAmountLTC)) - parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.LTCbalance);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(userBidAmountLTC);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(totoalBidRemainingLTC);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainLTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainLTC BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainLTC updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);
              //var LTCAmountSucess = (parseFloat(userBidAmountLTC) - parseFloat(totoalBidRemainingLTC));
              // var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              // LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);
              //
              // //var txFeesBidderLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
              // var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              //
              // console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              // //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
              // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

              console.log("After deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingLTC == 0updatedLTCbalanceBidder ::: " + updatedLTCbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingLTC asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerLTC
                }, {
                  LTCbalance: updatedLTCbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingLTC == 0BidLTC.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidLTC.destroy({
              //   id: bidDetails.bidownerLTC
              // });
              try {
                var bidDestroy = await BidLTC.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              sails.sockets.blast(constants.LTC_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingLTC == 0AskLTC.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskLTC.destroy({
              //   id: currentAskDetails.askownerLTC
              // });
              try {
                var askDestroy = await AskLTC.update({
                  id: currentAskDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              sails.sockets.blast(constants.LTC_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC == 0  enter into else of totoalBidRemainingLTC == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingLTC == 0start User.findOne currentAskDetails.bidownerLTC ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingLTC == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(currentAskDetails.askAmountLTC));
              var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
              updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(currentAskDetails.askAmountLTC);
              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);
              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

              console.log("After deduct TX Fees of LTC Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingLTC == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingLTC == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerLTC
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingLTC == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskLTC.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskLTC.update({
                  id: currentAskDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              sails.sockets.blast(constants.LTC_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingLTC == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingLTC == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerLTC");
              //var updatedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.LTCbalance) + parseFloat(userBidAmountLTC)) - parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.LTCbalance);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(userBidAmountLTC);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(totoalBidRemainingLTC);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainLTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainLTC BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainLTC updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);
              //var LTCAmountSucess = (parseFloat(userBidAmountLTC) - parseFloat(totoalBidRemainingLTC));
              // var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              // LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);
              //
              // //var txFeesBidderLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
              // var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              //
              // console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              // //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
              // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);
              // console.log("After deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedLTCbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerLTC
                }, {
                  LTCbalance: updatedLTCbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountLTC totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidLTC.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountLTC: totoalBidRemainingLTC,
                  status: statusTwo,
                  statusName: statusTwoPending
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              sails.sockets.blast(constants.LTC_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingLTC = totoalBidRemainingLTC - allAsksFromdb[i].bidAmountLTC;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingLTC == 0::: " + totoalBidRemainingLTC);

              if (totoalBidRemainingLTC == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingLTC == 0Enter into totoalBidRemainingLTC == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerLTC
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                try {
                  var userAllDetailsInDBBidder = await User.findOne({
                    id: bidDetails.bidownerLTC
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingLTC == 0userAll bidDetails.askownerLTC :: ");
                console.log(" totoalBidRemainingLTC == 0Update value of Bidder and asker");
                //var updatedFreezedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(currentAskDetails.askAmountLTC));
                var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
                updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(currentAskDetails.askAmountLTC);

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

                console.log("After deduct TX Fees of LTC Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingLTC == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingLTC == 0updatedFreezedLTCbalanceAsker ::: " + updatedFreezedLTCbalanceAsker);
                console.log(" totoalBidRemainingLTC == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerLTC
                  }, {
                    FreezedLTCbalance: updatedFreezedLTCbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.LTCbalance) + parseFloat(userBidAmountLTC)) - parseFloat(totoalBidRemainingLTC));

                var updatedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.LTCbalance);
                updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(userBidAmountLTC);
                updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(totoalBidRemainingLTC);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainLTC totoalAskRemainingLTC " + totoalBidRemainingBTC);
                console.log("Total Ask RemainLTC BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainLTC updatedFreezedLTCbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);
                //var LTCAmountSucess = (parseFloat(userBidAmountLTC) - parseFloat(totoalBidRemainingLTC));
                // var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                // LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);
                //
                //
                // //var txFeesBidderLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
                // var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                // console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
                // //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
                // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
                //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
                updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);



                console.log("After deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingLTC == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingLTC == 0 updatedFreezedLTCbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerLTC
                  }, {
                    LTCbalance: updatedLTCbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingLTC == 0 BidLTC.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskLTC.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskLTC.update({
                    id: currentAskDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                sails.sockets.blast(constants.LTC_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingLTC == 0 AskLTC.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidLTC.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidLTC.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.LTC_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingLTC == 0 enter into else of totoalBidRemainingLTC == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingLTC == 0totoalBidRemainingLTC == 0 start User.findOne currentAskDetails.bidownerLTC " + currentAskDetails.askownerLTC);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerLTC
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingLTC == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(currentAskDetails.askAmountLTC));

                var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
                updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(currentAskDetails.askAmountLTC);

                //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(currentAskDetails.askAmountBTC));
                var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(currentAskDetails.askAmountBTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                //var txFeesAskerBTC = (parseFloat(currentAskDetails.askAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
                var txFeesAskerBTC = new BigNumber(currentAskDetails.askAmountBTC);
                txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

                console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
                //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
                updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
                console.log("After deduct TX Fees of LTC Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingLTC == 0 updatedFreezedLTCbalanceAsker:: " + updatedFreezedLTCbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingLTC == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerLTC
                  }, {
                    FreezedLTCbalance: updatedFreezedLTCbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingLTC == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskLTC.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskLTC.update({
                    id: currentAskDetails.id
                  }, {
                    status: statusOne,
                    statusName: statusOneSuccessfull,
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    "message": "Failed with an error",
                    statusCode: 200
                  });
                }
                sails.sockets.blast(constants.LTC_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));

              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskLTC.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountLTC: updatedAskAmountLTC,
                  status: statusTwo,
                  statusName: statusTwoPending,
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              sails.sockets.blast(constants.LTC_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedLTCbalance);
              updatedFreezedLTCbalanceAsker = updatedFreezedLTCbalanceAsker.minus(totoalBidRemainingLTC);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainLTC totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainLTC userAllDetailsInDBAsker.FreezedLTCbalance " + userAllDetailsInDBAsker.FreezedLTCbalance);
              console.log("Total Ask RemainLTC updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of LTC Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedLTCbalanceAsker:: " + updatedFreezedLTCbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedLTCbalanceAsker " + updatedFreezedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerLTC
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: bidDetails.bidownerLTC
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerLTC");
              //var updatedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.LTCbalance) + parseFloat(userBidAmountLTC));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountLTC " + userBidAmountLTC);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.LTCbalance " + userAllDetailsInDBBidder.LTCbalance);

              var updatedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.LTCbalance);
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.plus(userBidAmountLTC);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);
              //var txFeesBidderLTC = (parseFloat(updatedLTCbalanceBidder) * parseFloat(txFeeWithdrawSuccessLTC));
              // var txFeesBidderLTC = new BigNumber(userBidAmountLTC);
              // txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              //
              // console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              // //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
              // updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderLTC = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderLTC :: " + txFeesBidderLTC);
              //updatedLTCbalanceBidder = (parseFloat(updatedLTCbalanceBidder) - parseFloat(txFeesBidderLTC));
              updatedLTCbalanceBidder = updatedLTCbalanceBidder.minus(txFeesBidderLTC);

              console.log("After deduct TX Fees of LTC Update user " + updatedLTCbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedLTCbalanceBidder ::: " + updatedLTCbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedLTCbalanceBidder " + updatedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerLTC
                }, {
                  LTCbalance: updatedLTCbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidLTC.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidLTC.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidLTC.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
              } catch (e) {
                return res.json({
                  error: e,
                  "message": "Failed with an error",
                  statusCode: 200
                });
              }
              sails.sockets.blast(constants.LTC_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC Bid destroy successfully desctroyCurrentBid ::");
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            }
          }
        }
      }
      return res.json({
        "message": "Your bid placed successfully!!",
        statusCode: 200
      });
    } else {
      //No bid match on this rate Ask and Ask placed successfully
      return res.json({
        "message": "Your bid placed successfully!!",
        statusCode: 200
      });
    }
  },
  removeBidLTCMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdLTC;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidLTC.findOne({
      bidownerLTC: bidownerId,
      id: userBidId,
      marketId: {
        'like': BTCMARKETID
      },
      status: {
        '!': [statusOne, statusThree]
      }
    }).exec(function(err, bidDetails) {
      if (err) {
        return res.json({
          "message": "Error to find bid",
          statusCode: 400
        });
      }
      if (!bidDetails) {
        return res.json({
          "message": "No Bid found for this user",
          statusCode: 400
        });
      }
      console.log("Valid bid details !!!" + JSON.stringify(bidDetails));
      User.findOne({
        id: bidownerId
      }).exec(function(err, user) {
        if (err) {
          return res.json({
            "message": "Error to find user",
            statusCode: 401
          });
        }
        if (!user) {
          return res.json({
            "message": "Invalid email!",
            statusCode: 401
          });
        }
        var userBTCBalanceInDb = parseFloat(user.BTCbalance);
        var bidAmountOfBTCInBidTableDB = parseFloat(bidDetails.bidAmountBTC);
        var userFreezedBTCbalanceInDB = parseFloat(user.FreezedBTCbalance);
        var updateFreezedBalance = (parseFloat(userFreezedBTCbalanceInDB) - parseFloat(bidAmountOfBTCInBidTableDB));
        var updateUserBTCBalance = (parseFloat(userBTCBalanceInDb) + parseFloat(bidAmountOfBTCInBidTableDB));
        console.log("userBTCBalanceInDb :" + userBTCBalanceInDb);
        console.log("bidAmountOfBTCInBidTableDB :" + bidAmountOfBTCInBidTableDB);
        console.log("userFreezedBTCbalanceInDB :" + userFreezedBTCbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserBTCBalance :" + updateUserBTCBalance);

        User.update({
            id: bidownerId
          }, {
            BTCbalance: parseFloat(updateUserBTCBalance),
            FreezedBTCbalance: parseFloat(updateFreezedBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BTC balance");
              return res.json({
                "message": "Error to update User values",
                statusCode: 400
              });
            }
            console.log("Removing bid !!!");
            BidLTC.update({
              id: userBidId
            }, {
              status: statusThree,
              statusName: statusThreeCancelled
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.LTC_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskLTCMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdLTC;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskLTC.findOne({
      askownerLTC: askownerId,
      id: userAskId,
      status: {
        '!': [statusOne, statusThree]
      },
      marketId: {
        'like': BTCMARKETID
      },
    }).exec(function(err, askDetails) {
      if (err) {
        return res.json({
          "message": "Error to find ask",
          statusCode: 400
        });
      }
      if (!askDetails) {
        return res.json({
          "message": "No ask found for this user",
          statusCode: 400
        });
      }
      console.log("Valid ask details !!!" + JSON.stringify(askDetails));
      User.findOne({
        id: askownerId
      }).exec(function(err, user) {
        if (err) {
          return res.json({
            "message": "Error to find user",
            statusCode: 401
          });
        }
        if (!user) {
          return res.json({
            "message": "Invalid email!",
            statusCode: 401
          });
        }
        var userLTCBalanceInDb = parseFloat(user.LTCbalance);
        var askAmountOfLTCInAskTableDB = parseFloat(askDetails.askAmountLTC);
        var userFreezedLTCbalanceInDB = parseFloat(user.FreezedLTCbalance);
        console.log("userLTCBalanceInDb :" + userLTCBalanceInDb);
        console.log("askAmountOfLTCInAskTableDB :" + askAmountOfLTCInAskTableDB);
        console.log("userFreezedLTCbalanceInDB :" + userFreezedLTCbalanceInDB);
        var updateFreezedLTCBalance = (parseFloat(userFreezedLTCbalanceInDB) - parseFloat(askAmountOfLTCInAskTableDB));
        var updateUserLTCBalance = (parseFloat(userLTCBalanceInDb) + parseFloat(askAmountOfLTCInAskTableDB));
        User.update({
            id: askownerId
          }, {
            LTCbalance: parseFloat(updateUserLTCBalance),
            FreezedLTCbalance: parseFloat(updateFreezedLTCBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BTC balance");
              return res.json({
                "message": "Error to update User values",
                statusCode: 400
              });
            }
            console.log("Removing ask !!!");
            AskLTC.update({
              id: userAskId
            }, {
              status: statusThree,
              statusName: statusThreeCancelled
            }).exec(function(err, bid) {
              if (err) {
                return res.json({
                  "message": "Error to remove bid",
                  statusCode: 400
                });
              }
              sails.sockets.blast(constants.LTC_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidLTC: function(req, res) {
    console.log("Enter into ask api getAllBidLTC :: ");
    BidLTC.find({
        status: {
          '!': [statusOne, statusThree]
        },
        marketId: {
          'like': BTCMARKETID
        }
      })
      .sort('bidRate DESC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get Ask !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskLTC Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidLTC.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountLTC')
              .exec(function(err, bidAmountLTCSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountLTCSum",
                    statusCode: 401
                  });
                }
                BidLTC.find({
                    status: {
                      '!': [statusOne, statusThree]
                    },
                    marketId: {
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountLTCSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsLTC: allAskDetailsToExecute,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No BidLTC Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllAskLTC: function(req, res) {
    console.log("Enter into ask api getAllAskLTC :: ");
    AskLTC.find({
        status: {
          '!': [statusOne, statusThree]
        },
        marketId: {
          'like': BTCMARKETID
        }
      })
      .sort('askRate ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get Ask !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskLTC Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskLTC.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountLTC')
              .exec(function(err, askAmountLTCSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountLTCSum",
                    statusCode: 401
                  });
                }
                AskLTC.find({
                    status: {
                      '!': [statusOne, statusThree]
                    },
                    marketId: {
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountLTCSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksLTC: allAskDetailsToExecute,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskLTC Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsLTCSuccess: function(req, res) {
    console.log("Enter into ask api getBidsLTCSuccess :: ");
    BidLTC.find({
        status: {
          'like': statusOne
        },
        marketId: {
          'like': BTCMARKETID
        }
      })
      .sort('createTimeUTC ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get Ask !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No bidLTC Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidLTC.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountLTC')
              .exec(function(err, bidAmountLTCSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountLTCSum",
                    statusCode: 401
                  });
                }
                BidLTC.find({
                    status: {
                      'like': statusOne
                    },
                    marketId: {
                      'like': BTCMARKETID
                    }
                  })
                  .sum('bidAmountBTC')
                  .exec(function(err, bidAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountLTCSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsLTC: allAskDetailsToExecute,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No BidLTC Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAsksLTCSuccess: function(req, res) {
    console.log("Enter into ask api getAsksLTCSuccess :: ");
    AskLTC.find({
        status: {
          'like': statusOne
        },
        marketId: {
          'like': BTCMARKETID
        }
      })
      .sort('createTimeUTC ASC')
      .exec(function(err, allAskDetailsToExecute) {
        if (err) {
          return res.json({
            "message": "Error found to get Ask !!",
            statusCode: 401
          });
        }
        if (!allAskDetailsToExecute) {
          return res.json({
            "message": "No AskLTC Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskLTC.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountLTC')
              .exec(function(err, askAmountLTCSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountLTCSum",
                    statusCode: 401
                  });
                }
                AskLTC.find({
                    status: {
                      'like': statusOne
                    },
                    marketId: {
                      'like': BTCMARKETID
                    }
                  })
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountLTCSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksLTC: allAskDetailsToExecute,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskLTC Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
};