/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */
var bcrypt = require('bcrypt');
module.exports = {
  schema: true,
  attributes: {
    email: {
      type: 'email',
      email: true,
      required: true,
      unique: true
    },
    BTCbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedBTCbalance: {
      type: 'float',
      defaultsTo: 0
    },

    BCHbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedBCHbalance: {
      type: 'float',
      defaultsTo: 0
    },

    INRbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedINRbalance: {
      type: 'float',
      defaultsTo: 0
    },

    isUserDisable: {
      type: "boolean",
      defaultsTo: false
    },

    isUserFreezed: {
      type: "boolean",
      defaultsTo: false
    },

    isBTCAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isBCHAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isINRAddress: {
      type: "boolean",
      defaultsTo: false
    },

    userBTCAddress: {
      type: 'string'
    },
    userBCHAddress: {
      type: 'string'
    },
    userINRAddress: {
      type: 'string'
    },

    encryptedPassword: {
      type: 'string'
    },
    encryptedSpendingpassword: {
      type: 'string'
    },
    encryptedForgotPasswordOTP: {
      type: 'string'
    },
    encryptedForgotSpendingPasswordOTP: {
      type: 'string'
    },
    encryptedEmailVerificationOTP: {
      type: 'string'
    },
    verifyEmail: {
      type: 'boolean',
      defaultsTo: false
    },
    tfastatus: {
      type: "boolean",
      defaultsTo: false
    },
    googlesecreatekey: {
      type: 'string'
    },
    isAdmin: {
      type: 'boolean',
      defaultsTo: false
    },
    //Tradebalanceorder
    tradebalanceorderDetails: {
      collection: 'tradebalanceorder',
      via: 'tradebalanceorderowner'
    },
    //INR
    bidsINR: {
      collection: 'bidINR',
      via: 'bidownerINR'
    },
    asksINR: {
      collection: 'askINR',
      via: 'askownerINR'
    },
    transations: {
      collection: 'transation',
      via: 'transationowner'
    },
    tickets: {
      collection: 'ticket',
      via: 'ticketOwnerId'
    },
    toJSON: function() {
      var obj = this.toObject();
      delete obj.encryptedPassword;
      delete obj.encryptedSpendingpassword;
      delete obj.encryptedEmailVerificationOTP;
      delete obj.encryptedForgotPasswordOTP;
      delete obj.encryptedForgotSpendingPasswordOTP;
      return obj;
    }
  },
  beforeCreate: function(values, next) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) return next(err);
      bcrypt.hash(values.password, salt, function(err, hash) {
        if (err) return next(err);
        values.encryptedPassword = hash;
        next();
      })
    })
  },
  comparePassword: function(password, user, cb = () => {}) {
    bcrypt.compare(password, user.encryptedPassword, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },
  compareSpendingpassword: function(spendingpassword, user, cb = () => {}) {
    bcrypt.compare(spendingpassword, user.encryptedSpendingpassword, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },

  compareForgotpasswordOTP: function(otp, user, cb = () => {}) {
    bcrypt.compare(otp, user.encryptedForgotPasswordOTP, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },
  compareEmailVerificationOTP: function(otp, user, cb = () => {}) {
    bcrypt.compare(otp, user.encryptedEmailVerificationOTP, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  },
  compareEmailVerificationOTPForSpendingPassword: function(otp, user, cb = () => {}) {
    bcrypt.compare(otp, user.encryptedForgotSpendingPasswordOTP, function(err, match) {
      return new Promise(function(resolve, reject) {
        if (err) {
          cb(err);
          return reject(err);
        }
        cb(null, match)
        resolve(match);
      })
    })
  }
};