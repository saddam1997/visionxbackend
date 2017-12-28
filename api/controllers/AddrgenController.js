/**
 * AddrgenController
 *
 * @description :: Server-side logic for managing addrgens
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
//BTC Wallet Details qwert  uoiuoiuo
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
module.exports = {
  getNewBTCAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      if (user.isBTCAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBTC.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from BTC server",
            statusCode: 400
          });
        }
        console.log('BTC address generated', address);
        if (!user.isBTCAddress) {
          User.update({
            email: userMailId
          }, {
            isBTCAddress: true,

            userBTCAddress: address
          }).exec(function afterwards(err, updated) {

            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewBCHAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      if (user.isBCHAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientBCH.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from BCH server",
            statusCode: 400
          });
        }
        console.log('BCH address generated', address);
        if (!user.isBCHAddress) {
          User.update({
            email: userMailId
          }, {
            isBCHAddress: true,

            userBCHAddress: address
          }).exec(function afterwards(err, updated) {

            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewLTCAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      if (user.isLTCAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientLTC.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from LTC server",
            statusCode: 400
          });
        }
        console.log('LTC address generated', address);
        if (!user.isLTCAddress) {
          User.update({
            email: userMailId
          }, {
            isLTCAddress: true,

            userLTCAddress: address
          }).exec(function afterwards(err, updated) {

            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
  getNewVCNAddress: function(req, res) {
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
      email: userMailId
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
      if (user.isVCNAddress) {
        return res.json({
          "message": "Address already exist!!",
          statusCode: 401
        });
      }
      var labelWithPrefix = LABELPREFIX + userMailId;
      console.log("labelWithPrefix :: " + labelWithPrefix);
      clientVCN.cmd('getnewaddress', labelWithPrefix, function(err, address) {
        if (err) {
          return res.json({
            "message": "Failed to get new address from VCN server",
            statusCode: 400
          });
        }
        console.log('VCN address generated', address);
        if (!user.isVCNAddress) {
          User.update({
            email: userMailId
          }, {
            isVCNAddress: true,

            userVCNAddress: address
          }).exec(function afterwards(err, updated) {

            if (err) {
              console.log("asdfasdf" + JSON.stringify(err));
              return res.json({
                "message": "Failed to update new address in database",
                statusCode: 401
              });
            }
            return res.json({
              message: "Address created successfully.",
              newaddress: address,
              statusCode: 200
            });
          });
        }
      });
    });
  },
};