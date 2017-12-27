/**
 * TrademarketBTCVCNController
 *VCN
 * @description :: Server-side logic for managing trademarketbtcinrs
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

  addAskVCNMarket: async function(req, res) {
    console.log("Enter into ask api addAskVCNMarket : : " + JSON.stringify(req.body));
    var userAskAmountBTC = new BigNumber(req.body.askAmountBTC);
    var userAskAmountVCN = new BigNumber(req.body.askAmountVCN);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountVCN || !userAskAmountBTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountVCN < 0 || userAskAmountBTC < 0 || userAskRate < 0) {
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
    var userVCNBalanceInDb = new BigNumber(userAsker.VCNbalance);
    var userFreezedVCNBalanceInDb = new BigNumber(userAsker.FreezedVCNbalance);

    userVCNBalanceInDb = parseFloat(userVCNBalanceInDb);
    userFreezedVCNBalanceInDb = parseFloat(userFreezedVCNBalanceInDb);
    console.log("asdf");
    var userIdInDb = userAsker.id;
    if (userAskAmountVCN.greaterThanOrEqualTo(userVCNBalanceInDb)) {
      return res.json({
        "message": "You have insufficient VCN Balance",
        statusCode: 401
      });
    }
    console.log("qweqwe");
    console.log("userAskAmountVCN :: " + userAskAmountVCN);
    console.log("userVCNBalanceInDb :: " + userVCNBalanceInDb);
    // if (userAskAmountVCN >= userVCNBalanceInDb) {
    //   return res.json({
    //     "message": "You have insufficient VCN Balance",
    //     statusCode: 401
    //   });
    // }



    userAskAmountBTC = parseFloat(userAskAmountBTC);
    userAskAmountVCN = parseFloat(userAskAmountVCN);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskVCN.create({
        askAmountBTC: userAskAmountBTC,
        askAmountVCN: userAskAmountVCN,
        totalaskAmountBTC: userAskAmountBTC,
        totalaskAmountVCN: userAskAmountVCN,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        askownerVCN: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed in creating bid',
        statusCode: 401
      });
    }
    //blasting the bid creation event
    sails.sockets.blast(constants.VCN_ASK_ADDED, askDetails);
    // var updateUserVCNBalance = (parseFloat(userVCNBalanceInDb) - parseFloat(userAskAmountVCN));
    // var updateFreezedVCNBalance = (parseFloat(userFreezedVCNBalanceInDb) + parseFloat(userAskAmountVCN));

    // x = new BigNumber(0.3)   x.plus(y)
    // x.minus(0.1)
    userVCNBalanceInDb = new BigNumber(userVCNBalanceInDb);
    var updateUserVCNBalance = userVCNBalanceInDb.minus(userAskAmountVCN);
    updateUserVCNBalance = parseFloat(updateUserVCNBalance);
    userFreezedVCNBalanceInDb = new BigNumber(userFreezedVCNBalanceInDb);
    var updateFreezedVCNBalance = userFreezedVCNBalanceInDb.plus(userAskAmountVCN);
    updateFreezedVCNBalance = parseFloat(updateFreezedVCNBalance);
    try {
      var userUpdateAsk = await User.update({
        id: userIdInDb
      }, {
        FreezedVCNbalance: updateFreezedVCNBalance,
        VCNbalance: updateUserVCNBalance
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed to update user',
        statusCode: 401
      });
    }
    try {
      var allBidsFromdb = await BidVCN.find({
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
        message: 'Failed to find VCN bid like user ask rate',
        statusCode: 401
      });
    }
    console.log("Total number bids on same  :: " + allBidsFromdb.length);
    var total_bid = 0;
    if (allBidsFromdb.length >= 1) {
      //Find exact bid if available in db
      var totoalAskRemainingVCN = new BigNumber(userAskAmountVCN);
      var totoalAskRemainingBTC = new BigNumber(userAskAmountBTC);
      //this loop for sum of all Bids amount of VCN
      for (var i = 0; i < allBidsFromdb.length; i++) {
        total_bid = total_bid + allBidsFromdb[i].bidAmountVCN;
      }
      if (total_bid <= totoalAskRemainingVCN) {
        console.log("Inside of total_bid <= totoalAskRemainingVCN");
        for (var i = 0; i < allBidsFromdb.length; i++) {
          console.log("Inside of For Loop total_bid <= totoalAskRemainingVCN");
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " Before totoalAskRemainingVCN :: " + totoalAskRemainingVCN);
          console.log(currentBidDetails.id + " Before totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          // totoalAskRemainingVCN = (parseFloat(totoalAskRemainingVCN) - parseFloat(currentBidDetails.bidAmountVCN));
          // totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
          totoalAskRemainingVCN = totoalAskRemainingVCN.minus(currentBidDetails.bidAmountVCN);
          totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingVCN :: " + totoalAskRemainingVCN);
          console.log(currentBidDetails.id + " After totoalAskRemainingBTC :: " + totoalAskRemainingBTC);

          if (totoalAskRemainingVCN == 0) {
            //destroy bid and ask and update bidder and asker balances and break
            console.log("Enter into totoalAskRemainingVCN == 0");
            try {
              var userAllDetailsInDBBidder = await User.findOne({
                id: currentBidDetails.bidownerVCN
              });
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerVCN
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to find bid/ask with bid/ask owner',
                statusCode: 401
              });
            }
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(currentBidDetails.bidAmountVCN));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.VCNbalance);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(currentBidDetails.bidAmountVCN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees12312 of VCN Update user " + updatedVCNbalanceBidder);
            //var txFeesBidderVCN = (parseFloat(currentBidDetails.bidAmountVCN) * parseFloat(txFeeWithdrawSuccessVCN));
            // var txFeesBidderVCN = new BigNumber(currentBidDetails.bidAmountVCN);
            //
            // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN)
            // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
            // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


            //updatedVCNbalanceBidder =  parseFloat(updatedVCNbalanceBidder);

            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf111 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                VCNbalance: updatedVCNbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users freezed and VCN balance',
                statusCode: 401
              });
            }

            //Workding.................asdfasdf
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);
            //var updatedFreezedVCNbalanceAsker = parseFloat(totoalAskRemainingVCN);
            //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);

            //updatedFreezedVCNbalanceAsker =  parseFloat(updatedFreezedVCNbalanceAsker);
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
            console.log("After deduct TX Fees of VCN Update user " + updatedBTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf112 totoalAskRemainingBTC " + totoalAskRemainingBTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedVCNbalance: updatedFreezedVCNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BTCBalance and Freezed VCNBalance',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Updating success Of bidVCN:: ");
            try {
              var bidDestroy = await BidVCN.update({
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
            sails.sockets.blast(constants.VCN_BID_DESTROYED, bidDestroy);
            console.log(currentBidDetails.id + " AskVCN.destroy askDetails.id::: " + askDetails.id);

            try {
              var askDestroy = await AskVCN.update({
                id: askDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull,
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update AskVCN',
                statusCode: 401
              });
            }
            //emitting event of destruction of VCN_ask
            sails.sockets.blast(constants.VCN_ASK_DESTROYED, askDestroy);
            console.log("Ask Executed successfully and Return!!!");
            return res.json({
              "message": "Ask Executed successfully",
              statusCode: 200
            });
          } else {
            //destroy bid
            console.log(currentBidDetails.id + " enter into else of totoalAskRemainingVCN == 0");
            console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerVCN " + currentBidDetails.bidownerVCN);
            var userAllDetailsInDBBidder = await User.findOne({
              id: currentBidDetails.bidownerVCN
            });
            console.log(currentBidDetails.id + " Find all details of  userAllDetailsInDBBidder:: " + userAllDetailsInDBBidder.email);
            // var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
            // var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(currentBidDetails.bidAmountVCN));

            var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
            updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
            var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.VCNbalance);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(currentBidDetails.bidAmountVCN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct TX Fees of VCN 089089Update user " + updatedVCNbalanceBidder);
            // var txFeesBidderVCN = (parseFloat(currentBidDetails.bidAmountVCN) * parseFloat(txFeeWithdrawSuccessVCN));
            // var txFeesBidderVCN = new BigNumber(currentBidDetails.bidAmountVCN);
            // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
            // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            // // updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
            // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

            var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
            //updatedFreezedBTCbalanceBidder =  parseFloat(updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedVCNbalanceBidder:: " + updatedVCNbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf113 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                VCNbalance: updatedVCNbalanceBidder
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
              var desctroyCurrentBid = await BidVCN.update({
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
            sails.sockets.blast(constants.VCN_BID_DESTROYED, desctroyCurrentBid);
            console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::");
          }
          console.log(currentBidDetails.id + "index index == allBidsFromdb.length - 1 ");
          if (i == allBidsFromdb.length - 1) {
            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");
            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerVCN
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerVCN");
            //var updatedBTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC)) - parseFloat(totoalAskRemainingBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(totoalAskRemainingBTC);

            //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(totoalAskRemainingVCN));
            //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
            console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
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
            console.log("After deduct TX Fees of VCN Update user " + updatedBTCbalanceAsker);
            //updatedBTCbalanceAsker =  parseFloat(updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf114 totoalAskRemainingBTC " + totoalAskRemainingBTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedVCNbalance: updatedFreezedVCNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBTC totoalAskRemainingBTC " + totoalAskRemainingBTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskVCN.update({
                id: askDetails.id
              }, {
                askAmountBTC: parseFloat(totoalAskRemainingBTC),
                askAmountVCN: parseFloat(totoalAskRemainingVCN),
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
            sails.sockets.blast(constants.VCN_ASK_DESTROYED, updatedaskDetails);
          }
        }
      } else {
        for (var i = 0; i < allBidsFromdb.length; i++) {
          currentBidDetails = allBidsFromdb[i];
          console.log(currentBidDetails.id + " totoalAskRemainingVCN :: " + totoalAskRemainingVCN);
          console.log(currentBidDetails.id + " totoalAskRemainingBTC :: " + totoalAskRemainingBTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingVCN = totoalAskRemainingVCN - allBidsFromdb[i].bidAmountVCN;
          if (totoalAskRemainingVCN >= currentBidDetails.bidAmountVCN) {
            //totoalAskRemainingVCN = (parseFloat(totoalAskRemainingVCN) - parseFloat(currentBidDetails.bidAmountVCN));
            totoalAskRemainingVCN = totoalAskRemainingVCN.minus(currentBidDetails.bidAmountVCN);
            //totoalAskRemainingBTC = (parseFloat(totoalAskRemainingBTC) - parseFloat(currentBidDetails.bidAmountBTC));
            totoalAskRemainingBTC = totoalAskRemainingBTC.minus(currentBidDetails.bidAmountBTC);
            console.log("start from here totoalAskRemainingVCN == 0::: " + totoalAskRemainingVCN);

            if (totoalAskRemainingVCN == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalAskRemainingVCN == 0");
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerVCN
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
                  id: askDetails.askownerVCN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log("userAll askDetails.askownerVCN :: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(currentBidDetails.bidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(currentBidDetails.bidAmountBTC);
              //var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(currentBidDetails.bidAmountVCN));
              var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(currentBidDetails.bidAmountVCN);
              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of42342312 VCN Update user " + updatedVCNbalanceBidder);
              //var txFeesBidderVCN = (parseFloat(currentBidDetails.bidAmountVCN) * parseFloat(txFeeWithdrawSuccessVCN));

              // var txFeesBidderVCN = new BigNumber(currentBidDetails.bidAmountVCN);
              // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
              // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);
              // console.log("After deduct TX Fees of VCN Update user rtert updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf115 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerVCN
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  VCNbalance: updatedVCNbalanceBidder
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
              //var updatedFreezedVCNbalanceAsker = parseFloat(totoalAskRemainingVCN);
              //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(totoalAskRemainingVCN));
              //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
              var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("userAllDetailsInDBAsker.BTCbalance " + userAllDetailsInDBAsker.BTCbalance);
              console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
              console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
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

              console.log("After deduct TX Fees of VCN Update user " + updatedBTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBTCbalanceAsker updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: asdf116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf116 totoalAskRemainingBTC " + totoalAskRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerVCN
                }, {
                  BTCbalance: updatedBTCbalanceAsker,
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentBidDetails.id + " BidVCN.destroy currentBidDetails.id::: " + currentBidDetails.id);
              // var bidDestroy = await BidVCN.destroy({
              //   id: currentBidDetails.id
              // });
              try {
                var bidDestroy = await BidVCN.update({
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
              sails.sockets.blast(constants.VCN_BID_DESTROYED, bidDestroy);
              console.log(currentBidDetails.id + " AskVCN.destroy askDetails.id::: " + askDetails.id);
              // var askDestroy = await AskVCN.destroy({
              //   id: askDetails.id
              // });
              try {
                var askDestroy = await AskVCN.update({
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
              sails.sockets.blast(constants.VCN_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Ask Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentBidDetails.id + " enter into else of totoalAskRemainingVCN == 0");
              console.log(currentBidDetails.id + " start User.findOne currentBidDetails.bidownerVCN " + currentBidDetails.bidownerVCN);
              try {
                var userAllDetailsInDBBidder = await User.findOne({
                  id: currentBidDetails.bidownerVCN
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

              //var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(currentBidDetails.bidAmountVCN));
              var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(currentBidDetails.bidAmountVCN);
              //Deduct Transation Fee Bidder
              console.log("Before deducta7567 TX Fees of VCN Update user " + updatedVCNbalanceBidder);
              //var txFeesBidderVCN = (parseFloat(currentBidDetails.bidAmountVCN) * parseFloat(txFeeWithdrawSuccessVCN));
              // var txFeesBidderVCN = new BigNumber(currentBidDetails.bidAmountVCN);
              // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
              // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);
              // console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

              var txFeesBidderBTC = new BigNumber(currentBidDetails.bidAmountBTC);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedVCNbalanceBidder:: sadfsdf updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf117 totoalAskRemainingBTC " + totoalAskRemainingBTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerVCN
                }, {
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                  VCNbalance: updatedVCNbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                })
              }
              console.log(currentBidDetails.id + " userAllDetailsInDBBidderUpdate ::" + userAllDetailsInDBBidderUpdate);
              // var desctroyCurrentBid = await BidVCN.destroy({
              //   id: currentBidDetails.id
              // });
              var desctroyCurrentBid = await BidVCN.update({
                id: currentBidDetails.id
              }, {
                status: statusOne,
                statusName: statusOneSuccessfull
              });
              sails.sockets.blast(constants.VCN_BID_DESTROYED, desctroyCurrentBid);
              console.log(currentBidDetails.id + "Bid destroy successfully desctroyCurrentBid ::" + JSON.stringify(desctroyCurrentBid));
            }
          } else {
            //destroy ask and update bid and  update asker and bidder and break

            console.log(currentBidDetails.id + " userAll Details :: ");
            console.log(currentBidDetails.id + " enter into i == allBidsFromdb.length - 1");

            try {
              var userAllDetailsInDBAsker = await User.findOne({
                id: askDetails.askownerVCN
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
            //var updatedBidAmountVCN = (parseFloat(currentBidDetails.bidAmountVCN) - parseFloat(totoalAskRemainingVCN));
            var updatedBidAmountVCN = new BigNumber(currentBidDetails.bidAmountVCN);
            updatedBidAmountVCN = updatedBidAmountVCN.minus(totoalAskRemainingVCN);

            try {
              var updatedaskDetails = await BidVCN.update({
                id: currentBidDetails.id
              }, {
                bidAmountBTC: updatedBidAmountBTC,
                bidAmountVCN: updatedBidAmountVCN,
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
            sails.sockets.blast(constants.VCN_BID_DESTROYED, bidDestroy);
            //Update Bidder===========================================
            try {
              var userAllDetailsInDBBiddder = await User.findOne({
                id: currentBidDetails.bidownerVCN
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


            //var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.VCNbalance) + parseFloat(totoalAskRemainingVCN));

            var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.VCNbalance);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(totoalAskRemainingVCN);

            //Deduct Transation Fee Bidder
            console.log("Before deduct8768678 TX Fees of VCN Update user " + updatedVCNbalanceBidder);
            //var VCNAmountSucess = parseFloat(totoalAskRemainingVCN);
            //var VCNAmountSucess = new BigNumber(totoalAskRemainingVCN);
            //var txFeesBidderVCN = (parseFloat(VCNAmountSucess) * parseFloat(txFeeWithdrawSuccessVCN));
            //var txFeesBidderVCN = (parseFloat(totoalAskRemainingVCN) * parseFloat(txFeeWithdrawSuccessVCN));



            // var txFeesBidderVCN = new BigNumber(totoalAskRemainingVCN);
            // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
            //
            // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
            // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

            //Need to change here ...111...............askDetails
            var txFeesBidderBTC = new BigNumber(totoalAskRemainingBTC);
            txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
            var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentBidDetails.bidRate);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBTCbalanceBidder:: " + updatedFreezedBTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedVCNbalanceBidder:asdfasdf:updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf118 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedBTCbalance: updatedFreezedBTCbalanceBidder,
                VCNbalance: updatedVCNbalanceBidder
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Update asker ===========================================

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBTC i == allBidsFromdb.length - 1 askDetails.askownerVCN");
            //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(userAskAmountBTC));
            var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(userAskAmountBTC);

            //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            //var txFeesAskerBTC = (parseFloat(userAskAmountBTC) * parseFloat(txFeeWithdrawSuccessBTC));
            var txFeesAskerBTC = new BigNumber(userAskAmountBTC);
            txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

            console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
            console.log("userAllDetailsInDBAsker.BTCbalance :: " + userAllDetailsInDBAsker.BTCbalance);
            //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
            updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);

            console.log("After deduct TX Fees of VCN Update user " + updatedBTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker safsdfsdfupdatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf119 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf119 totoalAskRemainingBTC " + totoalAskRemainingBTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                BTCbalance: updatedBTCbalanceAsker,
                FreezedVCNbalance: updatedFreezedVCNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed with an error',
                statusCode: 401
              });
            }
            //Destroy Ask===========================================
            console.log(currentBidDetails.id + " AskVCN.destroy askDetails.id::: " + askDetails.id);
            // var askDestroy = await AskVCN.destroy({
            //   id: askDetails.id
            // });
            try {
              var askDestroy = await AskVCN.update({
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
            //emitting event for VCN_ask destruction
            sails.sockets.blast(constants.VCN_ASK_DESTROYED, askDestroy);
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
  addBidVCNMarket: async function(req, res) {
    console.log("Enter into ask api addBidVCNMarket :: " + JSON.stringify(req.body));
    var userBidAmountBTC = new BigNumber(req.body.bidAmountBTC);
    var userBidAmountVCN = new BigNumber(req.body.bidAmountVCN);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBTC = parseFloat(userBidAmountBTC);
    userBidAmountVCN = parseFloat(userBidAmountVCN);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountVCN || !userBidAmountBTC ||
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
      var bidDetails = await BidVCN.create({
        bidAmountBTC: userBidAmountBTC,
        bidAmountVCN: userBidAmountVCN,
        totalbidAmountBTC: userBidAmountBTC,
        totalbidAmountVCN: userBidAmountVCN,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BTCMARKETID,
        bidownerVCN: userIdInDb
      });
    } catch (e) {
      return res.json({
        error: e,
        message: 'Failed with an error',
        statusCode: 401
      });
    }

    //emitting event for bid creation
    sails.sockets.blast(constants.VCN_BID_ADDED, bidDetails);

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
      var allAsksFromdb = await AskVCN.find({
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
        var totoalBidRemainingVCN = new BigNumber(userBidAmountVCN);
        var totoalBidRemainingBTC = new BigNumber(userBidAmountBTC);
        //this loop for sum of all Bids amount of VCN
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountVCN;
        }
        if (total_ask <= totoalBidRemainingVCN) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingVCN :: " + totoalBidRemainingVCN);
            console.log(currentAskDetails.id + " totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingVCN = totoalBidRemainingVCN - allAsksFromdb[i].bidAmountVCN;
            //totoalBidRemainingVCN = (parseFloat(totoalBidRemainingVCN) - parseFloat(currentAskDetails.askAmountVCN));
            totoalBidRemainingVCN = totoalBidRemainingVCN.minus(currentAskDetails.askAmountVCN);

            //totoalBidRemainingBTC = (parseFloat(totoalBidRemainingBTC) - parseFloat(currentAskDetails.askAmountBTC));
            totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
            console.log("start from here totoalBidRemainingVCN == 0::: " + totoalBidRemainingVCN);
            if (totoalBidRemainingVCN == 0) {
              //destroy bid and ask and update bidder and asker balances and break
              console.log("Enter into totoalBidRemainingVCN == 0");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerVCN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              console.log("userAll bidDetails.askownerVCN totoalBidRemainingVCN == 0:: ");
              console.log("Update value of Bidder and asker");
              //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(currentAskDetails.askAmountVCN));
              var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(currentAskDetails.askAmountVCN);
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
              console.log("After deduct TX Fees of VCN Update user d gsdfgdf  " + updatedBTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedVCNbalance balance of asker deducted and BTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBTC " + totoalBidRemainingBTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
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
                  id: bidDetails.bidownerVCN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //current bid details Bidder updated
              //Bid FreezedBTCbalance of bidder deduct and VCN  give to bidder
              //var updatedVCNbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.VCNbalance) + parseFloat(totoalBidRemainingVCN)) - parseFloat(totoalBidRemainingBTC);
              //var updatedVCNbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.VCNbalance) + parseFloat(userBidAmountVCN)) - parseFloat(totoalBidRemainingVCN));
              var updatedVCNbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(totoalBidRemainingVCN);
              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + BidderuserAllDetailsInDBBidder.FreezedBTCbalance);
              console.log("Total Ask RemainVCN updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");


              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
              //var VCNAmountSucess = (parseFloat(userBidAmountVCN) - parseFloat(totoalBidRemainingVCN));
              // var VCNAmountSucess = new BigNumber(userBidAmountVCN);
              // VCNAmountSucess = VCNAmountSucess.minus(totoalBidRemainingVCN);
              //
              // //var txFeesBidderVCN = (parseFloat(VCNAmountSucess) * parseFloat(txFeeWithdrawSuccessVCN));
              // var txFeesBidderVCN = new BigNumber(VCNAmountSucess);
              // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
              //
              // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingVCN == 0updatedVCNbalanceBidder ::: " + updatedVCNbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingVCN asdf== updatedFreezedBTCbalanceBidder updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
                  FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "asdf totoalBidRemainingVCN == 0BidVCN.destroy currentAskDetails.id::: " + currentAskDetails.id);
              // var bidDestroy = await BidVCN.destroy({
              //   id: bidDetails.bidownerVCN
              // });
              try {
                var bidDestroy = await BidVCN.update({
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
              sails.sockets.blast(constants.VCN_BID_DESTROYED, bidDestroy);
              console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0AskVCN.destroy bidDetails.id::: " + bidDetails.id);
              // var askDestroy = await AskVCN.destroy({
              //   id: currentAskDetails.askownerVCN
              // });
              try {
                var askDestroy = await AskVCN.update({
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
              sails.sockets.blast(constants.VCN_ASK_DESTROYED, askDestroy);
              return res.json({
                "message": "Bid Executed successfully",
                statusCode: 200
              });
            } else {
              //destroy bid
              console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0  enter into else of totoalBidRemainingVCN == 0");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == 0start User.findOne currentAskDetails.bidownerVCN ");
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerVCN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == 0 Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
              //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(currentAskDetails.askAmountVCN));
              var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(currentAskDetails.askAmountVCN);
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

              console.log("After deduct TX Fees of VCN Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == 0updaasdfsdftedBTCbalanceBidder updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBTC " + totoalBidRemainingBTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                  BTCbalance: updatedBTCbalanceAsker
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == 0userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
              // var destroyCurrentAsk = await AskVCN.destroy({
              //   id: currentAskDetails.id
              // });
              try {
                var destroyCurrentAsk = await AskVCN.update({
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

              sails.sockets.blast(constants.VCN_ASK_DESTROYED, destroyCurrentAsk);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == 0Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));

            }
            console.log(currentAskDetails.id + "   else of totoalBidRemainingVCN == 0 index index == allAsksFromdb.length - 1 ");
            if (i == allAsksFromdb.length - 1) {

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1userAll Details :: ");
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 enter into i == allBidsFromdb.length - 1");

              try {
                var userAllDetailsInDBBid = await User.findOne({
                  id: bidDetails.bidownerVCN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerVCN");
              //var updatedVCNbalanceBidder = ((parseFloat(userAllDetailsInDBBid.VCNbalance) + parseFloat(userBidAmountVCN)) - parseFloat(totoalBidRemainingVCN));
              var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBid.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(totoalBidRemainingVCN);

              //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
              //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBid.FreezedBTCbalance);
              console.log("Total Ask RemainVCN updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
              //var VCNAmountSucess = (parseFloat(userBidAmountVCN) - parseFloat(totoalBidRemainingVCN));
              // var VCNAmountSucess = new BigNumber(userBidAmountVCN);
              // VCNAmountSucess = VCNAmountSucess.minus(totoalBidRemainingVCN);
              //
              // //var txFeesBidderVCN = (parseFloat(VCNAmountSucess) * parseFloat(txFeeWithdrawSuccessVCN));
              // var txFeesBidderVCN = new BigNumber(VCNAmountSucess);
              // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
              //
              // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);
              // console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);



              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedVCNbalanceAsker updatedFreezedBTCbalanceBidder::: " + updatedFreezedBTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountVCN totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidVCN.update({
                  id: bidDetails.id
                }, {
                  bidAmountBTC: totoalBidRemainingBTC,
                  bidAmountVCN: totoalBidRemainingVCN,
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
              sails.sockets.blast(constants.VCN_BID_DESTROYED, updatedbidDetails);

            }

          }
        } else {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1totoalBidRemainingVCN :: " + totoalBidRemainingVCN);
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBTC :: " + totoalBidRemainingBTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingVCN = totoalBidRemainingVCN - allAsksFromdb[i].bidAmountVCN;
            if (totoalBidRemainingBTC >= currentAskDetails.askAmountBTC) {
              totoalBidRemainingVCN = totoalBidRemainingVCN.minus(currentAskDetails.askAmountVCN);
              totoalBidRemainingBTC = totoalBidRemainingBTC.minus(currentAskDetails.askAmountBTC);
              console.log(" else of i == allAsksFromdb.length - 1start from here totoalBidRemainingVCN == 0::: " + totoalBidRemainingVCN);

              if (totoalBidRemainingVCN == 0) {
                //destroy bid and ask and update bidder and asker balances and break
                console.log(" totoalBidRemainingVCN == 0Enter into totoalBidRemainingVCN == 0");
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerVCN
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
                    id: bidDetails.bidownerVCN
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(" totoalBidRemainingVCN == 0userAll bidDetails.askownerVCN :: ");
                console.log(" totoalBidRemainingVCN == 0Update value of Bidder and asker");
                //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(currentAskDetails.askAmountVCN));
                var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
                updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(currentAskDetails.askAmountVCN);

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

                console.log("After deduct TX Fees of VCN Update user " + updatedBTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingVCN == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingVCN == 0updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);
                console.log(" totoalBidRemainingVCN == 0updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBTCbalanceAsker " + updatedBTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerVCN
                  }, {
                    FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                //var updatedVCNbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(userBidAmountVCN)) - parseFloat(totoalBidRemainingVCN));

                var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.VCNbalance);
                updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);
                updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(totoalBidRemainingVCN);

                //var updatedFreezedBTCbalanceBidder = parseFloat(totoalBidRemainingBTC);
                //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(totoalBidRemainingBTC));
                //var updatedFreezedBTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC)) + parseFloat(totoalBidRemainingBTC));
                var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.plus(totoalBidRemainingBTC);
                updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalBidRemainingBTC);
                console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedBTCbalance " + userAllDetailsInDBBidder.FreezedBTCbalance);
                console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedBTCbalanceBidder);
                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

                //Deduct Transation Fee Bidder
                console.log("Before deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
                //var VCNAmountSucess = (parseFloat(userBidAmountVCN) - parseFloat(totoalBidRemainingVCN));
                // var VCNAmountSucess = new BigNumber(userBidAmountVCN);
                // VCNAmountSucess = VCNAmountSucess.minus(totoalBidRemainingVCN);
                //
                //
                // //var txFeesBidderVCN = (parseFloat(VCNAmountSucess) * parseFloat(txFeeWithdrawSuccessVCN));
                // var txFeesBidderVCN = new BigNumber(VCNAmountSucess);
                // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
                // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
                // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
                // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

                var BTCAmountSucess = new BigNumber(userBidAmountBTC);
                BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

                var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
                txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
                var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
                //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
                updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);



                console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0 updatedBTCbalanceAsker ::: " + updatedBTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0 updatedFreezedVCNbalaasdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerVCN
                  }, {
                    VCNbalance: updatedVCNbalanceBidder,
                    FreezedBTCbalance: updatedFreezedBTCbalanceBidder
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0 BidVCN.destroy currentAskDetails.id::: " + currentAskDetails.id);
                // var askDestroy = await AskVCN.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var askDestroy = await AskVCN.update({
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
                sails.sockets.blast(constants.VCN_ASK_DESTROYED, askDestroy);
                console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0 AskVCN.destroy bidDetails.id::: " + bidDetails.id);
                // var bidDestroy = await BidVCN.destroy({
                //   id: bidDetails.id
                // });
                var bidDestroy = await BidVCN.update({
                  id: bidDetails.id
                }, {
                  status: statusOne,
                  statusName: statusOneSuccessfull
                });
                sails.sockets.blast(constants.VCN_BID_DESTROYED, bidDestroy);
                return res.json({
                  "message": "Bid Executed successfully",
                  statusCode: 200
                });
              } else {
                //destroy bid
                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0 enter into else of totoalBidRemainingVCN == 0");
                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0totoalBidRemainingVCN == 0 start User.findOne currentAskDetails.bidownerVCN " + currentAskDetails.askownerVCN);
                try {
                  var userAllDetailsInDBAsker = await User.findOne({
                    id: currentAskDetails.askownerVCN
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0Find all details of  userAllDetailsInDBAsker:: " + JSON.stringify(userAllDetailsInDBAsker));
                //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(currentAskDetails.askAmountVCN));

                var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
                updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(currentAskDetails.askAmountVCN);

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
                console.log("After deduct TX Fees of VCN Update user " + updatedBTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0 updatedFreezedVCNbalanceAsker:: " + updatedFreezedVCNbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0 updatedBTCbalance asd asd updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBTC " + totoalBidRemainingBTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerVCN
                  }, {
                    FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                    BTCbalance: updatedBTCbalanceAsker
                  });
                } catch (e) {
                  return res.json({
                    error: e,
                    message: 'Failed with an error',
                    statusCode: 401
                  });
                }
                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0 userAllDetailsInDBAskerUpdate ::" + userAllDetailsInDBAskerUpdate);
                // var destroyCurrentAsk = await AskVCN.destroy({
                //   id: currentAskDetails.id
                // });
                try {
                  var destroyCurrentAsk = await AskVCN.update({
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
                sails.sockets.blast(constants.VCN_ASK_DESTROYED, destroyCurrentAsk);
                console.log(currentAskDetails.id + "Bid destroy successfully destroyCurrentAsk ::" + JSON.stringify(destroyCurrentAsk));
              }
            } else {
              //destroy ask and update bid and  update asker and bidder and break
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountVCN = (parseFloat(currentAskDetails.askAmountVCN) - parseFloat(totoalBidRemainingVCN));

              var updatedAskAmountVCN = new BigNumber(currentAskDetails.askAmountVCN);
              updatedAskAmountVCN = updatedAskAmountVCN.minus(totoalBidRemainingVCN);

              //var updatedAskAmountBTC = (parseFloat(currentAskDetails.askAmountBTC) - parseFloat(totoalBidRemainingBTC));
              var updatedAskAmountBTC = new BigNumber(currentAskDetails.askAmountBTC);
              updatedAskAmountBTC = updatedAskAmountBTC.minus(totoalBidRemainingBTC);
              try {
                var updatedaskDetails = await AskVCN.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBTC: updatedAskAmountBTC,
                  askAmountVCN: updatedAskAmountVCN,
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
              sails.sockets.blast(constants.VCN_ASK_DESTROYED, updatedaskDetails);
              //Update Asker===========================================11
              try {
                var userAllDetailsInDBAsker = await User.findOne({
                  id: currentAskDetails.askownerVCN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(totoalBidRemainingVCN));
              var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(totoalBidRemainingVCN);

              //var updatedBTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BTCbalance) + parseFloat(totoalBidRemainingBTC));
              var updatedBTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BTCbalance);
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.plus(totoalBidRemainingBTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingBTC " + totoalBidRemainingBTC);
              console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
              console.log("Total Ask RemainVCN updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              //var txFeesAskerBTC = (parseFloat(totoalBidRemainingBTC) * parseFloat(txFeeWithdrawSuccessBTC));
              var txFeesAskerBTC = new BigNumber(totoalBidRemainingBTC);
              txFeesAskerBTC = txFeesAskerBTC.times(txFeeWithdrawSuccessBTC);

              console.log("txFeesAskerBTC ::: " + txFeesAskerBTC);
              //updatedBTCbalanceAsker = (parseFloat(updatedBTCbalanceAsker) - parseFloat(txFeesAskerBTC));
              updatedBTCbalanceAsker = updatedBTCbalanceAsker.minus(txFeesAskerBTC);
              console.log("After deduct TX Fees of VCN Update user " + updatedBTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC updatedFreezedVCNbalanceAsker:: " + updatedFreezedVCNbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails asdfasd .askAmountBTC updatedBTCbalanceAsker:: " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBTCbalanceAsker " + updatedBTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
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
                  id: bidDetails.bidownerVCN
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Update bidder =========================================== 11
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC enter into userAskAmountBTC i == allBidsFromdb.length - 1 bidDetails.askownerVCN");
              //var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(userBidAmountVCN));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userBidAmountVCN " + userBidAmountVCN);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBTC >= currentAskDetails.askAmountBTC userAllDetailsInDBBidder.VCNbalance " + userAllDetailsInDBBidder.VCNbalance);

              var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);


              //var updatedFreezedBTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBTCbalance) - parseFloat(userBidAmountBTC));
              var updatedFreezedBTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBTCbalance);
              updatedFreezedBTCbalanceBidder = updatedFreezedBTCbalanceBidder.minus(userBidAmountBTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
              //var txFeesBidderVCN = (parseFloat(updatedVCNbalanceBidder) * parseFloat(txFeeWithdrawSuccessVCN));
              // var txFeesBidderVCN = new BigNumber(userBidAmountVCN);
              // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
              //
              // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              var BTCAmountSucess = new BigNumber(userBidAmountBTC);
              //              BTCAmountSucess = BTCAmountSucess.minus(totoalBidRemainingBTC);

              var txFeesBidderBTC = new BigNumber(BTCAmountSucess);
              txFeesBidderBTC = txFeesBidderBTC.times(txFeeWithdrawSuccessBTC);
              var txFeesBidderVCN = txFeesBidderBTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBTC ::: " + userBidAmountBTC);
              console.log("BTCAmountSucess ::: " + BTCAmountSucess);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC asdf updatedVCNbalanceBidder ::: " + updatedVCNbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAsk asdfasd fDetails.askAmountBTC asdf updatedFreezedBTCbalanceBidder ::: " + updatedFreezedBTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBTCbalanceBidder " + updatedFreezedBTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBTC " + totoalBidRemainingBTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBTC >= currentAskDetails.askAmountBTC BidVCN.destroy bidDetails.id::: " + bidDetails.id);
              // var bidDestroy = await BidVCN.destroy({
              //   id: bidDetails.id
              // });
              try {
                var bidDestroy = await BidVCN.update({
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
              sails.sockets.blast(constants.VCN_BID_DESTROYED, bidDestroy);
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
  removeBidVCNMarket: function(req, res) {
    console.log("Enter into bid api removeBid :: ");
    var userBidId = req.body.bidIdVCN;
    var bidownerId = req.body.bidownerId;
    if (!userBidId || !bidownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    BidVCN.findOne({
      bidownerVCN: bidownerId,
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
            BidVCN.update({
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
              sails.sockets.blast(constants.VCN_BID_DESTROYED, bid);
              return res.json({
                "message": "Bid removed successfully!!!",
                statusCode: 200
              });
            });

          });
      });
    });
  },
  removeAskVCNMarket: function(req, res) {
    console.log("Enter into ask api removeAsk :: ");
    var userAskId = req.body.askIdVCN;
    var askownerId = req.body.askownerId;
    if (!userAskId || !askownerId) {
      console.log("User Entered invalid parameter !!!");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    AskVCN.findOne({
      askownerVCN: askownerId,
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
        var userVCNBalanceInDb = parseFloat(user.VCNbalance);
        var askAmountOfVCNInAskTableDB = parseFloat(askDetails.askAmountVCN);
        var userFreezedVCNbalanceInDB = parseFloat(user.FreezedVCNbalance);
        console.log("userVCNBalanceInDb :" + userVCNBalanceInDb);
        console.log("askAmountOfVCNInAskTableDB :" + askAmountOfVCNInAskTableDB);
        console.log("userFreezedVCNbalanceInDB :" + userFreezedVCNbalanceInDB);
        var updateFreezedVCNBalance = (parseFloat(userFreezedVCNbalanceInDB) - parseFloat(askAmountOfVCNInAskTableDB));
        var updateUserVCNBalance = (parseFloat(userVCNBalanceInDb) + parseFloat(askAmountOfVCNInAskTableDB));
        User.update({
            id: askownerId
          }, {
            VCNbalance: parseFloat(updateUserVCNBalance),
            FreezedVCNbalance: parseFloat(updateFreezedVCNBalance)
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
            AskVCN.update({
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
              sails.sockets.blast(constants.VCN_ASK_DESTROYED, bid);
              return res.json({
                "message": "Ask removed successfully!!",
                statusCode: 200
              });
            });
          });
      });
    });
  },
  getAllBidVCN: function(req, res) {
    console.log("Enter into ask api getAllBidVCN :: ");
    BidVCN.find({
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
            "message": "No AskVCN Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidVCN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountVCN')
              .exec(function(err, bidAmountVCNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountVCNSum",
                    statusCode: 401
                  });
                }
                BidVCN.find({
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
                        "message": "Error to sum Of bidAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsVCN: allAskDetailsToExecute,
                      bidAmountVCNSum: bidAmountVCNSum[0].bidAmountVCN,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No BidVCN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAllAskVCN: function(req, res) {
    console.log("Enter into ask api getAllAskVCN :: ");
    AskVCN.find({
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
            "message": "No AskVCN Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskVCN.find({
                status: {
                  '!': [statusOne, statusThree]
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountVCN')
              .exec(function(err, askAmountVCNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountVCNSum",
                    statusCode: 401
                  });
                }
                AskVCN.find({
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
                        "message": "Error to sum Of askAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksVCN: allAskDetailsToExecute,
                      askAmountVCNSum: askAmountVCNSum[0].askAmountVCN,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskVCN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getBidsVCNSuccess: function(req, res) {
    console.log("Enter into ask api getBidsVCNSuccess :: ");
    BidVCN.find({
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
            "message": "No bidVCN Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            BidVCN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('bidAmountVCN')
              .exec(function(err, bidAmountVCNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of bidAmountVCNSum",
                    statusCode: 401
                  });
                }
                BidVCN.find({
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
                        "message": "Error to sum Of bidAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsVCN: allAskDetailsToExecute,
                      bidAmountVCNSum: bidAmountVCNSum[0].bidAmountVCN,
                      bidAmountBTCSum: bidAmountBTCSum[0].bidAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No BidVCN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
  getAsksVCNSuccess: function(req, res) {
    console.log("Enter into ask api getAsksVCNSuccess :: ");
    AskVCN.find({
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
            "message": "No AskVCN Found!!",
            statusCode: 401
          });
        }
        if (allAskDetailsToExecute) {
          if (allAskDetailsToExecute.length >= 1) {
            AskVCN.find({
                status: {
                  'like': statusOne
                },
                marketId: {
                  'like': BTCMARKETID
                }
              })
              .sum('askAmountVCN')
              .exec(function(err, askAmountVCNSum) {
                if (err) {
                  return res.json({
                    "message": "Error to sum Of askAmountVCNSum",
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
                  .sum('askAmountBTC')
                  .exec(function(err, askAmountBTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksVCN: allAskDetailsToExecute,
                      askAmountVCNSum: askAmountVCNSum[0].askAmountVCN,
                      askAmountBTCSum: askAmountBTCSum[0].askAmountBTC,
                      statusCode: 200
                    });
                  });
              });
          } else {
            return res.json({
              "message": "No AskVCN Found!!",
              statusCode: 401
            });
          }
        }
      });
  },
};