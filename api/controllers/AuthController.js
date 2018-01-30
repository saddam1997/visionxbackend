/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var request = require('request');
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var mergeJSON = require("merge-json");
var validator = require('validator');
var crypto = require("crypto");
var twilio = require('twilio');

var transporter = nodemailer.createTransport({
  service: sails.config.common.supportEmailIdService,
  auth: {
    user: sails.config.common.supportEmailId,
    pass: sails.config.common.supportEmailIdpass
  }
});

var client = new twilio(sails.config.common.twilioAuthId,sails.config.common.twilioTokenId);

const loginHostoryStatus = sails.config.common.loginHostoryStatus;
const loginHostoryStatusName = sails.config.common.loginHostoryStatusName;

module.exports = {

  logout: function(req, res) {
    req.session.destroy()
    res.json(200, {
      message: 'Logout Successfully'
    });
  },

  login: function(req, res) {
  console.log("Enter into login!!!" + req.body.email);
  var useremail = req.param('email');
  var password = req.param('password');
  var ip = req.param('ip');
  // var ip = "192.168.0.1";
  if (!useremail || !password || !ip) {
    console.log("email and password required");
    return res.json({
      "message": "Can't be empty!!!",
      statusCode: 401
    });
  }
  console.log("Finding user....");
  User.findOne({
      email: useremail
    })
    .populateAll()
    .exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Please enter registered email!",
          statusCode: 401
        });
      }
      if (!user.verifyEmail) {
        return res.json({
          "message": "We already sent email verification link please verify your email !!",
          statusCode: 401
        });
      }
      console.log("Compare passs");
      User.comparePassword(password, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct password",
            statusCode: 401
          });
        } else {

          if(user.mobileStatus){
                   var twoFactorAuthentication = Math.floor(100000 + Math.random() * 900000);
                   console.log("twoFactorAuthentication :: " + twoFactorAuthentication);
                    //for enabling two factor authentication
                    bcrypt.hash(twoFactorAuthentication.toString(), 10, function(err, hash) {
                    if (err) return next(err);
                    var twofactAuth = hash;
                    User.update({
                        email: useremail
                      }, {
                        encryptedTwoFactorAuthentication: twofactAuth
                      })
                      .exec(function(err, updatedUser) {
                          if (err) {
                            return res.serverError(err);
                          }
                            //sending OTP on mobile
                              console.log("OTP send for two factor authentication for ::"+user.mobile);
                              client.messages.create({
                                to:"+91"+user.mobile,
                                from:'+15189667398',
                                body:'Your Visionex OTP is : '+twoFactorAuthentication
                              }, function(error, message) {
                                  if (!error) {
                                      return res.json({
                                      "message": "Otp has been sent on your Mobile.",
                                      "userMailId": useremail,
                                      user : user,
                                      statusCode: 200
                                    });

                                  } else {
                                      console.log('Oops! There was an error.'+error);
                                      return res.json({err : error, status :400, message : "OTP can't be send on your mobile number."})
                                  }
                               });
                      });
                   });
               }
                  else{
                      return  res.json({
                        user: user,
                        statusCode: 200,
                        token: jwToken.issue({
                          id: user.id
                        })
                      });
                  }



        }
      });
    });
},

  verifyLoginOTP : function(req, res){
   console.log("Enter into verifyLoginOTP");
  var userMailId = req.body.email;
  var otp = req.body.otp;
  if (!userMailId || !otp) {
    console.log("Can't be empty!!! by user.....");
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
    User.compareLoginOTP(otp, user, function(err, valid) {
      if (err) {
        console.log("Error to compare otp");
        return res.json({
          "message": "Error to compare otp",
          statusCode: 401
        });
      }
      if (!valid) {
        return res.json({
          "message": "Please enter correct otp",
          statusCode: 401
        });
      } else {
        console.log("OTP is verified successfully");
        res.json({
            user: user,
            statusCode: 200,
            token: jwToken.issue({
              id: user.id
            })
          });
      }
    });
  });
},

authentcate: function(req, res) {
  console.log("Enter into authentcate!!!" + req.body.email);
  var useremail = req.param('email');
  var password = req.param('password');
  var ip = req.param('ip');
  // var ip = "192.168.0.1";
  if (!useremail || !password || !ip) {
    console.log("email and password required");
    return res.json({
      "message": "Can't be empty!!!",
      statusCode: 401
    });
  }
  console.log("Finding user....");
  User.findOne({
      email: useremail
    })
    .populateAll()
    .exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "Please enter registered email!",
          statusCode: 401
        });
      }
      if (!user.verifyEmail) {
        return res.json({
          "message": "We already sent email verification link please verify your email !!",
          statusCode: 401
        });
      }
      console.log("Compare passs");
      User.comparePassword(password, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct password",
            statusCode: 401
          });
        } else {

            if(user.mobileStatus){

            var twoFactorAuthentication = Math.floor(100000 + Math.random() * 900000);
             console.log("twoFactorAuthentication :: " + twoFactorAuthentication);
              //for enabling two factor authentication
              bcrypt.hash(twoFactorAuthentication.toString(), 10, function(err, hash) {
              if (err) return next(err);
              var twofactAuth = hash;
              User.update({ email: useremail }, { encryptedTwoFactorAuthentication: twofactAuth })
                .exec(function(err, updatedUser) {
                    if (err) {
                      return res.serverError(err);
                    }

                //sending OTP on mobile
                    console.log("OTP send for two factor authentication");
                    client.messages.create({
                      to:"+91"+user.mobile,
                      from:'+15189667398',
                      body:'Your Visionex OTP is : '+twoFactorAuthentication
                    }, function(error, message) {
                        if (!error) {
                            return res.json({
                            "message": "Otp has been sent on your Mobile as well as Email.",
                            "userMailId": useremail,
                            statusCode: 200
                          });

                        } else {
                            console.log('Oops! There was an error.'+error);
                            return res.json({err : error, status :400, message : "OTP can't be send on your mobile number."})
                        }
                     });
                  })
              });

              }
              else{
                    res.json({
                    user: user,
                    statusCode: 200,
                    token: jwToken.issue({
                      id: user.id
                    })
                  });
              }
        }

      });
    });
},
  // authentcate: function(req, res) {
  //   console.log("Enter into authentcate!!!");
  //   var useremail = req.param('email');
  //   var password = req.param('password');
  //   var ip = req.param('ip');
  //
  //
  //   //    var ip = "192.168.0.1";
  //   if (!useremail || !password || !ip) {
  //     console.log("email and password required");
  //     return res.json({
  //       "message": "Can't be empty!!!",
  //       statusCode: 401
  //     });
  //   }
  //   console.log("Finding user....");
  //   User.findOne({
  //       email: useremail
  //     })
  //     .populateAll()
  //     .exec(function(err, user) {
  //       if (err) {
  //         return res.json({
  //           "message": "Error to find user",
  //           statusCode: 401
  //         });
  //       }
  //       if (!user) {
  //         return res.json({
  //           "message": "Please enter registered email!",
  //           statusCode: 401
  //         });
  //       }
  //       if (!user.verifyEmail) {
  //         return res.json({
  //           "message": "We have already sent an email verification link to your registered email address. Please verify your email to continue !!!",
  //           statusCode: 401
  //         });
  //       }
  //       if (user.isUserDisable) {
  //         return res.json({
  //           "message": "This email is disabled. Please contact admin !!!",
  //           statusCode: 401
  //         });
  //       }
  //       console.log("Compare passs");
  //       User.comparePassword(password, user, function(err, valid) {
  //         if (err) {
  //           console.log("Error to compare password");
  //           return res.json({
  //             "message": "Error to compare password",
  //             statusCode: 401
  //           });
  //         }
  //         if (!valid) {
  //           return res.json({
  //             "message": "Please enter correct password",
  //             statusCode: 401
  //           });
  //         } else {
  //           console.log("User is valid return user details !!!");
  //           LoginHistory.create({
  //               ip: ip,
  //               status: loginHostoryStatus,
  //               statusName: loginHostoryStatusName,
  //               loginowner: user.id
  //             })
  //             .exec(function(err, createLoginHistory) {
  //               if (err) {
  //                 console.log("Error to update user");
  //                 return res.serverError(err);
  //               }
  //               if (user.tfastatus) {
  //                 console.log("Enter into this user.tfastatus");
  //                 res.json({
  //                   user: user,
  //                   statusCode: 201,
  //                   message: "Google Authenticattion Enabled For this user!!!",
  //                   token: jwToken.issue({
  //                     id: user.id
  //                   })
  //                 });
  //               } else {
  //                 console.log("Returnin user detailsss");
  //                 res.json({
  //                   user: user,
  //                   statusCode: 200,
  //                   token: jwToken.issue({
  //                     id: user.id
  //                   })
  //                 });
  //               } //
  //             })
  //         } //
  //       })
  //     })
  // }
}
