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
      // required: true,
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

    LTCbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedLTCbalance: {
      type: 'float',
      defaultsTo: 0
    },

    VCNbalance: {
      type: 'float',
      defaultsTo: 0
    },
    FreezedVCNbalance: {
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
    isLTCAddress: {
      type: "boolean",
      defaultsTo: false
    },
    isVCNAddress: {
      type: "boolean",
      defaultsTo: false
    },

    userBTCAddress: {
      type: 'string'
    },
    userBCHAddress: {
      type: 'string'
    },
    userLTCAddress: {
      type: 'string'
    },
    userVCNAddress: {
      type: 'string'
    },
    encryptedPassword: {
      type: 'string'
    },
    encryptedTwoFactorAuthentication : {
      type : 'string'
    },
    encryptedResetSpendingpassword: {
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
    taxProofImageName: {
     type: 'string'
   },
   addressProofImageName: {
     type: 'string'
   },
   isKYC: {
     type: 'boolean',
     defaultsTo: false
   },
   verificationStatus: {
     type: 'integer',
     defaultsTo: 0
   },
    verifyEmail: {
      type: 'boolean',
      defaultsTo: false
    },
    tfastatus: {
      type: "boolean",
      defaultsTo: false
    },

    isSignUp: {
      type: "boolean",
      defaultsTo: false
    },
    isMobileVerified : {
        type : 'boolean',
         defaultsTo: 0
      },
      mobile : {
        type : 'string'
      },
      encryptMobileOTP : {
        type : 'string'
      },



    mobileStatus: {
      type: "boolean",
      defaultsTo: true
    },

    googlesecreatekey: {
      type: 'string'
    },
    isAdmin: {
      type: 'boolean',
      defaultsTo: false
    },
    //VCN
    bidsVCN: {
      collection: 'bidVCN',
      via: 'bidownerVCN'
    },
    asksVCN: {
      collection: 'askVCN',
      via: 'askownerVCN'
    },
    //BCH
    bidsBCH: {
      collection: 'bidBCH',
      via: 'bidownerBCH'
    },
    asksBCH: {
      collection: 'askBCH',
      via: 'askownerBCH'
    },
    //LTC
    bidsLTC: {
      collection: 'bidLTC',
      via: 'bidownerLTC'
    },
    asksLTC: {
      collection: 'askLTC',
      via: 'askownerLTC'
    },
    transations: {
      collection: 'transation',
      via: 'transationowner'
    },
    tickets: {
      collection: 'ticket',
      via: 'ticketOwnerId'
    },
    verificationDetails: {
     collection: 'verification',
     via: 'verificationowner'
   },
    loginHistory: {
      collection: 'loginHistory',
      via: 'loginowner'
    },
    toJSON: function() {
      var obj = this.toObject();
      delete obj.encryptedPassword;
      delete obj.encryptedSpendingpassword;
      delete obj.encryptedEmailVerificationOTP;
      delete obj.encryptedForgotPasswordOTP;
      delete obj.encryptedForgotSpendingPasswordOTP;
      delete obj.encryptMobileOTP;
      return obj;
    }
  },
  // beforeCreate: function(values, next) {
  //   bcrypt.genSalt(10, function(err, salt) {
  //     if (err) return next(err);
  //     bcrypt.hash(values.password, salt, function(err, hash) {
  //       if (err) return next(err);
  //       values.encryptedPassword = hash;
  //       next();
  //     })
  //   })
  // },
  compareMobileOTP : function(otp, user, cb = () => {}) {
    bcrypt.compare(otp, user.encryptMobileOTP, function(err, match) {
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

  compareLoginOTP: function(typeOtp, user, cb = () => {}) {
   bcrypt.compare(typeOtp, user.encryptedTwoFactorAuthentication, function(err, match) {
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
  compareResetSpendingpassword: function(resetspendingpassword, user, cb = () => {}) {
    bcrypt.compare(resetspendingpassword, user.encryptedResetSpendingpassword, function(err, match) {
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
