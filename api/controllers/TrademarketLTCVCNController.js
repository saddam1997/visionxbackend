/**
 * TrademarketLTCVCNController
 *
 * @description :: Server-side logic for managing trademarketltcvcns
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
const txFeeWithdrawSuccessLTC = sails.config.common.txFeeWithdrawSuccessLTC;
const LTCMARKETID = sails.config.common.LTCMARKETID;

module.exports = {
  addAskVCNMarket: async function(req, res) {
    console.log("Enter into ask api addAskVCNMarket : : " + JSON.stringify(req.body));
    var userAskAmountLTC = new BigNumber(req.body.askAmountLTC);
    var userAskAmountVCN = new BigNumber(req.body.askAmountVCN);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountVCN || !userAskAmountLTC || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountVCN < 0 || userAskAmountLTC < 0 || userAskRate < 0) {
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



    userAskAmountLTC = parseFloat(userAskAmountLTC);
    userAskAmountVCN = parseFloat(userAskAmountVCN);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskVCN.create({
        askAmountLTC: userAskAmountLTC,
        askAmountVCN: userAskAmountVCN,
        totalaskAmountLTC: userAskAmountLTC,
        totalaskAmountVCN: userAskAmountVCN,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
          'like': LTCMARKETID
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
      var totoalAskRemainingLTC = new BigNumber(userAskAmountLTC);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          // totoalAskRemainingVCN = (parseFloat(totoalAskRemainingVCN) - parseFloat(currentBidDetails.bidAmountVCN));
          // totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
          totoalAskRemainingVCN = totoalAskRemainingVCN.minus(currentBidDetails.bidAmountVCN);
          totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);


          console.log(currentBidDetails.id + " After totoalAskRemainingVCN :: " + totoalAskRemainingVCN);
          console.log(currentBidDetails.id + " After totoalAskRemainingLTC :: " + totoalAskRemainingLTC);

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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(currentBidDetails.bidAmountVCN));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


            //updatedVCNbalanceBidder =  parseFloat(updatedVCNbalanceBidder);

            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf111 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf111 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
            //var updatedFreezedVCNbalanceAsker = parseFloat(totoalAskRemainingVCN);
            //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);

            //updatedFreezedVCNbalanceAsker =  parseFloat(updatedFreezedVCNbalanceAsker);
            //Deduct Transation Fee Asker
            //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var LTCAmountSucess = new BigNumber(userAskAmountLTC);
            LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Before deduct TX Fees of Update Asker Amount LTC updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
            updatedLTCbalanceAsker = parseFloat(updatedLTCbalanceAsker);
            console.log("After deduct TX Fees of VCN Update user " + updatedLTCbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf112 totoalAskRemainingLTC " + totoalAskRemainingLTC);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedVCNbalance: updatedFreezedVCNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users LTCBalance and Freezed VCNBalance',
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
            // var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
            // var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(currentBidDetails.bidAmountVCN));

            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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

            var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
            //updatedFreezedLTCbalanceBidder =  parseFloat(updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedVCNbalanceBidder:: " + updatedVCNbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf113 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf113 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerVCN");
            //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);

            //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(totoalAskRemainingVCN));
            //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
            console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var LTCAmountSucess = new BigNumber(userAskAmountLTC);
            LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);

            //var txFeesAskerLTC = (parseFloat(LTCAmountSucess) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of VCN Update user " + updatedLTCbalanceAsker);
            //updatedLTCbalanceAsker =  parseFloat(updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf114 totoalAskRemainingLTC " + totoalAskRemainingLTC);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
                FreezedVCNbalance: updatedFreezedVCNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountLTC totoalAskRemainingLTC " + totoalAskRemainingLTC);
            console.log(currentBidDetails.id + " Update In last Ask askAmountVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskVCN.update({
                id: askDetails.id
              }, {
                askAmountLTC: parseFloat(totoalAskRemainingLTC),
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
          console.log(currentBidDetails.id + " totoalAskRemainingLTC :: " + totoalAskRemainingLTC);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingVCN = totoalAskRemainingVCN - allBidsFromdb[i].bidAmountVCN;
          if (totoalAskRemainingVCN >= currentBidDetails.bidAmountVCN) {
            //totoalAskRemainingVCN = (parseFloat(totoalAskRemainingVCN) - parseFloat(currentBidDetails.bidAmountVCN));
            totoalAskRemainingVCN = totoalAskRemainingVCN.minus(currentBidDetails.bidAmountVCN);
            //totoalAskRemainingLTC = (parseFloat(totoalAskRemainingLTC) - parseFloat(currentBidDetails.bidAmountLTC));
            totoalAskRemainingLTC = totoalAskRemainingLTC.minus(currentBidDetails.bidAmountLTC);
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);
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
              // console.log("After deduct TX Fees of VCN Update user rtert updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf115 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf115 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerVCN
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
                  VCNbalance: updatedVCNbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedLTCbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC)) - parseFloat(totoalAskRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(totoalAskRemainingLTC);
              //var updatedFreezedVCNbalanceAsker = parseFloat(totoalAskRemainingVCN);
              //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(totoalAskRemainingVCN));
              //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
              var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("userAllDetailsInDBAsker.LTCbalance " + userAllDetailsInDBAsker.LTCbalance);
              console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
              console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var LTCAmountSucess = (parseFloat(userAskAmountLTC) - parseFloat(totoalAskRemainingLTC));
              var LTCAmountSucess = new BigNumber(userAskAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalAskRemainingLTC);
              //var txFeesAskerLTC = (parseFloat(updatedLTCbalanceAsker) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(LTCAmountSucess);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

              console.log("After deduct TX Fees of VCN Update user " + updatedLTCbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedLTCbalanceAsker updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: asdf116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf116 totoalAskRemainingLTC " + totoalAskRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerVCN
                }, {
                  LTCbalance: updatedLTCbalanceAsker,
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
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(currentBidDetails.bidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(currentBidDetails.bidAmountLTC);

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

              var txFeesBidderLTC = new BigNumber(currentBidDetails.bidAmountLTC);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
              console.log(currentBidDetails.id + " updatedVCNbalanceBidder:: sadfsdf updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: asdf117 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf117 totoalAskRemainingLTC " + totoalAskRemainingLTC);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerVCN
                }, {
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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
            //var updatedBidAmountLTC = (parseFloat(currentBidDetails.bidAmountLTC) - parseFloat(totoalAskRemainingLTC));
            var updatedBidAmountLTC = new BigNumber(currentBidDetails.bidAmountLTC);
            updatedBidAmountLTC = updatedBidAmountLTC.minus(totoalAskRemainingLTC);
            //var updatedBidAmountVCN = (parseFloat(currentBidDetails.bidAmountVCN) - parseFloat(totoalAskRemainingVCN));
            var updatedBidAmountVCN = new BigNumber(currentBidDetails.bidAmountVCN);
            updatedBidAmountVCN = updatedBidAmountVCN.minus(totoalAskRemainingVCN);

            try {
              var updatedaskDetails = await BidVCN.update({
                id: currentBidDetails.id
              }, {
                bidAmountLTC: updatedBidAmountLTC,
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
            //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedLTCbalance) - parseFloat(totoalAskRemainingLTC));
            var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedLTCbalance);
            updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(totoalAskRemainingLTC);


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
            var txFeesBidderLTC = new BigNumber(totoalAskRemainingLTC);
            txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
            var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentBidDetails.bidRate);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedLTCbalanceBidder:: " + updatedFreezedLTCbalanceBidder);
            console.log(currentBidDetails.id + " updatedVCNbalanceBidder:asdfasdf:updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
            console.log("Before Update :: asdf118 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf118 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedLTCbalance: updatedFreezedLTCbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountLTC i == allBidsFromdb.length - 1 askDetails.askownerVCN");
            //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(userAskAmountLTC));
            var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(userAskAmountLTC);

            //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            //var txFeesAskerLTC = (parseFloat(userAskAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
            var txFeesAskerLTC = new BigNumber(userAskAmountLTC);
            txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

            console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
            console.log("userAllDetailsInDBAsker.LTCbalance :: " + userAllDetailsInDBAsker.LTCbalance);
            //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
            updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

            console.log("After deduct TX Fees of VCN Update user " + updatedLTCbalanceAsker);

            console.log(currentBidDetails.id + " updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker safsdfsdfupdatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf119 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf119 totoalAskRemainingLTC " + totoalAskRemainingLTC);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                LTCbalance: updatedLTCbalanceAsker,
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
    var userBidAmountLTC = new BigNumber(req.body.bidAmountLTC);
    var userBidAmountVCN = new BigNumber(req.body.bidAmountVCN);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountLTC = parseFloat(userBidAmountLTC);
    userBidAmountVCN = parseFloat(userBidAmountVCN);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountVCN || !userBidAmountLTC ||
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
    var userLTCBalanceInDb = new BigNumber(userBidder.LTCbalance);
    var userFreezedLTCBalanceInDb = new BigNumber(userBidder.FreezedLTCbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountLTC = new BigNumber(userBidAmountLTC);
    if (userBidAmountLTC.greaterThanOrEqualTo(userLTCBalanceInDb)) {
      return res.json({
        "message": "You have insufficient LTC Balance",
        statusCode: 401
      });
    }
    userBidAmountLTC = parseFloat(userBidAmountLTC);
    try {
      var bidDetails = await BidVCN.create({
        bidAmountLTC: userBidAmountLTC,
        bidAmountVCN: userBidAmountVCN,
        totalbidAmountLTC: userBidAmountLTC,
        totalbidAmountVCN: userBidAmountVCN,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: LTCMARKETID,
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
    //var updateUserLTCBalance = (parseFloat(userLTCBalanceInDb) - parseFloat(userBidAmountLTC));
    var updateUserLTCBalance = new BigNumber(userLTCBalanceInDb);
    updateUserLTCBalance = updateUserLTCBalance.minus(userBidAmountLTC);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedLTCBalance = (parseFloat(userFreezedLTCBalanceInDb) + parseFloat(userBidAmountLTC));
    var updateFreezedLTCBalance = new BigNumber(userBidder.FreezedLTCbalance);
    updateFreezedLTCBalance = updateFreezedLTCBalance.plus(userBidAmountLTC);

    console.log("Updating user's bid details sdfyrtyupdateFreezedLTCBalance  " + updateFreezedLTCBalance);
    console.log("Updating user's bid details asdfasdf updateUserLTCBalance  " + updateUserLTCBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedLTCbalance: parseFloat(updateFreezedLTCBalance),
        LTCbalance: parseFloat(updateUserLTCBalance),
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
          'like': LTCMARKETID
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
        var totoalBidRemainingLTC = new BigNumber(userBidAmountLTC);
        //this loop for sum of all Bids amount of VCN
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountVCN;
        }
        if (total_ask <= totoalBidRemainingVCN) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingVCN :: " + totoalBidRemainingVCN);
            console.log(currentAskDetails.id + " totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingVCN = totoalBidRemainingVCN - allAsksFromdb[i].bidAmountVCN;
            //totoalBidRemainingVCN = (parseFloat(totoalBidRemainingVCN) - parseFloat(currentAskDetails.askAmountVCN));
            totoalBidRemainingVCN = totoalBidRemainingVCN.minus(currentAskDetails.askAmountVCN);

            //totoalBidRemainingLTC = (parseFloat(totoalBidRemainingLTC) - parseFloat(currentAskDetails.askAmountLTC));
            totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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
              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of VCN Update user d gsdfgdf  " + updatedLTCbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedVCNbalance balance of asker deducted and LTC to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingLTC " + totoalBidRemainingLTC);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              //Bid FreezedLTCbalance of bidder deduct and VCN  give to bidder
              //var updatedVCNbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.VCNbalance) + parseFloat(totoalBidRemainingVCN)) - parseFloat(totoalBidRemainingLTC);
              //var updatedVCNbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.VCNbalance) + parseFloat(userBidAmountVCN)) - parseFloat(totoalBidRemainingVCN));
              var updatedVCNbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(totoalBidRemainingVCN);
              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + BidderuserAllDetailsInDBBidder.FreezedLTCbalance);
              console.log("Total Ask RemainVCN updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingVCN == 0updatedVCNbalanceBidder ::: " + updatedVCNbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingVCN asdf== updatedFreezedLTCbalanceBidder updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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
              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);
              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

              console.log("After deduct TX Fees of VCN Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == 0updaasdfsdftedLTCbalanceBidder updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingLTC " + totoalBidRemainingLTC);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerVCN");
              //var updatedVCNbalanceBidder = ((parseFloat(userAllDetailsInDBBid.VCNbalance) + parseFloat(userBidAmountVCN)) - parseFloat(totoalBidRemainingVCN));
              var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBid.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(totoalBidRemainingVCN);

              //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
              //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBid.FreezedLTCbalance);
              console.log("Total Ask RemainVCN updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
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



              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedVCNbalanceAsker updatedFreezedLTCbalanceBidder::: " + updatedFreezedLTCbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountLTC totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountVCN totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidVCN.update({
                  id: bidDetails.id
                }, {
                  bidAmountLTC: totoalBidRemainingLTC,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingLTC :: " + totoalBidRemainingLTC);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingVCN = totoalBidRemainingVCN - allAsksFromdb[i].bidAmountVCN;
            if (totoalBidRemainingLTC >= currentAskDetails.askAmountLTC) {
              totoalBidRemainingVCN = totoalBidRemainingVCN.minus(currentAskDetails.askAmountVCN);
              totoalBidRemainingLTC = totoalBidRemainingLTC.minus(currentAskDetails.askAmountLTC);
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

                //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
                var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
                var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
                txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

                console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
                //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);

                console.log("After deduct TX Fees of VCN Update user " + updatedLTCbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingVCN == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingVCN == 0updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);
                console.log(" totoalBidRemainingVCN == 0updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedLTCbalanceAsker " + updatedLTCbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerVCN
                  }, {
                    FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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

                //var updatedFreezedLTCbalanceBidder = parseFloat(totoalBidRemainingLTC);
                //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(totoalBidRemainingLTC));
                //var updatedFreezedLTCbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC)) + parseFloat(totoalBidRemainingLTC));
                var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.plus(totoalBidRemainingLTC);
                updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalBidRemainingLTC);
                console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedLTCbalance " + userAllDetailsInDBBidder.FreezedLTCbalance);
                console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedLTCbalanceBidder);
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

                var LTCAmountSucess = new BigNumber(userBidAmountLTC);
                LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

                var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
                txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
                var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
                //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
                updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);



                console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0 updatedLTCbalanceAsker ::: " + updatedLTCbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0 updatedFreezedVCNbalaasdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerVCN
                  }, {
                    VCNbalance: updatedVCNbalanceBidder,
                    FreezedLTCbalance: updatedFreezedLTCbalanceBidder
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

                //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(currentAskDetails.askAmountLTC));
                var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(currentAskDetails.askAmountLTC);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                //var txFeesAskerLTC = (parseFloat(currentAskDetails.askAmountLTC) * parseFloat(txFeeWithdrawSuccessLTC));
                var txFeesAskerLTC = new BigNumber(currentAskDetails.askAmountLTC);
                txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

                console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
                //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
                updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
                console.log("After deduct TX Fees of VCN Update user " + updatedLTCbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0 updatedFreezedVCNbalanceAsker:: " + updatedFreezedVCNbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0 updatedLTCbalance asd asd updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingLTC " + totoalBidRemainingLTC);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerVCN
                  }, {
                    FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                    LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountVCN = (parseFloat(currentAskDetails.askAmountVCN) - parseFloat(totoalBidRemainingVCN));

              var updatedAskAmountVCN = new BigNumber(currentAskDetails.askAmountVCN);
              updatedAskAmountVCN = updatedAskAmountVCN.minus(totoalBidRemainingVCN);

              //var updatedAskAmountLTC = (parseFloat(currentAskDetails.askAmountLTC) - parseFloat(totoalBidRemainingLTC));
              var updatedAskAmountLTC = new BigNumber(currentAskDetails.askAmountLTC);
              updatedAskAmountLTC = updatedAskAmountLTC.minus(totoalBidRemainingLTC);
              try {
                var updatedaskDetails = await AskVCN.update({
                  id: currentAskDetails.id
                }, {
                  askAmountLTC: updatedAskAmountLTC,
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

              //var updatedLTCbalanceAsker = (parseFloat(userAllDetailsInDBAsker.LTCbalance) + parseFloat(totoalBidRemainingLTC));
              var updatedLTCbalanceAsker = new BigNumber(userAllDetailsInDBAsker.LTCbalance);
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.plus(totoalBidRemainingLTC);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingLTC " + totoalBidRemainingLTC);
              console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
              console.log("Total Ask RemainVCN updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              //var txFeesAskerLTC = (parseFloat(totoalBidRemainingLTC) * parseFloat(txFeeWithdrawSuccessLTC));
              var txFeesAskerLTC = new BigNumber(totoalBidRemainingLTC);
              txFeesAskerLTC = txFeesAskerLTC.times(txFeeWithdrawSuccessLTC);

              console.log("txFeesAskerLTC ::: " + txFeesAskerLTC);
              //updatedLTCbalanceAsker = (parseFloat(updatedLTCbalanceAsker) - parseFloat(txFeesAskerLTC));
              updatedLTCbalanceAsker = updatedLTCbalanceAsker.minus(txFeesAskerLTC);
              console.log("After deduct TX Fees of VCN Update user " + updatedLTCbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC updatedFreezedVCNbalanceAsker:: " + updatedFreezedVCNbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails asdfasd .askAmountLTC updatedLTCbalanceAsker:: " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedLTCbalanceAsker " + updatedLTCbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                  LTCbalance: updatedLTCbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC enter into userAskAmountLTC i == allBidsFromdb.length - 1 bidDetails.askownerVCN");
              //var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(userBidAmountVCN));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userBidAmountVCN " + userBidAmountVCN);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingLTC >= currentAskDetails.askAmountLTC userAllDetailsInDBBidder.VCNbalance " + userAllDetailsInDBBidder.VCNbalance);

              var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);


              //var updatedFreezedLTCbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedLTCbalance) - parseFloat(userBidAmountLTC));
              var updatedFreezedLTCbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedLTCbalance);
              updatedFreezedLTCbalanceBidder = updatedFreezedLTCbalanceBidder.minus(userBidAmountLTC);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
              //var txFeesBidderVCN = (parseFloat(updatedVCNbalanceBidder) * parseFloat(txFeeWithdrawSuccessVCN));
              // var txFeesBidderVCN = new BigNumber(userBidAmountVCN);
              // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
              //
              // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              var LTCAmountSucess = new BigNumber(userBidAmountLTC);
              //              LTCAmountSucess = LTCAmountSucess.minus(totoalBidRemainingLTC);

              var txFeesBidderLTC = new BigNumber(LTCAmountSucess);
              txFeesBidderLTC = txFeesBidderLTC.times(txFeeWithdrawSuccessLTC);
              var txFeesBidderVCN = txFeesBidderLTC.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountLTC ::: " + userBidAmountLTC);
              console.log("LTCAmountSucess ::: " + LTCAmountSucess);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC asdf updatedVCNbalanceBidder ::: " + updatedVCNbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAsk asdfasd fDetails.askAmountLTC asdf updatedFreezedLTCbalanceBidder ::: " + updatedFreezedLTCbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedLTCbalanceBidder " + updatedFreezedLTCbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingLTC " + totoalBidRemainingLTC);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
                  FreezedLTCbalance: updatedFreezedLTCbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC BidVCN.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingLTC >= currentAskDetails.askAmountLTC Bid destroy successfully desctroyCurrentBid ::");
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
        'like': LTCMARKETID
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
        var userLTCBalanceInDb = parseFloat(user.LTCbalance);
        var bidAmountOfLTCInBidTableDB = parseFloat(bidDetails.bidAmountLTC);
        var userFreezedLTCbalanceInDB = parseFloat(user.FreezedLTCbalance);
        var updateFreezedBalance = (parseFloat(userFreezedLTCbalanceInDB) - parseFloat(bidAmountOfLTCInBidTableDB));
        var updateUserLTCBalance = (parseFloat(userLTCBalanceInDb) + parseFloat(bidAmountOfLTCInBidTableDB));
        console.log("userLTCBalanceInDb :" + userLTCBalanceInDb);
        console.log("bidAmountOfLTCInBidTableDB :" + bidAmountOfLTCInBidTableDB);
        console.log("userFreezedLTCbalanceInDB :" + userFreezedLTCbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserLTCBalance :" + updateUserLTCBalance);

        User.update({
            id: bidownerId
          }, {
            LTCbalance: parseFloat(updateUserLTCBalance),
            FreezedLTCbalance: parseFloat(updateFreezedBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user LTC balance");
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
        'like': LTCMARKETID
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
              console.log("Error to update user LTC balance");
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
          'like': LTCMARKETID
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
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsVCN: allAskDetailsToExecute,
                      bidAmountVCNSum: bidAmountVCNSum[0].bidAmountVCN,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
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
          'like': LTCMARKETID
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
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksVCN: allAskDetailsToExecute,
                      askAmountVCNSum: askAmountVCNSum[0].askAmountVCN,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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
          'like': LTCMARKETID
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
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('bidAmountLTC')
                  .exec(function(err, bidAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsVCN: allAskDetailsToExecute,
                      bidAmountVCNSum: bidAmountVCNSum[0].bidAmountVCN,
                      bidAmountLTCSum: bidAmountLTCSum[0].bidAmountLTC,
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
          'like': LTCMARKETID
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
                  'like': LTCMARKETID
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
                      'like': LTCMARKETID
                    }
                  })
                  .sum('askAmountLTC')
                  .exec(function(err, askAmountLTCSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksVCN: allAskDetailsToExecute,
                      askAmountVCNSum: askAmountVCNSum[0].askAmountVCN,
                      askAmountLTCSum: askAmountLTCSum[0].askAmountLTC,
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