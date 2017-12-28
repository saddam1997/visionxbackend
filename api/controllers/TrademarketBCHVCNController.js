/**
 * TrademarketBCHVCNController
 *
 * @description :: Server-side logic for managing trademarketbchvcns
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
const txFeeWithdrawSuccessBCH = sails.config.common.txFeeWithdrawSuccessBCH;
const BCHMARKETID = sails.config.common.BCHMARKETID;

module.exports = {

  addAskVCNMarket: async function(req, res) {
    console.log("Enter into ask api addAskVCNMarket : : " + JSON.stringify(req.body));
    var userAskAmountBCH = new BigNumber(req.body.askAmountBCH);
    var userAskAmountVCN = new BigNumber(req.body.askAmountVCN);
    var userAskRate = new BigNumber(req.body.askRate);
    var userAskownerId = req.body.askownerId;

    if (!userAskAmountVCN || !userAskAmountBCH || !userAskRate || !userAskownerId) {
      console.log("Can't be empty!!!!!!");
      return res.json({
        "message": "Invalid Paramter!!!!",
        statusCode: 400
      });
    }
    if (userAskAmountVCN < 0 || userAskAmountBCH < 0 || userAskRate < 0) {
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



    userAskAmountBCH = parseFloat(userAskAmountBCH);
    userAskAmountVCN = parseFloat(userAskAmountVCN);
    userAskRate = parseFloat(userAskRate);
    try {
      var askDetails = await AskVCN.create({
        askAmountBCH: userAskAmountBCH,
        askAmountVCN: userAskAmountVCN,
        totalaskAmountBCH: userAskAmountBCH,
        totalaskAmountVCN: userAskAmountVCN,
        askRate: userAskRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
          'like': BCHMARKETID
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
      var totoalAskRemainingBCH = new BigNumber(userAskAmountBCH);
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
          console.log(currentBidDetails.id + " Before totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          // totoalAskRemainingVCN = (parseFloat(totoalAskRemainingVCN) - parseFloat(currentBidDetails.bidAmountVCN));
          // totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
          totoalAskRemainingVCN = totoalAskRemainingVCN.minus(currentBidDetails.bidAmountVCN);
          totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);


          console.log(currentBidDetails.id + " After totoalAskRemainingVCN :: " + totoalAskRemainingVCN);
          console.log(currentBidDetails.id + " After totoalAskRemainingBCH :: " + totoalAskRemainingBCH);

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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(currentBidDetails.bidAmountVCN));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


            //updatedVCNbalanceBidder =  parseFloat(updatedVCNbalanceBidder);

            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf111 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf111 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf111 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf111 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userUpdateBidder = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
            //var updatedFreezedVCNbalanceAsker = parseFloat(totoalAskRemainingVCN);
            //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);

            //updatedFreezedVCNbalanceAsker =  parseFloat(updatedFreezedVCNbalanceAsker);
            //Deduct Transation Fee Asker
            //var BCHAmountSucess = (parseFloat(userAskAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var BCHAmountSucess = new BigNumber(userAskAmountBCH);
            BCHAmountSucess = BCHAmountSucess.minus(totoalAskRemainingBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Before deduct TX Fees of Update Asker Amount BCH updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(BCHAmountSucess) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(BCHAmountSucess);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);
            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
            updatedBCHbalanceAsker = parseFloat(updatedBCHbalanceAsker);
            console.log("After deduct TX Fees of VCN Update user " + updatedBCHbalanceAsker);

            console.log("Before Update :: asdf112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf112 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf112 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf112 totoalAskRemainingBCH " + totoalAskRemainingBCH);


            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedVCNbalance: updatedFreezedVCNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update users BCHBalance and Freezed VCNBalance',
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
            // var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
            // var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(currentBidDetails.bidAmountVCN));

            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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

            var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
            //updatedFreezedBCHbalanceBidder =  parseFloat(updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedVCNbalanceBidder:: " + updatedVCNbalanceBidder);


            console.log("Before Update :: asdf113 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
            console.log("Before Update :: asdf113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf113 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf113 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf113 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            console.log(currentBidDetails.id + " enter 234 into userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerVCN");
            //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);

            //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(totoalAskRemainingVCN));
            //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);
            //Deduct Transation Fee Asker
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
            console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var BCHAmountSucess = (parseFloat(userAskAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var BCHAmountSucess = new BigNumber(userAskAmountBCH);
            BCHAmountSucess = BCHAmountSucess.minus(totoalAskRemainingBCH);

            //var txFeesAskerBCH = (parseFloat(BCHAmountSucess) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(BCHAmountSucess);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);
            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
            //Workding.................asdfasdf2323
            console.log("After deduct TX Fees of VCN Update user " + updatedBCHbalanceAsker);
            //updatedBCHbalanceAsker =  parseFloat(updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);


            console.log("Before Update :: asdf114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf114 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf114 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf114 totoalAskRemainingBCH " + totoalAskRemainingBCH);
            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                BCHbalance: updatedBCHbalanceAsker,
                FreezedVCNbalance: updatedFreezedVCNbalanceAsker
              });
            } catch (e) {
              return res.json({
                error: e,
                message: 'Failed to update user',
                statusCode: 401
              });
            }
            console.log(currentBidDetails.id + " Update In last Ask askAmountBCH totoalAskRemainingBCH " + totoalAskRemainingBCH);
            console.log(currentBidDetails.id + " Update In last Ask askAmountVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log(currentBidDetails.id + " askDetails.id ::: " + askDetails.id);
            try {
              var updatedaskDetails = await AskVCN.update({
                id: askDetails.id
              }, {
                askAmountBCH: parseFloat(totoalAskRemainingBCH),
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
          console.log(currentBidDetails.id + " totoalAskRemainingBCH :: " + totoalAskRemainingBCH);
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails)); //.6 <=.5
          console.log("currentBidDetails ::: " + JSON.stringify(currentBidDetails));
          //totoalAskRemainingVCN = totoalAskRemainingVCN - allBidsFromdb[i].bidAmountVCN;
          if (totoalAskRemainingVCN >= currentBidDetails.bidAmountVCN) {
            //totoalAskRemainingVCN = (parseFloat(totoalAskRemainingVCN) - parseFloat(currentBidDetails.bidAmountVCN));
            totoalAskRemainingVCN = totoalAskRemainingVCN.minus(currentBidDetails.bidAmountVCN);
            //totoalAskRemainingBCH = (parseFloat(totoalAskRemainingBCH) - parseFloat(currentBidDetails.bidAmountBCH));
            totoalAskRemainingBCH = totoalAskRemainingBCH.minus(currentBidDetails.bidAmountBCH);
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);
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
              // console.log("After deduct TX Fees of VCN Update user rtert updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);


              console.log("Before Update :: asdf115 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf115 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: asdf115 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf115 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var userUpdateBidder = await User.update({
                  id: currentBidDetails.bidownerVCN
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
                  VCNbalance: updatedVCNbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              //var updatedBCHbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH)) - parseFloat(totoalAskRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(totoalAskRemainingBCH);
              //var updatedFreezedVCNbalanceAsker = parseFloat(totoalAskRemainingVCN);
              //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(totoalAskRemainingVCN));
              //var updatedFreezedVCNbalanceAsker = ((parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN)) + parseFloat(totoalAskRemainingVCN));
              var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);
              updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.plus(totoalAskRemainingVCN);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("userAllDetailsInDBAsker.BCHbalance " + userAllDetailsInDBAsker.BCHbalance);
              console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
              console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var BCHAmountSucess = (parseFloat(userAskAmountBCH) - parseFloat(totoalAskRemainingBCH));
              var BCHAmountSucess = new BigNumber(userAskAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalAskRemainingBCH);
              //var txFeesAskerBCH = (parseFloat(updatedBCHbalanceAsker) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(BCHAmountSucess);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

              console.log("After deduct TX Fees of VCN Update user " + updatedBCHbalanceAsker);

              console.log(currentBidDetails.id + " asdfasdfupdatedBCHbalanceAsker updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);



              console.log("Before Update :: asdf116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: asdf116 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: asdf116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: asdf116 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf116 totoalAskRemainingBCH " + totoalAskRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: askDetails.askownerVCN
                }, {
                  BCHbalance: updatedBCHbalanceAsker,
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
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(currentBidDetails.bidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(currentBidDetails.bidAmountBCH);

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

              var txFeesBidderBCH = new BigNumber(currentBidDetails.bidAmountBCH);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
              console.log(currentBidDetails.id + " updatedVCNbalanceBidder:: sadfsdf updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: asdf117 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: asdf117 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: asdf117 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: asdf117 totoalAskRemainingVCN " + totoalAskRemainingVCN);
              console.log("Before Update :: asdf117 totoalAskRemainingBCH " + totoalAskRemainingBCH);

              try {
                var userAllDetailsInDBBidderUpdate = await User.update({
                  id: currentBidDetails.bidownerVCN
                }, {
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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
            //var updatedBidAmountBCH = (parseFloat(currentBidDetails.bidAmountBCH) - parseFloat(totoalAskRemainingBCH));
            var updatedBidAmountBCH = new BigNumber(currentBidDetails.bidAmountBCH);
            updatedBidAmountBCH = updatedBidAmountBCH.minus(totoalAskRemainingBCH);
            //var updatedBidAmountVCN = (parseFloat(currentBidDetails.bidAmountVCN) - parseFloat(totoalAskRemainingVCN));
            var updatedBidAmountVCN = new BigNumber(currentBidDetails.bidAmountVCN);
            updatedBidAmountVCN = updatedBidAmountVCN.minus(totoalAskRemainingVCN);

            try {
              var updatedaskDetails = await BidVCN.update({
                id: currentBidDetails.id
              }, {
                bidAmountBCH: updatedBidAmountBCH,
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
            //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBiddder.FreezedBCHbalance) - parseFloat(totoalAskRemainingBCH));
            var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBiddder.FreezedBCHbalance);
            updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(totoalAskRemainingBCH);


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
            var txFeesBidderBCH = new BigNumber(totoalAskRemainingBCH);
            txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
            var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentBidDetails.bidRate);
            updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

            console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
            console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

            console.log(currentBidDetails.id + " updatedFreezedBCHbalanceBidder:: " + updatedFreezedBCHbalanceBidder);
            console.log(currentBidDetails.id + " updatedVCNbalanceBidder:asdfasdf:updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);


            console.log("Before Update :: asdf118 userAllDetailsInDBBiddder " + JSON.stringify(userAllDetailsInDBBiddder));
            console.log("Before Update :: asdf118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
            console.log("Before Update :: asdf118 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
            console.log("Before Update :: asdf118 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf118 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var userAllDetailsInDBBidderUpdate = await User.update({
                id: currentBidDetails.bidownerVCN
              }, {
                FreezedBCHbalance: updatedFreezedBCHbalanceBidder,
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

            console.log(currentBidDetails.id + " enter into asdf userAskAmountBCH i == allBidsFromdb.length - 1 askDetails.askownerVCN");
            //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(userAskAmountBCH));
            var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(userAskAmountBCH);

            //var updatedFreezedVCNbalanceAsker = (parseFloat(userAllDetailsInDBAsker.FreezedVCNbalance) - parseFloat(userAskAmountVCN));
            var updatedFreezedVCNbalanceAsker = new BigNumber(userAllDetailsInDBAsker.FreezedVCNbalance);
            updatedFreezedVCNbalanceAsker = updatedFreezedVCNbalanceAsker.minus(userAskAmountVCN);

            //Deduct Transation Fee Asker
            console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            //var txFeesAskerBCH = (parseFloat(userAskAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
            var txFeesAskerBCH = new BigNumber(userAskAmountBCH);
            txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

            console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
            console.log("userAllDetailsInDBAsker.BCHbalance :: " + userAllDetailsInDBAsker.BCHbalance);
            //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
            updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

            console.log("After deduct TX Fees of VCN Update user " + updatedBCHbalanceAsker);

            console.log(currentBidDetails.id + " updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
            console.log(currentBidDetails.id + " updatedFreezedVCNbalanceAsker safsdfsdfupdatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);


            console.log("Before Update :: asdf119 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
            console.log("Before Update :: asdf119 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
            console.log("Before Update :: asdf119 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
            console.log("Before Update :: asdf119 totoalAskRemainingVCN " + totoalAskRemainingVCN);
            console.log("Before Update :: asdf119 totoalAskRemainingBCH " + totoalAskRemainingBCH);

            try {
              var updatedUser = await User.update({
                id: askDetails.askownerVCN
              }, {
                BCHbalance: updatedBCHbalanceAsker,
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
    var userBidAmountBCH = new BigNumber(req.body.bidAmountBCH);
    var userBidAmountVCN = new BigNumber(req.body.bidAmountVCN);
    var userBidRate = new BigNumber(req.body.bidRate);
    var userBid1ownerId = req.body.bidownerId;

    userBidAmountBCH = parseFloat(userBidAmountBCH);
    userBidAmountVCN = parseFloat(userBidAmountVCN);
    userBidRate = parseFloat(userBidRate);


    if (!userBidAmountVCN || !userBidAmountBCH ||
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
    var userBCHBalanceInDb = new BigNumber(userBidder.BCHbalance);
    var userFreezedBCHBalanceInDb = new BigNumber(userBidder.FreezedBCHbalance);
    var userIdInDb = userBidder.id;
    console.log("userBidder ::: " + JSON.stringify(userBidder));
    userBidAmountBCH = new BigNumber(userBidAmountBCH);
    if (userBidAmountBCH.greaterThanOrEqualTo(userBCHBalanceInDb)) {
      return res.json({
        "message": "You have insufficient BCH Balance",
        statusCode: 401
      });
    }
    userBidAmountBCH = parseFloat(userBidAmountBCH);
    try {
      var bidDetails = await BidVCN.create({
        bidAmountBCH: userBidAmountBCH,
        bidAmountVCN: userBidAmountVCN,
        totalbidAmountBCH: userBidAmountBCH,
        totalbidAmountVCN: userBidAmountVCN,
        bidRate: userBidRate,
        status: statusTwo,
        statusName: statusTwoPending,
        marketId: BCHMARKETID,
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
    //var updateUserBCHBalance = (parseFloat(userBCHBalanceInDb) - parseFloat(userBidAmountBCH));
    var updateUserBCHBalance = new BigNumber(userBCHBalanceInDb);
    updateUserBCHBalance = updateUserBCHBalance.minus(userBidAmountBCH);
    //Workding.................asdfasdfyrtyrty
    //var updateFreezedBCHBalance = (parseFloat(userFreezedBCHBalanceInDb) + parseFloat(userBidAmountBCH));
    var updateFreezedBCHBalance = new BigNumber(userBidder.FreezedBCHbalance);
    updateFreezedBCHBalance = updateFreezedBCHBalance.plus(userBidAmountBCH);

    console.log("Updating user's bid details sdfyrtyupdateFreezedBCHBalance  " + updateFreezedBCHBalance);
    console.log("Updating user's bid details asdfasdf updateUserBCHBalance  " + updateUserBCHBalance);
    try {
      var userUpdateBidDetails = await User.update({
        id: userIdInDb
      }, {
        FreezedBCHbalance: parseFloat(updateFreezedBCHBalance),
        BCHbalance: parseFloat(updateUserBCHBalance),
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
          'like': BCHMARKETID
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
        var totoalBidRemainingBCH = new BigNumber(userBidAmountBCH);
        //this loop for sum of all Bids amount of VCN
        for (var i = 0; i < allAsksFromdb.length; i++) {
          total_ask = total_ask + allAsksFromdb[i].askAmountVCN;
        }
        if (total_ask <= totoalBidRemainingVCN) {
          for (var i = 0; i < allAsksFromdb.length; i++) {
            currentAskDetails = allAsksFromdb[i];
            console.log(currentAskDetails.id + " totoalBidRemainingVCN :: " + totoalBidRemainingVCN);
            console.log(currentAskDetails.id + " totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log("currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5

            //totoalBidRemainingVCN = totoalBidRemainingVCN - allAsksFromdb[i].bidAmountVCN;
            //totoalBidRemainingVCN = (parseFloat(totoalBidRemainingVCN) - parseFloat(currentAskDetails.askAmountVCN));
            totoalBidRemainingVCN = totoalBidRemainingVCN.minus(currentAskDetails.askAmountVCN);

            //totoalBidRemainingBCH = (parseFloat(totoalBidRemainingBCH) - parseFloat(currentAskDetails.askAmountBCH));
            totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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
              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.askAmountBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(currentAskDetails.askAmountBCH);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(currentAskDetails.askAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(currentAskDetails.askAmountBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);
              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of VCN Update user d gsdfgdf  " + updatedBCHbalanceAsker);

              //current ask details of Asker  updated
              //Ask FreezedVCNbalance balance of asker deducted and BCH to give asker

              console.log("Before Update :: qweqwer11110 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11110 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11110 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11110 totoalBidRemainingBCH " + totoalBidRemainingBCH);
              try {
                var userUpdateAsker = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              //Bid FreezedBCHbalance of bidder deduct and VCN  give to bidder
              //var updatedVCNbalanceBidder = (parseFloat(BidderuserAllDetailsInDBBidder.VCNbalance) + parseFloat(totoalBidRemainingVCN)) - parseFloat(totoalBidRemainingBCH);
              //var updatedVCNbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.VCNbalance) + parseFloat(userBidAmountVCN)) - parseFloat(totoalBidRemainingVCN));
              var updatedVCNbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(totoalBidRemainingVCN);
              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(BidderuserAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + BidderuserAllDetailsInDBBidder.FreezedBCHbalance);
              console.log("Total Ask RemainVCN updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

              console.log(currentAskDetails.id + " asdftotoalBidRemainingVCN == 0updatedVCNbalanceBidder ::: " + updatedVCNbalanceBidder);
              console.log(currentAskDetails.id + " asdftotoalBidRemainingVCN asdf== updatedFreezedBCHbalanceBidder updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11111 BidderuserAllDetailsInDBBidder " + JSON.stringify(BidderuserAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11111 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11111 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11111 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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
              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.askAmountBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(currentAskDetails.askAmountBCH);

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(currentAskDetails.askAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(currentAskDetails.askAmountBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);
              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

              console.log("After deduct TX Fees of VCN Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == :: ");
              console.log(currentAskDetails.id + "  else of totoalBidRemainingVCN == 0updaasdfsdftedBCHbalanceBidder updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


              console.log("Before Update :: qweqwer11112 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11112 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11112 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11112 totoalBidRemainingBCH " + totoalBidRemainingBCH);


              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1 asdf enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerVCN");
              //var updatedVCNbalanceBidder = ((parseFloat(userAllDetailsInDBBid.VCNbalance) + parseFloat(userBidAmountVCN)) - parseFloat(totoalBidRemainingVCN));
              var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBid.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(totoalBidRemainingVCN);

              //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
              //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBid.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBid.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBid.FreezedBCHbalance);
              console.log("Total Ask RemainVCN updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
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



              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1updateasdfdFreezedVCNbalanceAsker updatedFreezedBCHbalanceBidder::: " + updatedFreezedBCHbalanceBidder);


              console.log("Before Update :: qweqwer11113 userAllDetailsInDBBid " + JSON.stringify(userAllDetailsInDBBid));
              console.log("Before Update :: qweqwer11113 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11113 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11113 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountBCH totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1Update In last Ask askAmountVCN totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log(currentAskDetails.id + " i == allAsksFromdb.length - 1bidDetails.id ::: " + bidDetails.id);
              try {
                var updatedbidDetails = await BidVCN.update({
                  id: bidDetails.id
                }, {
                  bidAmountBCH: totoalBidRemainingBCH,
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
            console.log(currentAskDetails.id + " else of i == allAsksFromdb.length - 1 totoalBidRemainingBCH :: " + totoalBidRemainingBCH);
            console.log(" else of i == allAsksFromdb.length - 1currentAskDetails ::: " + JSON.stringify(currentAskDetails)); //.6 <=.5
            //totoalBidRemainingVCN = totoalBidRemainingVCN - allAsksFromdb[i].bidAmountVCN;
            if (totoalBidRemainingBCH >= currentAskDetails.askAmountBCH) {
              totoalBidRemainingVCN = totoalBidRemainingVCN.minus(currentAskDetails.askAmountVCN);
              totoalBidRemainingBCH = totoalBidRemainingBCH.minus(currentAskDetails.askAmountBCH);
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

                //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.askAmountBCH));
                var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
                updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(currentAskDetails.askAmountBCH);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                //var txFeesAskerBCH = (parseFloat(currentAskDetails.askAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
                var txFeesAskerBCH = new BigNumber(currentAskDetails.askAmountBCH);
                txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

                console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
                //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
                updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);

                console.log("After deduct TX Fees of VCN Update user " + updatedBCHbalanceAsker);
                console.log("--------------------------------------------------------------------------------");
                console.log(" totoalBidRemainingVCN == 0userAllDetailsInDBAsker ::: " + JSON.stringify(userAllDetailsInDBAsker));
                console.log(" totoalBidRemainingVCN == 0updatedFreezedVCNbalanceAsker ::: " + updatedFreezedVCNbalanceAsker);
                console.log(" totoalBidRemainingVCN == 0updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log("----------------------------------------------------------------------------------updatedBCHbalanceAsker " + updatedBCHbalanceAsker);



                console.log("Before Update :: qweqwer11114 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11114 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
                console.log("Before Update :: qweqwer11114 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11114 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userUpdateAsker = await User.update({
                    id: currentAskDetails.askownerVCN
                  }, {
                    FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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

                //var updatedFreezedBCHbalanceBidder = parseFloat(totoalBidRemainingBCH);
                //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(totoalBidRemainingBCH));
                //var updatedFreezedBCHbalanceBidder = ((parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH)) + parseFloat(totoalBidRemainingBCH));
                var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.plus(totoalBidRemainingBCH);
                updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

                console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                console.log("Total Ask RemainVCN totoalAskRemainingVCN " + totoalBidRemainingBCH);
                console.log("Total Ask RemainVCN BidderuserAllDetailsInDBBidder.FreezedBCHbalance " + userAllDetailsInDBBidder.FreezedBCHbalance);
                console.log("Total Ask RemainVCN updatedFreezedVCNbalanceAsker " + updatedFreezedBCHbalanceBidder);
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

                var BCHAmountSucess = new BigNumber(userBidAmountBCH);
                BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

                var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
                txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
                var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
                console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
                //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
                updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);



                console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

                console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0 updatedBCHbalanceAsker ::: " + updatedBCHbalanceAsker);
                console.log(currentAskDetails.id + " totoalBidRemainingVCN == 0 updatedFreezedVCNbalaasdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);


                console.log("Before Update :: qweqwer11115 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
                console.log("Before Update :: qweqwer11115 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
                console.log("Before Update :: qweqwer11115 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11115 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var updatedUser = await User.update({
                    id: bidDetails.bidownerVCN
                  }, {
                    VCNbalance: updatedVCNbalanceBidder,
                    FreezedBCHbalance: updatedFreezedBCHbalanceBidder
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

                //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(currentAskDetails.askAmountBCH));
                var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
                updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(currentAskDetails.askAmountBCH);

                //Deduct Transation Fee Asker
                console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                //var txFeesAskerBCH = (parseFloat(currentAskDetails.askAmountBCH) * parseFloat(txFeeWithdrawSuccessBCH));
                var txFeesAskerBCH = new BigNumber(currentAskDetails.askAmountBCH);
                txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

                console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
                //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
                updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
                console.log("After deduct TX Fees of VCN Update user " + updatedBCHbalanceAsker);

                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0 updatedFreezedVCNbalanceAsker:: " + updatedFreezedVCNbalanceAsker);
                console.log(currentAskDetails.id + " else of totoalBidRemainingVCN == 0 updatedBCHbalance asd asd updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);


                console.log("Before Update :: qweqwer11116 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
                console.log("Before Update :: qweqwer11116 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
                console.log("Before Update :: qweqwer11116 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingVCN " + totoalBidRemainingVCN);
                console.log("Before Update :: qweqwer11116 totoalBidRemainingBCH " + totoalBidRemainingBCH);


                try {
                  var userAllDetailsInDBAskerUpdate = await User.update({
                    id: currentAskDetails.askownerVCN
                  }, {
                    FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                    BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAll Details :: ");
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH  enter into i == allBidsFromdb.length - 1");

              //Update Ask
              //  var updatedAskAmountVCN = (parseFloat(currentAskDetails.askAmountVCN) - parseFloat(totoalBidRemainingVCN));

              var updatedAskAmountVCN = new BigNumber(currentAskDetails.askAmountVCN);
              updatedAskAmountVCN = updatedAskAmountVCN.minus(totoalBidRemainingVCN);

              //var updatedAskAmountBCH = (parseFloat(currentAskDetails.askAmountBCH) - parseFloat(totoalBidRemainingBCH));
              var updatedAskAmountBCH = new BigNumber(currentAskDetails.askAmountBCH);
              updatedAskAmountBCH = updatedAskAmountBCH.minus(totoalBidRemainingBCH);
              try {
                var updatedaskDetails = await AskVCN.update({
                  id: currentAskDetails.id
                }, {
                  askAmountBCH: updatedAskAmountBCH,
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

              //var updatedBCHbalanceAsker = (parseFloat(userAllDetailsInDBAsker.BCHbalance) + parseFloat(totoalBidRemainingBCH));
              var updatedBCHbalanceAsker = new BigNumber(userAllDetailsInDBAsker.BCHbalance);
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.plus(totoalBidRemainingBCH);

              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
              console.log("Total Ask RemainVCN totoalBidRemainingBCH " + totoalBidRemainingBCH);
              console.log("Total Ask RemainVCN userAllDetailsInDBAsker.FreezedVCNbalance " + userAllDetailsInDBAsker.FreezedVCNbalance);
              console.log("Total Ask RemainVCN updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

              //Deduct Transation Fee Asker
              console.log("Before deduct TX Fees of updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              //var txFeesAskerBCH = (parseFloat(totoalBidRemainingBCH) * parseFloat(txFeeWithdrawSuccessBCH));
              var txFeesAskerBCH = new BigNumber(totoalBidRemainingBCH);
              txFeesAskerBCH = txFeesAskerBCH.times(txFeeWithdrawSuccessBCH);

              console.log("txFeesAskerBCH ::: " + txFeesAskerBCH);
              //updatedBCHbalanceAsker = (parseFloat(updatedBCHbalanceAsker) - parseFloat(txFeesAskerBCH));
              updatedBCHbalanceAsker = updatedBCHbalanceAsker.minus(txFeesAskerBCH);
              console.log("After deduct TX Fees of VCN Update user " + updatedBCHbalanceAsker);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH updatedFreezedVCNbalanceAsker:: " + updatedFreezedVCNbalanceAsker);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails asdfasd .askAmountBCH updatedBCHbalanceAsker:: " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 userAllDetailsInDBAsker " + JSON.stringify(userAllDetailsInDBAsker));
              console.log("Before Update :: qweqwer11117 updatedFreezedVCNbalanceAsker " + updatedFreezedVCNbalanceAsker);
              console.log("Before Update :: qweqwer11117 updatedBCHbalanceAsker " + updatedBCHbalanceAsker);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11117 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var userAllDetailsInDBAskerUpdate = await User.update({
                  id: currentAskDetails.askownerVCN
                }, {
                  FreezedVCNbalance: updatedFreezedVCNbalanceAsker,
                  BCHbalance: updatedBCHbalanceAsker
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH enter into userAskAmountBCH i == allBidsFromdb.length - 1 bidDetails.askownerVCN");
              //var updatedVCNbalanceBidder = (parseFloat(userAllDetailsInDBBidder.VCNbalance) + parseFloat(userBidAmountVCN));
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userBidAmountVCN " + userBidAmountVCN);
              console.log(currentAskDetails.id + " else asdffdsfdof totoalBidRemainingBCH >= currentAskDetails.askAmountBCH userAllDetailsInDBBidder.VCNbalance " + userAllDetailsInDBBidder.VCNbalance);

              var updatedVCNbalanceBidder = new BigNumber(userAllDetailsInDBBidder.VCNbalance);
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.plus(userBidAmountVCN);


              //var updatedFreezedBCHbalanceBidder = (parseFloat(userAllDetailsInDBBidder.FreezedBCHbalance) - parseFloat(userBidAmountBCH));
              var updatedFreezedBCHbalanceBidder = new BigNumber(userAllDetailsInDBBidder.FreezedBCHbalance);
              updatedFreezedBCHbalanceBidder = updatedFreezedBCHbalanceBidder.minus(userBidAmountBCH);

              //Deduct Transation Fee Bidder
              console.log("Before deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);
              //var txFeesBidderVCN = (parseFloat(updatedVCNbalanceBidder) * parseFloat(txFeeWithdrawSuccessVCN));
              // var txFeesBidderVCN = new BigNumber(userBidAmountVCN);
              // txFeesBidderVCN = txFeesBidderVCN.times(txFeeWithdrawSuccessVCN);
              //
              // console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              // //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              // updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              var BCHAmountSucess = new BigNumber(userBidAmountBCH);
              //              BCHAmountSucess = BCHAmountSucess.minus(totoalBidRemainingBCH);

              var txFeesBidderBCH = new BigNumber(BCHAmountSucess);
              txFeesBidderBCH = txFeesBidderBCH.times(txFeeWithdrawSuccessBCH);
              var txFeesBidderVCN = txFeesBidderBCH.dividedBy(currentAskDetails.askRate);
              console.log("userBidAmountBCH ::: " + userBidAmountBCH);
              console.log("BCHAmountSucess ::: " + BCHAmountSucess);
              console.log("txFeesBidderVCN :: " + txFeesBidderVCN);
              //updatedVCNbalanceBidder = (parseFloat(updatedVCNbalanceBidder) - parseFloat(txFeesBidderVCN));
              updatedVCNbalanceBidder = updatedVCNbalanceBidder.minus(txFeesBidderVCN);

              console.log("After deduct TX Fees of VCN Update user " + updatedVCNbalanceBidder);

              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH asdf updatedVCNbalanceBidder ::: " + updatedVCNbalanceBidder);
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAsk asdfasd fDetails.askAmountBCH asdf updatedFreezedBCHbalanceBidder ::: " + updatedFreezedBCHbalanceBidder);



              console.log("Before Update :: qweqwer11118 userAllDetailsInDBBidder " + JSON.stringify(userAllDetailsInDBBidder));
              console.log("Before Update :: qweqwer11118 updatedFreezedBCHbalanceBidder " + updatedFreezedBCHbalanceBidder);
              console.log("Before Update :: qweqwer11118 updatedVCNbalanceBidder " + updatedVCNbalanceBidder);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingVCN " + totoalBidRemainingVCN);
              console.log("Before Update :: qweqwer11118 totoalBidRemainingBCH " + totoalBidRemainingBCH);

              try {
                var updatedUser = await User.update({
                  id: bidDetails.bidownerVCN
                }, {
                  VCNbalance: updatedVCNbalanceBidder,
                  FreezedBCHbalance: updatedFreezedBCHbalanceBidder
                });
              } catch (e) {
                return res.json({
                  error: e,
                  message: 'Failed with an error',
                  statusCode: 401
                });
              }

              //Destroy Bid===========================================Working
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH BidVCN.destroy bidDetails.id::: " + bidDetails.id);
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
              console.log(currentAskDetails.id + " else of totoalBidRemainingBCH >= currentAskDetails.askAmountBCH Bid destroy successfully desctroyCurrentBid ::");
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
        'like': BCHMARKETID
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
        var userBCHBalanceInDb = parseFloat(user.BCHbalance);
        var bidAmountOfBCHInBidTableDB = parseFloat(bidDetails.bidAmountBCH);
        var userFreezedBCHbalanceInDB = parseFloat(user.FreezedBCHbalance);
        var updateFreezedBalance = (parseFloat(userFreezedBCHbalanceInDB) - parseFloat(bidAmountOfBCHInBidTableDB));
        var updateUserBCHBalance = (parseFloat(userBCHBalanceInDb) + parseFloat(bidAmountOfBCHInBidTableDB));
        console.log("userBCHBalanceInDb :" + userBCHBalanceInDb);
        console.log("bidAmountOfBCHInBidTableDB :" + bidAmountOfBCHInBidTableDB);
        console.log("userFreezedBCHbalanceInDB :" + userFreezedBCHbalanceInDB);
        console.log("updateFreezedBalance :" + updateFreezedBalance);
        console.log("updateUserBCHBalance :" + updateUserBCHBalance);

        User.update({
            id: bidownerId
          }, {
            BCHbalance: parseFloat(updateUserBCHBalance),
            FreezedBCHbalance: parseFloat(updateFreezedBalance)
          })
          .exec(function(err, updatedUser) {
            if (err) {
              console.log("Error to update user BCH balance");
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
        'like': BCHMARKETID
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
              console.log("Error to update user BCH balance");
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
          'like': BCHMARKETID
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
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsVCN: allAskDetailsToExecute,
                      bidAmountVCNSum: bidAmountVCNSum[0].bidAmountVCN,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
          'like': BCHMARKETID
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
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksVCN: allAskDetailsToExecute,
                      askAmountVCNSum: askAmountVCNSum[0].askAmountVCN,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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
          'like': BCHMARKETID
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
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('bidAmountBCH')
                  .exec(function(err, bidAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of bidAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      bidsVCN: allAskDetailsToExecute,
                      bidAmountVCNSum: bidAmountVCNSum[0].bidAmountVCN,
                      bidAmountBCHSum: bidAmountBCHSum[0].bidAmountBCH,
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
          'like': BCHMARKETID
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
                  'like': BCHMARKETID
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
                      'like': BCHMARKETID
                    }
                  })
                  .sum('askAmountBCH')
                  .exec(function(err, askAmountBCHSum) {
                    if (err) {
                      return res.json({
                        "message": "Error to sum Of askAmountVCNSum",
                        statusCode: 401
                      });
                    }
                    return res.json({
                      asksVCN: allAskDetailsToExecute,
                      askAmountVCNSum: askAmountVCNSum[0].askAmountVCN,
                      askAmountBCHSum: askAmountBCHSum[0].askAmountBCH,
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