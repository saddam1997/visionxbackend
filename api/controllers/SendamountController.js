/**
 * SendamountController
 *
 * @description :: Server-side logic for managing sendamounts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');

const TRANSACTION_ACTION_WITHDRAW_ID = sails.config.common.TRANSACTION_ACTION_WITHDRAW_ID;
const TRANSACTION_ACTION_WITHDRAW_NAME = sails.config.common.TRANSACTION_ACTION_WITHDRAW_NAME;


const CURRENCY_NAME_BTC = sails.config.common.BTC;
const CURRENCY_NAME_BCH = sails.config.common.BCH;
const CURRENCY_NAME_LTC = sails.config.common.LTC;
const CURRENCY_NAME_VCN = sails.config.common.VCN;

//BTC Wallet Details
var bitcoinBTC = require('bitcoin');
var clientBTC = new bitcoinBTC.Client({
  host: sails.config.company.clientBTChost,
  port: sails.config.company.clientBTCport,
  user: sails.config.company.clientBTCuser,
  pass: sails.config.company.clientBTCpass
});
//BCH Wallet Details
var bitcoinBCH = require('bitcoin');
var clientBCH = new bitcoinBCH.Client({
  host: sails.config.company.clientBCHhost,
  port: sails.config.company.clientBCHport,
  user: sails.config.company.clientBCHuser,
  pass: sails.config.company.clientBCHpass
});
//LTC Wallet Details
var bitcoinLTC = require('bitcoin');
var clientLTC = new bitcoinLTC.Client({
  host: sails.config.company.clientLTChost,
  port: sails.config.company.clientLTCport,
  user: sails.config.company.clientLTCuser,
  pass: sails.config.company.clientLTCpass
});
//VCN Wallet Details
var bitcoinVCN = require('bitcoin');
var clientVCN = new bitcoinVCN.Client({
  host: sails.config.company.clientVCNhost,
  port: sails.config.company.clientVCNport,
  user: sails.config.company.clientVCNuser,
  pass: sails.config.company.clientVCNpass
});

const LABELPREFIX = sails.config.common.LABELPREFIX;

var transactionFeeBCH = sails.config.common.txFeeBCH;
var transactionFeeBTC = sails.config.common.txFeeBTC;
var transactionFeeLTC = sails.config.common.txFeeLTC;
var transactionFeeVCN = sails.config.common.txFeeVCN;

const COMPANYACCOUNTBTC = sails.config.common.COMPANYACCOUNTBTC;
const COMPANYACCOUNTBCH = sails.config.common.COMPANYACCOUNTBCH;
const COMPANYACCOUNTLTC = sails.config.common.COMPANYACCOUNTLTC;
const COMPANYACCOUNTVCN = sails.config.common.COMPANYACCOUNTVCN;


const CONFIRMATIONOFTXBTC = sails.config.common.CONFIRMATIONOFTXBTC;
const CONFIRMATIONOFTXBCH = sails.config.common.CONFIRMATIONOFTXBCH;
const CONFIRMATIONOFTXLTC = sails.config.common.CONFIRMATIONOFTXLTC;
const CONFIRMATIONOFTXVCN = sails.config.common.CONFIRMATIONOFTXVCN;
module.exports = {
  sendBTC: function(req, res, next) {
    console.log("Enter into sendBTC");
    var userEmailAddress = req.body.userMailId;
    var userBTCAmountToSend = new BigNumber(req.body.amount);
    var userReceiverBTCAddress = req.body.recieverBTCCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniBTCAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userBTCAmountToSend || !userReceiverBTCAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniBTCAmountSentByUser.greaterThanOrEqualTo(userBTCAmountToSend)) {
      console.log("Sending amount is not less then " + miniBTCAmountSentByUser);
      return res.json({
        "message": "Sending amount BTC is not less then " + miniBTCAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var BTCBalanceInDB = new BigNumber(userDetails.BTCbalance);

              console.log("Enter Before If ");

              if (userBTCAmountToSend.greaterThan(BTCBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeBTC);
                var transactionFeeOfBTC = new BigNumber(transactionFeeBTC);
                var netamountToSend = userBTCAmountToSend.minus(transactionFeeOfBTC);
                console.log("clientBTC netamountToSend :: " + netamountToSend);
                clientBTC.cmd('sendfrom', COMPANYACCOUNTBTC, userReceiverBTCAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXBTC, userReceiverBTCAddress, userReceiverBTCAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromBTCAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "BTC Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid BTC Address",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -6) {
                        return res.json({
                          "message": "Account has Insufficient funds",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code < 0) {
                        return res.json({
                          "message": "Problem in BTC server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in BTC Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateBTCAmountInDB = BTCBalanceInDB.minus(userBTCAmountToSend);
                    console.log("updateBTCAmountInDB ::: " + updateBTCAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      BTCbalance: updateBTCAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userBTCAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverBTCAddress,
                        currencyName: CURRENCY_NAME_BTC,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfBTC),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
                            statusCode: 400
                          });
                        }
                        User.findOne({
                            email: userEmailAddress
                          }).populateAll()
                          .exec(function(err, user) {
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
                            console.log("Return user details after sending amount!!");
                            res.json({
                              user: user,
                              statusCode: 200
                            });
                          });
                      });
                    });
                  });
              }
            }
          });
      }
    });
  },
  sendBCH: function(req, res, next) {
    console.log("Enter into sendBCH");
    var userEmailAddress = req.body.userMailId;
    var userBCHAmountToSend = new BigNumber(req.body.amount);
    var userReceiverBCHAddress = req.body.recieverBCHCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniBCHAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userBCHAmountToSend || !userReceiverBCHAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniBCHAmountSentByUser.greaterThanOrEqualTo(userBCHAmountToSend)) {
      console.log("Sending amount is not less then " + miniBCHAmountSentByUser);
      return res.json({
        "message": "Sending amount BCH is not less then " + miniBCHAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var BCHBalanceInDB = new BigNumber(userDetails.BCHbalance);

              console.log("Enter Before If ");

              if (userBCHAmountToSend.greaterThan(BCHBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeBCH);
                var transactionFeeOfBCH = new BigNumber(transactionFeeBCH);
                var netamountToSend = userBCHAmountToSend.minus(transactionFeeOfBCH);
                console.log("clientBCH netamountToSend :: " + netamountToSend);
                clientBCH.cmd('sendfrom', COMPANYACCOUNTBCH, userReceiverBCHAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXBCH, userReceiverBCHAddress, userReceiverBCHAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromBCHAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "BCH Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid BCH Address",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -6) {
                        return res.json({
                          "message": "Account has Insufficient funds",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code < 0) {
                        return res.json({
                          "message": "Problem in BCH server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in BCH Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateBCHAmountInDB = BCHBalanceInDB.minus(userBCHAmountToSend);
                    console.log("updateBCHAmountInDB ::: " + updateBCHAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      BCHbalance: updateBCHAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userBCHAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverBCHAddress,
                        currencyName: CURRENCY_NAME_BCH,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfBCH),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
                            statusCode: 400
                          });
                        }
                        User.findOne({
                            email: userEmailAddress
                          }).populateAll()
                          .exec(function(err, user) {
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
                            console.log("Return user details after sending amount!!");
                            res.json({
                              user: user,
                              statusCode: 200
                            });
                          });
                      });
                    });
                  });
              }
            }
          });
      }
    });
  },
  sendLTC: function(req, res, next) {
    console.log("Enter into sendLTC");
    var userEmailAddress = req.body.userMailId;
    var userLTCAmountToSend = new BigNumber(req.body.amount);
    var userReceiverLTCAddress = req.body.recieverLTCCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniLTCAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userLTCAmountToSend || !userReceiverLTCAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniLTCAmountSentByUser.greaterThanOrEqualTo(userLTCAmountToSend)) {
      console.log("Sending amount is not less then " + miniLTCAmountSentByUser);
      return res.json({
        "message": "Sending amount LTC is not less then " + miniLTCAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var LTCBalanceInDB = new BigNumber(userDetails.LTCbalance);

              console.log("Enter Before If ");

              if (userLTCAmountToSend.greaterThan(LTCBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeLTC);
                var transactionFeeOfLTC = new BigNumber(transactionFeeLTC);
                var netamountToSend = userLTCAmountToSend.minus(transactionFeeOfLTC);
                console.log("clientLTC netamountToSend :: " + netamountToSend);
                clientLTC.cmd('sendfrom', COMPANYACCOUNTLTC, userReceiverLTCAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXLTC, userReceiverLTCAddress, userReceiverLTCAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromLTCAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "LTC Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid LTC Address",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -6) {
                        return res.json({
                          "message": "Account has Insufficient funds",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code < 0) {
                        return res.json({
                          "message": "Problem in LTC server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in LTC Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateLTCAmountInDB = LTCBalanceInDB.minus(userLTCAmountToSend);
                    console.log("updateLTCAmountInDB ::: " + updateLTCAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      LTCbalance: updateLTCAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userLTCAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverLTCAddress,
                        currencyName: CURRENCY_NAME_LTC,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfLTC),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
                            statusCode: 400
                          });
                        }
                        User.findOne({
                            email: userEmailAddress
                          }).populateAll()
                          .exec(function(err, user) {
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
                            console.log("Return user details after sending amount!!");
                            res.json({
                              user: user,
                              statusCode: 200
                            });
                          });
                      });
                    });
                  });
              }
            }
          });
      }
    });
  },
  sendVCN: function(req, res, next) {
    console.log("Enter into sendVCN");
    var userEmailAddress = req.body.userMailId;
    var userVCNAmountToSend = new BigNumber(req.body.amount);
    var userReceiverVCNAddress = req.body.recieverVCNCoinAddress;
    var userSpendingPassword = req.body.spendingPassword;
    var miniVCNAmountSentByUser = new BigNumber(0.001);
    if (!userEmailAddress || !userVCNAmountToSend || !userReceiverVCNAddress ||
      !userSpendingPassword) {
      console.log("Can't be empty!!! by user ");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    if (miniVCNAmountSentByUser.greaterThanOrEqualTo(userVCNAmountToSend)) {
      console.log("Sending amount is not less then " + miniVCNAmountSentByUser);
      return res.json({
        "message": "Sending amount VCN is not less then " + miniVCNAmountSentByUser,
        statusCode: 400
      });
    }
    User.findOne({
      email: userEmailAddress
    }).exec(function(err, userDetails) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!userDetails) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      } else {
        console.log(JSON.stringify(userDetails));
        User.compareSpendingpassword(userSpendingPassword, userDetails,
          function(err, valid) {
            if (err) {
              console.log("Eror To compare password !!!");
              return res.json({
                "message": err,
                statusCode: 401
              });
            }
            if (!valid) {
              console.log("Invalid spendingpassword !!!");
              return res.json({
                "message": 'Enter valid spending password',
                statusCode: 401
              });
            } else {
              console.log("Valid spending password !!!");
              var VCNBalanceInDB = new BigNumber(userDetails.VCNbalance);

              console.log("Enter Before If ");

              if (userVCNAmountToSend.greaterThan(VCNBalanceInDB)) {
                return res.json({
                  "message": "Insufficient balance!!",
                  statusCode: 400
                });
              } else {
                console.log("Enter info else " + transactionFeeVCN);
                var transactionFeeOfVCN = new BigNumber(transactionFeeVCN);
                var netamountToSend = userVCNAmountToSend.minus(transactionFeeOfVCN);
                console.log("clientVCN netamountToSend :: " + netamountToSend);
                clientVCN.cmd('sendfrom', COMPANYACCOUNTVCN, userReceiverVCNAddress, parseFloat(netamountToSend),
                  CONFIRMATIONOFTXVCN, userReceiverVCNAddress, userReceiverVCNAddress,
                  function(err, TransactionDetails, resHeaders) {
                    if (err) {
                      console.log("Error from sendFromVCNAccount:: " + err);
                      if (err.code && err.code == "ECONNREFUSED") {
                        return res.json({
                          "message": "VCN Server Refuse to connect App",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -5) {
                        return res.json({
                          "message": "Invalid VCN Address",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code == -6) {
                        return res.json({
                          "message": "Account has Insufficient funds",
                          statusCode: 400
                        });
                      }
                      if (err.code && err.code < 0) {
                        return res.json({
                          "message": "Problem in VCN server",
                          statusCode: 400
                        });
                      }
                      return res.json({
                        "message": "Error in VCN Server send",
                        statusCode: 400
                      });
                    }
                    console.log('TransactionDetails :', TransactionDetails);
                    var updateVCNAmountInDB = VCNBalanceInDB.minus(userVCNAmountToSend);
                    console.log("updateVCNAmountInDB ::: " + updateVCNAmountInDB);
                    User.update({
                      email: userEmailAddress
                    }, {
                      VCNbalance: updateVCNAmountInDB
                    }).exec(function afterwards(err, updated) {
                      if (err) {
                        return res.json({
                          "message": "Error to update in DB",
                          statusCode: 400
                        });
                      }
                      var saveTransactionDeails = {
                        amount: parseFloat(userVCNAmountToSend),
                        actionName: TRANSACTION_ACTION_WITHDRAW_NAME,
                        actionId: TRANSACTION_ACTION_WITHDRAW_ID,
                        address: userReceiverVCNAddress,
                        currencyName: CURRENCY_NAME_VCN,
                        txid: TransactionDetails,
                        networkFee: parseFloat(transactionFeeOfVCN),
                        transationowner: userDetails.id,
                      }
                      console.log("saveTransactionDeails : " + JSON.stringify(saveTransactionDeails));
                      Transation.create(saveTransactionDeails).exec(function(err, finn) {
                        if (err) {
                          console.log(err);
                          return res.json({
                            "message": "Error to create Transaction!",
                            statusCode: 400
                          });
                        }
                        User.findOne({
                            email: userEmailAddress
                          }).populateAll()
                          .exec(function(err, user) {
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
                            console.log("Return user details after sending amount!!");
                            res.json({
                              user: user,
                              statusCode: 200
                            });
                          });
                      });
                    });
                  });
              }
            }
          });
      }
    });
  },

};