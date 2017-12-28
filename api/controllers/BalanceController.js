/**
 * BalanceController
 *
 * @description :: Server-side logic for managing balances
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var BigNumber = require('bignumber.js');
const BCHMARKETID = sails.config.common.BCHMARKETID;
const BTCMARKETID = sails.config.common.BTCMARKETID;
const LTCMARKETID = sails.config.common.LTCMARKETID;

var statusZero = sails.config.common.statusZero;
var statusOne = sails.config.common.statusOne;
var statusTwo = sails.config.common.statusTwo;
var statusThree = sails.config.common.statusThree;
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

const COMPANYACCOUNTBTC = sails.config.common.COMPANYACCOUNTBTC;
const COMPANYACCOUNTBCH = sails.config.common.COMPANYACCOUNTBCH;
const COMPANYACCOUNTLTC = sails.config.common.COMPANYACCOUNTLTC;
const COMPANYACCOUNTVCN = sails.config.common.COMPANYACCOUNTVCN;


module.exports = {
  getBalBTC: function(req, res, next) {
    console.log("Enter into getBalBTC::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
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
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBTC.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userBTCbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBTCAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BTC Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BTC server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BTC Server getBalance",
              statusCode: 400
            });
          }
          var totalBTCbalance = (parseFloat(userBTCbalanceInDb));
          if (parseFloat(userBTCbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userBTCbalanceInDb = parseFloat(user.BTCbalance);
            var userBTCbalanceInDb = new BigNumber(user.BTCbalance);
            var balanceFromCoinNode = new BigNumber(userBTCbalanceFromServer);
            var updateUserBTCBalance = userBTCbalanceInDb.plus(balanceFromCoinNode);
            clientBTC.cmd('move', labelWithPrefix,
              COMPANYACCOUNTBTC, userBTCbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromBTCAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "BTC Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in BTC server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in BTC Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      BTCbalance: parseFloat(updateUserBTCBalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User balance",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                        email: userMailId
                      }).populateAll().exec(function(err, user) {
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
                        console.log("Return Update details for BTC balance :: " + user);
                        res.json({
                          user: user,
                          statusCode: 200
                        });
                      });
                    });
                }
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
  getBalBCH: function(req, res, next) {
    console.log("Enter into getBalBCH::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
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
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBCH.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userBCHbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromBCHAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "BCH Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in BCH server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in BCH Server getBalance",
              statusCode: 400
            });
          }
          var totalBCHbalance = (parseFloat(userBCHbalanceInDb));
          if (parseFloat(userBCHbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userBCHbalanceInDb = parseFloat(user.BCHbalance);
            var userBCHbalanceInDb = new BigNumber(user.BCHbalance);
            var balanceFromCoinNode = new BigNumber(userBCHbalanceFromServer);
            var updateUserBCHBalance = userBCHbalanceInDb.plus(balanceFromCoinNode);
            clientBCH.cmd('move', labelWithPrefix,
              COMPANYACCOUNTBCH, userBCHbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromBCHAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "BCH Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in BCH server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in BCH Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      BCHbalance: parseFloat(updateUserBCHBalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User balance",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                        email: userMailId
                      }).populateAll().exec(function(err, user) {
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
                        console.log("Return Update details for BCH balance :: " + user);
                        res.json({
                          user: user,
                          statusCode: 200
                        });
                      });
                    });
                }
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
  getBalLTC: function(req, res, next) {
    console.log("Enter into getBalLTC::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
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
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientLTC.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userLTCbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromLTCAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "LTC Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in LTC server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in LTC Server getBalance",
              statusCode: 400
            });
          }
          var totalLTCbalance = (parseFloat(userLTCbalanceInDb));
          if (parseFloat(userLTCbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userLTCbalanceInDb = parseFloat(user.LTCbalance);
            var userLTCbalanceInDb = new BigNumber(user.LTCbalance);
            var balanceFromCoinNode = new BigNumber(userLTCbalanceFromServer);
            var updateUserLTCBalance = userLTCbalanceInDb.plus(balanceFromCoinNode);
            clientLTC.cmd('move', labelWithPrefix,
              COMPANYACCOUNTLTC, userLTCbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromLTCAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "LTC Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in LTC server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in LTC Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      LTCbalance: parseFloat(updateUserLTCBalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User balance",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                        email: userMailId
                      }).populateAll().exec(function(err, user) {
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
                        console.log("Return Update details for LTC balance :: " + user);
                        res.json({
                          user: user,
                          statusCode: 200
                        });
                      });
                    });
                }
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
  getBalVCN: function(req, res, next) {
    console.log("Enter into getBalVCN::: ");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
    }).populateAll().exec(function(err, user) {
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
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientVCN.cmd(
        'getbalance',
        labelWithPrefix,
        function(err, userVCNbalanceFromServer, resHeaders) {
          if (err) {
            console.log("Error from sendFromVCNAccount:: ");
            if (err.code && err.code == "ECONNREFUSED") {
              return res.json({
                "message": "VCN Server Refuse to connect App getBalance",
                statusCode: 400
              });
            }
            if (err.code && err.code < 0) {
              return res.json({
                "message": "Problem in VCN server getBalance",
                statusCode: 400
              });
            }
            return res.json({
              "message": "Error in VCN Server getBalance",
              statusCode: 400
            });
          }
          var totalVCNbalance = (parseFloat(userVCNbalanceInDb));
          if (parseFloat(userVCNbalanceFromServer) > 0) {
            console.log("Now Balance be update!!!!!!!!");
            //var userVCNbalanceInDb = parseFloat(user.VCNbalance);
            var userVCNbalanceInDb = new BigNumber(user.VCNbalance);
            var balanceFromCoinNode = new BigNumber(userVCNbalanceFromServer);
            var updateUserVCNBalance = userVCNbalanceInDb.plus(balanceFromCoinNode);
            clientVCN.cmd('move', labelWithPrefix,
              COMPANYACCOUNTVCN, userVCNbalanceFromServer,
              function(err, moveBalanceToCompany, resHeaders) {
                if (err) {
                  console.log("Error from sendFromVCNAccount:: ");
                  if (err.code && err.code == "ECONNREFUSED") {
                    return res.json({
                      "message": "VCN Server Refuse to connect App move ",
                      statusCode: 400
                    });
                  }
                  if (err.code && err.code < 0) {
                    return res.json({
                      "message": "Problem in VCN server move ",
                      statusCode: 400
                    });
                  }
                  return res.json({
                    "message": "Error in VCN Server move",
                    statusCode: 400
                  });
                }
                console.log("moveBalanceToCompany :: " + moveBalanceToCompany);
                if (moveBalanceToCompany) {

                  User.update({
                      email: userMailId
                    }, {
                      VCNbalance: parseFloat(updateUserVCNBalance)
                    })
                    .exec(function(err, updatedUser) {
                      if (err) {
                        return res.json({
                          "message": "Error to update User balance",
                          statusCode: 400
                        });
                      }
                      User.findOne({
                        email: userMailId
                      }).populateAll().exec(function(err, user) {
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
                        console.log("Return Update details for VCN balance :: " + user);
                        res.json({
                          user: user,
                          statusCode: 200
                        });
                      });
                    });
                }
              });
          } else {
            console.log("No need to update ");
            res.json({
              user: user,
              statusCode: 200
            });
          }
        });
    });
  },
  getRatesAllBidAsk: async function(req, res, next) {
    console.log("Enter into getRateAllBidAsk::: ");


    try {
      var askBTCVCN = await AskVCN.find({
        status: {
          'like': statusOne
        },
        marketId: {
          'like': BTCMARKETID
        }
      }).min('askRate');
      var bidBTCVCN = await BidVCN.find({
        status: {
          'like': statusOne
        },
        marketId: {
          'like': BTCMARKETID
        }
      }).max('bidRate');
    } catch (ex) {
      return res.json({
        message: "Unable to get rates!",
        statusCode: 200
      })
    }
    return res.json({
      askBTCVCN: askBTCVCN[0].askRate,
      bidBTCVCN: bidBTCVCN[0].bidRate,
      statusCode: 200
    });
  }
};