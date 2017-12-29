/**
 * TestController
 *
 * @description :: Server-side logic for managing tests
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var Web3 = require('web3');
var web3 = new Web3('http://localhost1:8545');

module.exports = {
  getNewETHAddress: function(req, res) {
    try {
      var newaddress = web3.eth.accounts.create('saddam@gmail.com');
    } catch (e) {
      console.log(e);
    }
    return res.json({
      newaddress: newaddress,
      statusCode: 400
    });
  },
  getETHBalance: function(req, res) {
    try {
      var balance = web3.eth.getBalance("0xbf15F353fAF7AB37D89C2ea50e4cc66Dbd1d4055");
    } catch (e) {
      console.log(e);
    }
    return res.json({
      balance: balance,
      statusCode: 400
    });
  },
  getETHTransactions: function(req, res) {
    try {
      var balance = web3.eth.getBalance("0x407d73d8a49eeb85d32cf465507dd71d507100c1");
    } catch (e) {
      console.log(e);
    }
    return res.json({
      balance: balance,
      statusCode: 400
    });
  }
};