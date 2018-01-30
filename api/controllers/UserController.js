/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

//External Dependencies.........
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
var projectURL = sails.config.common.projectURL;
var client = new twilio(sails.config.common.twilioAuthId,sails.config.common.twilioTokenId);

module.exports = {

  enabledLoginServiceType : function(req, res){
  let email = req.body.userMailId;
  let loginServiceType = req.body.loginServiceType;

  if(email && loginServiceType){

      User.findOne({email : email}).exec(function(err, user){
        if(err){
          return res.json({
            status : 400,
            message : 'Error while fetching from DB'
          })
        }
        if(user){
          console.log('switch::'+loginServiceType);
          switch(loginServiceType){

            case "1": console.log('switch::'+loginServiceType);
                  User.update({email : email}, {tfastatus : 1, mobileStatus : 0})
                  .exec(function(error, user1){
                      if(error){
                        return res.json({
                          status : 400,
                          message : 'Error while fetching from DB'
                        });
                      }
                      if(user1){
                        return res.json({
                          status : 200,
                          message : 'Service has been enable for Two factor authentication.'
                        });
                      }

                  });
            break;

            case "2":console.log('switch::'+loginServiceType);
                  User.update({email : email}, {tfastatus : 0, mobileStatus : 1})
                  .exec(function(error, user1){
                       if(error){
                        return res.json({
                          status : 400,
                          message : 'Error while fetching from DB'
                        });
                      }
                      if(user1){
                        return res.json({
                          status : 200,
                          message : 'Service has been enable for mobile OTP.'
                        });
                      }

                  });
            break;

          }

        }
        else{
          return res.json({
             status : 400,
             message : 'Email does not exists.'
           })
        }

      })
  }
  else{
    return res.json({
      status : 400,
      message : 'Please enter your enable service type.'
    })
  }

},

sendOTPmobileVerification : function(req, res){
  let mobileNo = req.body.mobileNo;

  if(mobileNo){
    var twoFactorAuthentication = Math.floor(100000 + Math.random() * 900000);
    console.log("twoFactorAuthentication :: " + twoFactorAuthentication);

      // let condition ={ $and: [ { email: { $ne: null } }, { mobile: mobileNo } ] };
      let condition ={ mobile : mobileNo , isSignUp : true};

      User.findOne(condition).exec(function(err, userdata){
        if(err){
            return res.json({
            status : 400,
            messgae : 'Error in server' +err
          });
        }
        if(userdata){
          return res.json({
            status : 400,
            message : mobileNo +' Already register with us.'
          });
        }
        else{
            client.messages.create({
            to : '+91'+mobileNo,
            from:'+15189667398',
            body:'Your Visionex OTP for Mobile Verification is : '+twoFactorAuthentication
          }, function(error, message) {
              if (!error) {

                  bcrypt.hash(twoFactorAuthentication.toString(), 10, function(err, hash) {
                    if (err) return next(err);
                    var twofactAuth = hash;
                    console.log('twofactAuth:::' + twofactAuth);
                     let userObj = {
                      mobile : mobileNo,
                      encryptMobileOTP : twofactAuth
                    };

                    User.updateOrCreate({ mobile : mobileNo},userObj).then((user) => {
                      if(!user){
                          console.log('User saved in DB' + data);
                          return res.json({
                            "message": "Error while saving in DB"+err,
                            statusCode: 400
                          })
                      }
                      else{
                        return res.json({
                        "message": "Otp has been sent on your Mobile.",
                        "mobileNo" : mobileNo,
                        statusCode: 200,
                        data : user
                      })
                    }

                  })
                  .catch(sails.log.error);

                });

              } else {
                  console.log('Oops! There was an error.'+error);
                  return res.json({err : error, status : 400,message : "OTP can't be send on your mobile number."})
              }
           });
        }
      })

  }
  else{
    return res.json({
      status : 400,
      messgae : 'Please enter mobile number.'
    });
  }
},

verifyMobileOTP : function(req, res){
    console.log("Enter into verifyMobileOTP");
  var userMobileNo = req.body.mobileNo;
  var otp = req.body.otp;
  if (!userMobileNo || !otp) {
    console.log("Can't be empty!!! by user.....");
    return res.json({
      "message": "Can't be empty!!!",
      statusCode: 400
    });
  }
  User.findOne({
    mobile: userMobileNo
  }).exec(function(err, user) {
    if (err) {
      return res.json({
        "message": "Error to find user",
        statusCode: 401
      });
    }
    if (!user) {
      return res.json({
        "message": "Invalid Mobile Number!",
        statusCode: 401
      });
    }
    User.compareMobileOTP(otp, user, function(err, valid) {
      if (err) {
        console.log("Error to compare otp");
        return res.json({
          "message": "Error to compare otp",
          statusCode: 401
        });
      }
      if (!valid) {
        return res.json({
          "message": "Please enter correct otp!",
          statusCode: 401
        });
      } else {
        User.update({mobile : userMobileNo},{ isMobileVerified : true}).exec(function(err, data){
          if(err){
            return res.json({
              status : 400,
              messgae : 'Not verified Yet'
            })
          }
          else{
            console.log("OTP is verified successfully");
            res.json(200, {
              "message": "OTP  verified successfully",
              "userMobileNo": userMobileNo,
              statusCode: 200,
              data : data
            });
          }
        })

      }
    });
  });
},
createNewUser: function(req, res) {
  console.log("Enter into createNewUser :: " + req.body.email);
  var useremailaddress = req.body.email;
  var userpassword = req.body.password;
  var userconfirmPassword = req.body.confirmPassword;
  var userspendingpassword = req.body.spendingpassword;
  var userconfirmspendingpassword = req.body.confirmspendingpassword;
  var googlesecreatekey = req.body.googlesecreatekey;
  var mobileNo = req.body.mobileNo;

  if (!validator.isEmail(useremailaddress)) {
    return res.json({
      "message": "Please Enter valid email id",
      statusCode: 400
    });
  }
  if (!mobileNo || !useremailaddress || !userpassword || !googlesecreatekey || !userconfirmPassword ||
    !userspendingpassword || !userconfirmspendingpassword) {
    console.log("User Entered invalid parameter ");
    return res.json({
      "message": "Can't be empty!!!",
      statusCode: 400
    });
  }
  if (userpassword !== userconfirmPassword) {
    console.log("Password and confirmPassword doesn\'t match!");
    return res.json({
      "message": 'Password and confirmPassword doesn\'t match!',
      statusCode: 400
    });
  }

  if (userspendingpassword !== userconfirmspendingpassword) {
    console.log("spendingpassword and confirmspendingpassword doesn\'t match!");
    return res.json({
      "message": 'spendingpassword and confirmspendingpassword doesn\'t match!',
      statusCode: 400
    });
  }

  User.findOne({
    email: useremailaddress
  }, function(err, user) {
    if (err) {
      console.log("Error to find user from database");
      return err.toString();
    }
    if (user && !user.verifyEmail) {
      console.log("Use email exit But but not verified ");
      return res.json({
        "message": 'Email already exit but not varifed please login and verify',
        statusCode: 400
      });
    }
    if (user) {
      console.log("Use email exit and return ");
      return res.json({
        "message": 'email already exist',
        statusCode: 400
      });
    }
    if (!user) {
      let userPassword;
      bcrypt.hash(userpassword, 10, function(err, userpassword) {
        userPassword = userpassword;
      });

      bcrypt.hash(userspendingpassword, 10, function(err, hashspendingpassword) {
        if (err) {
          console.log("Error To bcrypt spendingpassword");
          return res.json({
            "message": err,
            statusCode: 500
          });
        }
        var otpForEmail = crypto.randomBytes(20).toString('hex');;
        console.log("otpForEmail :: " + otpForEmail);
            bcrypt.hash(otpForEmail.toString(), 10, function(err, hash) {
              if (err) return next(err);
              var encOtpForEmail = hash;
              var userObj = {
                email: useremailaddress,
                encryptedPassword: userPassword,
                encryptedSpendingpassword: hashspendingpassword,
                encryptedEmailVerificationOTP: encOtpForEmail,
                googlesecreatekey: googlesecreatekey,
                mobile : mobileNo,
                isSignUp : true
              }

              User.findOne({mobile : mobileNo}).exec(function(err, user){
                if(err){
                  return res.json({
                    message: 'Not saved in DB',
                    statusCode: 500
                  });
                }

                if(user){
                      User.update({mobile : mobileNo},userObj).exec(function(err, userAddDetails) {
                      if (err) {
                        console.log("Error to Create New user !!!");
                        console.log(err);
                        return res.json({
                          "message": "Error to create New User",
                          statusCode: 400
                        });
                      }
                      console.log("User Create Succesfully...........");

                      var verificationURL = projectURL + "/user/verifyEmailAddress?email=" + useremailaddress + "&otp=" + otpForEmail;
                      //console.log("verificationURL ::: " + verificationURL);
                      var currentDate = new Date();
                      var mailOptions = {
                        from: sails.config.common.supportEmailId,
                        to: useremailaddress,
                        subject: 'Please verify email !!!',
                        html: ` <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                        <html xmlns="http://www.w3.org/1999/xhtml">
                        <head>
                          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                          <meta name="viewport" content="width=device-width, initial-scale=1" />
                          <title>OTP Email</title>
                          <!-- Designed by https://github.com/kaytcat -->
                          <!-- Header image designed by Freepik.com -->


                          <style type="text/css">
                          /* Take care of image borders and formatting */

                          img { max-width: 600px; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;}
                          a img { border: none; }
                          table { border-collapse: collapse !important; }
                          #outlook a { padding:0; }
                          .ReadMsgBody { width: 100%; }
                          .ExternalClass {width:100%;}
                          .backgroundTable {margin:0 auto; padding:0; width:100% !important;}
                          table td {border-collapse: collapse;}
                          .ExternalClass * {line-height: 115%;}


                          /* General styling */

                          td {
                            font-family: Arial, sans-serif;
                          }

                          body {
                            -webkit-font-smoothing:antialiased;
                            -webkit-text-size-adjust:none;
                            width: 100%;
                            height: 100%;
                            color: #6f6f6f;
                            font-weight: 400;
                            font-size: 18px;
                          }


                          h1 {
                            margin: 10px 0;
                          }

                          a {
                            color: #27aa90;
                            text-decoration: none;
                          }

                          .force-full-width {
                            width: 100% !important;
                          }


                          .body-padding {
                            padding: 0 75px;
                          }



                          </style>

                          <style type="text/css" media="screen">
                              @media screen {
                                @import url(http://fonts.googleapis.com/css?family=Source+Sans+Pro:400,600,900);
                                /* Thanks Outlook 2013! */
                                * {
                                  font-family: 'Source Sans Pro', 'Helvetica Neue', 'Arial', 'sans-serif' !important;
                                }
                                .w280 {
                                  width: 280px !important;
                                }

                              }
                          </style>

                          <style type="text/css" media="only screen and (max-width: 480px)">
                            /* Mobile styles */
                            @media only screen and (max-width: 480px) {

                              table[class*="w320"] {
                                width: 320px !important;
                              }

                              td[class*="w320"] {
                                width: 280px !important;
                                padding-left: 20px !important;
                                padding-right: 20px !important;
                              }

                              img[class*="w320"] {
                                width: 250px !important;
                                height: 67px !important;
                              }

                              td[class*="mobile-spacing"] {
                                padding-top: 10px !important;
                                padding-bottom: 10px !important;
                              }

                              *[class*="mobile-hide"] {
                                display: none !important;
                              }

                              *[class*="mobile-br"] {
                                font-size: 12px !important;
                              }

                              td[class*="mobile-w20"] {
                                width: 20px !important;
                              }

                              img[class*="mobile-w20"] {
                                width: 20px !important;
                              }

                              td[class*="mobile-center"] {
                                text-align: center !important;
                              }

                              table[class*="w100p"] {
                                width: 100% !important;
                              }

                              td[class*="activate-now"] {
                                padding-right: 0 !important;
                                padding-top: 20px !important;
                              }

                            }
                          </style>
                        </head>
                        <body  offset="0" class="body" style="padding:0; margin:0; display:block; background:#eeebeb; -webkit-text-size-adjust:none" bgcolor="#eeebeb">
                        <table align="center" cellpadding="0" cellspacing="0" width="100%" height="100%">
                          <tr>
                            <td align="center" valign="top" style="background-color:#eeebeb" width="100%">

                            <center>

                              <table cellspacing="0" cellpadding="0" width="600" class="w320">
                                <tr>
                                  <td align="center" valign="top">




                                  <table cellspacing="0" cellpadding="0" width="100%" style="background-color:#3bcdb0;">
                                    <tr>
                                      <td style="text-align: center;">
                                        <a href="#"><img class="w320" width="311" height="83" src="#" alt="company logo" ></a>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="background-color:#3bcdb0;">

                                        <table cellspacing="0" cellpadding="0" width="100%">
                                          <tr>
                                            <td style="font-size:40px; font-weight: 600; color: #ffffff; text-align:center;" class="mobile-spacing">
                                            <div class="mobile-br">&nbsp;</div>
                                              Welcome to Visionex.io
                                            <br>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td style="font-size:24px; text-align:center; padding: 0 75px; color:#6f6f6f;" class="w320 mobile-spacing">
                                              <br>
                                            </td>
                                          </tr>
                                        </table>

                                      </td>
                                    </tr>
                                  </table>

                                  <table cellspacing="0" cellpadding="0" width="100%" bgcolor="#ffffff" >
                                    <tr>
                                      <td style="background-color:#ffffff;">
                                        <table cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td style="font-size:24px; text-align:center;" class="mobile-center body-padding w320">
                                          <br>
                                  Email Verification:

                                          </td>
                                        </tr>
                                      </table>

                                      <table cellspacing="0" cellpadding="0" class="force-full-width">
                                        <tr>

                                          <td width="75%" class="">
                                            <table cellspacing="0" cellpadding="0" class="w320 w100p"><br>
                                              <tr>
                                                <td class="mobile-center activate-now" style="font-size:17px; text-align:center; padding: 0 75px; color:#6f6f6f;" >

                                                 Dear ${useremailaddress},
                                                </td>
                                              </tr>
                                            </table>
                                          </td>
                                        </tr>
                                      </table>
                                        <table cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td style="text-align:left; font-size:13px;" class="mobile-center body-padding w320">
                                          <br>                            We're really excited for you to join our community!
                                                     You're just one click away from activate your account.
                                        <br>
                                          </td>
                                        </tr>
                                      </table>

                                      <table style="margin:0 auto;" cellspacing="0" cellpadding="10" width="100%">
                                        <tr>
                                          <td style="text-align:center; margin:0 auto;">
                                          <br>
                                            <div>
                                                  <div href="http://"
                                                style="background-color:#f5774e;color:#ffffff;display:inline-block;font-family:'Source Sans Pro', Helvetica, Arial, sans-serif;font-size:18px;font-weight:400;line-height:45px;text-align:center;text-decoration:none;width:180px;-webkit-text-size-adjust:none;"><a style="color:#ffffff" href=${verificationURL}>Activate Now!</a></div>
                                             </div>
                                            <br>
                                          </td>
                                        </tr>
                                      </table>
                                      <table cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td style="text-align:left; font-size:13px;" class="mobile-center body-padding w320">
                                          <br>
                                          <strong>Please Note : </strong><br>
                                  1. Do not share your credentials or otp with anyone on email.<br>
                                  2. Wallet never asks you for your credentials or otp.<br>
                                  3. Always create a strong password and keep different passwords for different websites.<br>
                                  4. Ensure you maintain only one account on wallet to enjoy our awesome services.<br><br><br>
                                          </td>
                                        </tr>
                                      </table>
                                      <table cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td style="text-align:left; font-size:13px;" class="mobile-center body-padding w320">
                                          <br>
                                            If you have any questions regarding Visionex.io please read our FAQ or use our support form wallet eamil address). Our support staff will be more than happy to assist you.<br><br>
                                          </td>
                                        </tr>
                                      </table>
                                       <table cellspacing="0" cellpadding="0" width="100%">
                                        <tr>
                                          <td style="text-align:left; font-size:13px;" class="mobile-center body-padding w320">
                                          <br>
                                          <b>Regards,</b><br>
                                           Visionex.io team<br>Thank you<br><br><br>
                                          </td>
                                        </tr>
                                      </table>



                                      <table cellspacing="0" cellpadding="0" bgcolor="#363636"  class="force-full-width">

                                        <tr>
                                          <td style="color:#f0f0f0; font-size: 14px; text-align:center; padding-bottom:4px;"><br>
                                            © 2017 All Rights Reserved Visionex.io
                                          </td>
                                        </tr>
                                        <tr>
                                          <td style="color:#27aa90; font-size: 14px; text-align:center;">
                                            <a href="#">View in browser</a> | <a href="#">Contact</a> | <a href="#">Unsubscribe</a>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td style="font-size:12px;">
                                            &nbsp;
                                          </td>
                                        </tr>
                                      </table>

                                      </td>
                                    </tr>
                                  </table>
                                  </td>
                                </tr>
                              </table>

                            </center>
                            </td>
                          </tr>
                        </table>
                        </body>
                        </html>`
                      };
                transporter.sendMail(mailOptions, function(error, info) {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log('Email sent: ' + info.response);
                    return res.json(200, {
                      "message": "We sent link on your email address please verify link!!!",
                      "userMailId": useremailaddress,
                      statusCode: 200
                    });
                  }
                });
              });
            }
            else{
              return res.json({
                message: 'Please verified, Phone Number first',
                statusCode: 400
              });
            }

          });
        });
      });
    }
  });
},
  // createNewUser: function(req, res) {
  //   console.log("Enter into createNewUser :: " + req.body.email);
  //   var useremailaddress = req.body.email;
  //   var userpassword = req.body.password;
  //   var userconfirmPassword = req.body.confirmPassword;
  //   var userspendingpassword = req.body.spendingpassword;
  //   var userconfirmspendingpassword = req.body.confirmspendingpassword;
  //   var googlesecreatekey = req.body.googlesecreatekey;
  //   if (!validator.isEmail(useremailaddress)) {
  //     return res.json({
  //       "message": "The Email provided by you is incorrect . Please enter valid Email ID",
  //       statusCode: 400
  //     });
  //   }
  //   if (!useremailaddress || !userpassword || !userconfirmPassword || !userspendingpassword || !googlesecreatekey || !userconfirmspendingpassword) {
  //     console.log("User Entered invalid parameter ");
  //     return res.json({
  //       "message": "Can't be empty!!!",
  //       statusCode: 400
  //     });
  //   }
  //   if (userpassword !== userconfirmPassword) {
  //     console.log("Password and confirmPassword doesn\'t match!");
  //     return res.json({
  //       "message": 'The passwords provided by you is not match with each other .Please provide valid one or re-enter them correctly.',
  //       statusCode: 400
  //     });
  //   }
  //
  //   if (userspendingpassword !== userconfirmspendingpassword) {
  //     console.log("transactionpassword and confirmtransactionpassword doesn\'t match!");
  //     return res.json({
  //       "message": 'The transaction passwords provided by you is not match with each other .Please provide valid one or re-enter them correctly.',
  //       statusCode: 400
  //     });
  //   }
  //
  //   User.findOne({
  //     email: useremailaddress
  //   }, function(err, user) {
  //     if (err) {
  //       console.log("Error to find user from database");
  //       return res.json({
  //         "message": "Error to find User",
  //         statusCode: 400
  //       });
  //     }
  //     if (user && !user.verifyEmail) {
  //       console.log("Use email exit But but not verified ");
  //       return res.json({
  //         "message": 'Email already exist but not verifed please login and verify',
  //         statusCode: 400
  //       });
  //     }
  //     if (user) {
  //       console.log("Use email exit and return ");
  //       return res.json({
  //         "message": 'Your Email Id is already exist, Please Sign in.',
  //         statusCode: 400
  //       });
  //     }
  //     if (!user) {
  //       bcrypt.hash(userspendingpassword, 10, function(err, hashspendingpassword) {
  //         if (err) {
  //           console.log("Error To bcrypt transactionpassword");
  //           return res.json({
  //             "message": err,
  //             statusCode: 500
  //           });
  //         }
  //
  //
  //         var otpForEmail = crypto.randomBytes(20).toString('hex');;
  //         console.log("otpForEmail :: " + otpForEmail);
  //         bcrypt.hash(otpForEmail.toString(), 10, function(err, hash) {
  //           if (err) return next(err);
  //           var encOtpForEmail = hash;
  //           var userObj = {
  //             email: useremailaddress,
  //             password: userpassword,
  //             encryptedSpendingpassword: hashspendingpassword,
  //             encryptedEmailVerificationOTP: encOtpForEmail,
  //             googlesecreatekey: googlesecreatekey
  //           }
  //           User.create(userObj).exec(function(err, userAddDetails) {
  //             if (err) {
  //               console.log("Error to Create New user !!!");
  //               console.log(err);
  //               return res.json({
  //                 "message": "Error to create New User",
  //                 statusCode: 400
  //               });
  //             }
  //             console.log("User Create Succesfully...........");
  //
  //             var verificationURL = projectURL + "/user/verifyEmailAddress?email=" + useremailaddress + "&otp=" + otpForEmail;
  //             //console.log("verificationURL ::: " + verificationURL);
  //             var mailOptions = {
  //               from: sails.config.common.supportEmailId,
  //               to: useremailaddress,
  //               subject: 'Please verify email !!!',
  //               html: `
  //                 <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  //                 <html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                 <head>
  //                   <meta name="viewport" content="width=device-width" />
  //                   <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  //                   <title>Actionable emails e.g. reset password</title>
  //
  //
  //                   <style type="text/css">
  //                     img {
  //                       max-width: 100%;
  //                     }
  //
  //                     body {
  //                       -webkit-font-smoothing: antialiased;
  //                       -webkit-text-size-adjust: none;
  //                       width: 100% !important;
  //                       height: 100%;
  //                       line-height: 1.6em;
  //                     }
  //
  //                     body {
  //                       background-color: #f6f6f6;
  //                     }
  //
  //                     @media only screen and (max-width: 640px) {
  //                       body {
  //                         padding: 0 !important;
  //                       }
  //                       h1 {
  //                         font-weight: 800 !important;
  //                         margin: 20px 0 5px !important;
  //                       }
  //                       h2 {
  //                         font-weight: 800 !important;
  //                         margin: 20px 0 5px !important;
  //                       }
  //                       h3 {
  //                         font-weight: 800 !important;
  //                         margin: 20px 0 5px !important;
  //                       }
  //                       h4 {
  //                         font-weight: 800 !important;
  //                         margin: 20px 0 5px !important;
  //                       }
  //                       h1 {
  //                         font-size: 22px !important;
  //                       }
  //                       h2 {
  //                         font-size: 18px !important;
  //                       }
  //                       h3 {
  //                         font-size: 16px !important;
  //                       }
  //                       .container {
  //                         padding: 0 !important;
  //                         width: 100% !important;
  //                       }
  //                       .content {
  //                         padding: 0 !important;
  //                       }
  //                       .content-wrap {
  //                         padding: 10px !important;
  //                       }
  //                       .invoice {
  //                         width: 100% !important;
  //                       }
  //                     }
  //                   </style>
  //                 </head>
  //
  //                 <body itemscope itemtype="http://schema.org/EmailMessage" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; width: 100% !important; height: 100%; line-height: 1.6em; background-color: #f6f6f6; margin: 0;"
  //                   bgcolor="#f6f6f6">
  //
  //                   <table class="body-wrap" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; width: 100%; background-color: #f6f6f6; margin: 0;" bgcolor="#f6f6f6">
  //                     <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                       <td style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0;" valign="top"></td>
  //                       <td class="container" width="600" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; display: block !important; max-width: 600px !important; clear: both !important; margin: 0 auto;"
  //                         valign="top">
  //                         <div class="content" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; max-width: 600px; display: block; margin: 0 auto; padding: 20px;">
  //                           <table class="main" width="100%" cellpadding="0" cellspacing="0" itemprop="action" itemscope itemtype="http://schema.org/ConfirmAction" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; border-radius: 3px; background-color: #fff; margin: 0; border: 1px solid #e9e9e9;"
  //                             bgcolor="#fff">
  //                             <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                               <td class="content-wrap" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 20px;" valign="top">
  //                                 <meta itemprop="name" content="Confirm Email" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;" />
  //                                 <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                   <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                     <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
  //
  //                                     </td>
  //                                   </tr>
  //                                   <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                     <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
  //                                       Dear user,
  //                                     </td>
  //                                   </tr>
  //                                   <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                     <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
  //                                       Thank you for signing up with us. Please follow this link to verify your Email.
  //                                     </td>
  //                                   </tr>
  //                                   <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                     <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
  //                                       Verify Email address
  //                                     </td>
  //                                   </tr>
  //
  //
  //                                   <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                     <td class="content-block" itemprop="handler" itemscope itemtype="http://schema.org/HttpActionHandler" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;"
  //                                       valign="top">
  //                                       <a href=${verificationURL} class="btn-primary" itemprop="url" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; color: #FFF; text-decoration: none; line-height: 2em; font-weight: bold; text-align: center; cursor: pointer; display: inline-block; border-radius: 5px; text-transform: capitalize; background-color: #348eda; margin: 0; border-color: #348eda; border-style: solid; border-width: 10px 20px;">Confirm email address</a>
  //                                     </td>
  //                                   </tr>
  //                                   <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                     <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
  //                                       Kind Regards,
  //                                     </td>
  //                                   </tr>
  //                                   <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                     <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
  //                                       The Visionex Team
  //
  //                                     </td>
  //                                   </tr>
  //
  //                                 </table>
  //                               </td>
  //                             </tr>
  //                           </table>
  //                           <div class="footer" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; width: 100%; clear: both; color: #999; margin: 0; padding: 20px;">
  //                             <table width="100%" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                               <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
  //                                 <td class="aligncenter content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; vertical-align: top; color: #999; text-align: center; margin: 0; padding: 0 0 20px;" align="center"
  //                                   valign="top">Follow <a href="http://twitter.com/visionex" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; color: #999; text-decoration: underline; margin: 0;">@Visionex</a> on Twitter.</td>
  //                                   valign="top">Follow <a href="http://twitter.com/visionex" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; color: #999; text-decoration: underline; margin: 0;">@visionex</a> on Twitter.</td>
  //                               </tr>
  //                             </table>
  //                           </div>
  //                         </div>
  //                       </td>
  //                       <td style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0;" valign="top"></td>
  //                     </tr>
  //                   </table>
  //                 </body>
  //
  //                 </html>`
  //             };
  //             transporter.sendMail(mailOptions, function(error, info) {
  //               if (error) {
  //                 console.log(error);
  //               } else {
  //                 console.log('Email sent: ' + info.response);
  //                 return res.json(200, {
  //                   "message": "We sent link on your email address please verify link!!!",
  //                   "userMailId": useremailaddress,
  //                   statusCode: 200
  //                 });
  //               }
  //             });
  //           });
  //         });
  //
  //       });
  //     }
  //   });
  // },
  verifyEmailAddress: function(req, res, next) {
    console.log("Enter into verifyEmailAddress");
    var userMailId = req.param('email');
    var otp = req.param('otp');
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
      if (user.verifyEmail) {
        //var  mess = {message: 'Email already verified'};

        return res.redirect('https://www.visionex.io/login.php?message=Email already verified');
        //return res.json({

        //  "message": "Email already verified !!",
        //statusCode: 401
        //});
      }
      User.compareEmailVerificationOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "OTP is incorrect!!",
            statusCode: 401
          });
        } else {
          console.log("OTP is verified successfully");
          User.update({
              email: userMailId
            }, {
              verifyEmail: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update password!",
                  statusCode: 401
                });
              }
              console.log("Update password successfully!!!");
              var mailOptions = {
                from: sails.config.common.supportEmailId,
                to: userMailId,
                subject: 'Email verified successfully !!!',
                html: `
                  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                  <html xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                  <head>
                    <meta name="viewport" content="width=device-width" />
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                    <title>Welcome mail</title>


                    <style type="text/css">
                      img {
                        max-width: 100%;
                      }

                      body {
                        -webkit-font-smoothing: antialiased;
                        -webkit-text-size-adjust: none;
                        width: 100% !important;
                        height: 100%;
                        line-height: 1.6em;
                      }

                      body {
                        background-color: #f6f6f6;
                      }

                      @media only screen and (max-width: 640px) {
                        body {
                          padding: 0 !important;
                        }
                        h1 {
                          font-weight: 800 !important;
                          margin: 20px 0 5px !important;
                        }
                        h2 {
                          font-weight: 800 !important;
                          margin: 20px 0 5px !important;
                        }
                        h3 {
                          font-weight: 800 !important;
                          margin: 20px 0 5px !important;
                        }
                        h4 {
                          font-weight: 800 !important;
                          margin: 20px 0 5px !important;
                        }
                        h1 {
                          font-size: 22px !important;
                        }
                        h2 {
                          font-size: 18px !important;
                        }
                        h3 {
                          font-size: 16px !important;
                        }
                        .container {
                          padding: 0 !important;
                          width: 100% !important;
                        }
                        .content {
                          padding: 0 !important;
                        }
                        .content-wrap {
                          padding: 10px !important;
                        }
                        .invoice {
                          width: 100% !important;
                        }
                      }
                    </style>
                  </head>

                  <body itemscope itemtype="http://schema.org/EmailMessage" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; width: 100% !important; height: 100%; line-height: 1.6em; background-color: #f6f6f6; margin: 0;"
                    bgcolor="#f6f6f6">

                    <table class="body-wrap" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; width: 100%; background-color: #f6f6f6; margin: 0;" bgcolor="#f6f6f6">
                      <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                        <td style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0;" valign="top"></td>
                        <td class="container" width="600" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; display: block !important; max-width: 600px !important; clear: both !important; margin: 0 auto;"
                          valign="top">
                          <div class="content" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; max-width: 600px; display: block; margin: 0 auto; padding: 20px;">
                            <table class="main" width="100%" cellpadding="0" cellspacing="0" itemprop="action" itemscope itemtype="http://schema.org/ConfirmAction" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; border-radius: 3px; background-color: #fff; margin: 0; border: 1px solid #e9e9e9;"
                              bgcolor="#fff">
                              <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                <td class="content-wrap" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 20px;" valign="top">
                                  <meta itemprop="name" content="Confirm Email" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;" />
                                  <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">

                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                        Dear user,
                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                      Your Email has been verified successfully
                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                        Thanks & Regards,
                                      </td>
                                    </tr>
                                    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                      <td class="content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0; padding: 0 0 20px;" valign="top">
                                        The Visionex Team

                                      </td>
                                    </tr>

                                  </table>
                                </td>
                              </tr>
                            </table>
                            <div class="footer" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; width: 100%; clear: both; color: #999; margin: 0; padding: 20px;">
                              <table width="100%" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
                                  <td class="aligncenter content-block" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; vertical-align: top; color: #999; text-align: center; margin: 0; padding: 0 0 20px;" align="center"
                                    valign="top">Follow <a href="http://twitter.com/visionex" style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 12px; color: #999; text-decoration: underline; margin: 0;">@Visionex</a> on Twitter.</td>

                                </tr>
                              </table>
                            </div>
                          </div>
                        </td>
                        <td style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; vertical-align: top; margin: 0;" valign="top"></td>
                      </tr>
                    </table>
                  </body>

                  </html>`
              };

              transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);

                }
              });
              return res.redirect('https://www.visionex.io/login.php?message=Email verified successfully');
              // res.json(200, {
              //   "message": "Email verified successfully",
              //   "userMailId": userMailId,
              //   statusCode: 200
              // });
            });
        }
      });
    });
  },
  sentOtpToEmailForgotPassword: function(req, res, next) {

    console.log("Enter into sentOtpToEmailForgotPassword");
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
    }).exec(function(err, user) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!user) {
        return res.json({
          "message": "This email not exist!",
          statusCode: 401
        });
      }

      var newCreatedPassword = Math.floor(100000 + Math.random() * 900000);
      console.log("newCreatedPassword :: " + newCreatedPassword);
      var mailOptions = {
        from: sails.config.common.supportEmailId,
        to: userMailId,
        subject: 'Please reset your password',
        html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
          <html xmlns="http://www.w3.org/1999/xhtml" xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
              <title>Set up a new password for [Product Name]</title>


            </head>
            <body style="-webkit-text-size-adjust: none; box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; height: 100%; line-height: 1.4; margin: 0; width: 100% !important;" bgcolor="#F2F4F6"><style type="text/css">
          body {
          width: 100% !important; height: 100%; margin: 0; line-height: 1.4; background-color: #F2F4F6; color: #74787E; -webkit-text-size-adjust: none;
          }
          @media only screen and (max-width: 600px) {
            .email-body_inner {
              width: 100% !important;
            }
            .email-footer {
              width: 100% !important;
            }
          }
          @media only screen and (max-width: 500px) {
            .button {
              width: 100% !important;
            }
          }
          </style>
              <span class="preheader" style="box-sizing: border-box; display: none !important; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; mso-hide: all; opacity: 0; overflow: hidden; visibility: hidden;">Use this link to reset your password. The link is only valid for 24 hours.</span>
              <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%;" bgcolor="#F2F4F6">
                <tr>
                  <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">
                    <table class="email-content" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%;">


                      <tr>
                        <td class="email-body" width="100%" cellpadding="0" cellspacing="0" style="-premailer-cellpadding: 0; -premailer-cellspacing: 0; border-bottom-color: #EDEFF2; border-bottom-style: solid; border-bottom-width: 1px; border-top-color: #EDEFF2; border-top-style: solid; border-top-width: 1px; box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%; word-break: break-word;" bgcolor="#FFFFFF">
                          <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0 auto; padding: 0; width: 570px;" bgcolor="#FFFFFF">

                            <tr>
                              <td class="content-cell" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; padding: 35px; word-break: break-word;">
                                <h1 style="box-sizing: border-box; color: #2F3133; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 19px; font-weight: bold; margin-top: 0;" align="left">Hi,</h1>
                                <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;" align="left">You recently requested to forgot your password for your Visionex account. Use the OTP below to reset it. <strong style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;"></strong></p>
                                <table class="body-action" align="center" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 30px auto; padding: 0; text-align: center; width: 100%;">
                                  <tr>
                                    <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">

                                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
                                        <tr>
                                          <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">
                                             <h5 style="box-sizing: border-box; color: #2F3133; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 15px; font-weight: bold; margin-top: 0;" align="left">${newCreatedPassword}</h5>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                                <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;" align="left">Thanks,
                                <br />The Visionex Team</p>

                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>`
      };
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log(newCreatedPassword + 'Email sent: ' + info.response);
          //res.json(200,"Message Send Succesfully");
          console.log("createing encryptedPassword ....");
          bcrypt.hash(newCreatedPassword.toString(), 10, function(err, hash) {
            if (err) return next(err);
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedForgotPasswordOTP: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.serverError(err);
                }
                console.log("OTP forgot update successfully!!!");
                return res.json({
                  "message": "Otp sent to  user Email ",
                  "userMailId": userMailId,
                  statusCode: 200
                });
              });
          });
        }
      });
    });
  },
  verifyOtpToEmailForgotPassord: function(req, res, next) {

    console.log("Enter into verifyOtpToEmailForgotPassord");
    var userMailId = req.body.userMailId;
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
      User.compareForgotpasswordOTP(otp, user, function(err, valid) {
        if (err) {
          console.log("Error to compare otp");
          return res.json({
            "message": "Error to compare otp",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct otp!",
            statusCode: 401
          });
        } else {
          console.log("OTP is verified successfully");
          res.json(200, {
            "message": "OTP  verified successfully",
            "userMailId": userMailId,
            statusCode: 200
          });
        }
      });
    });
  },
  updateForgotPassordAfterVerify: function(req, res, next) {
    console.log("Enter into updateForgotPassordAfterVerify");
    var userMailId = req.body.userMailId;
    var newPassword = req.body.newPassword;
    var confirmNewPassword = req.body.confirmNewPassword;
    if (!userMailId || !newPassword || !confirmNewPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    if (newPassword != confirmNewPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "NewPassword and Confirm NewPassword not match",
        statusCode: 401
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
      bcrypt.hash(confirmNewPassword, 10, function(err, hash) {
        if (err) res.json({
          "message": "Errot to bcrypt password",
          statusCode: 401
        });
        var newEncryptedPass = hash;
        User.update({
            email: userMailId
          }, {
            encryptedPassword: newEncryptedPass
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update password!",
                statusCode: 401
              });
            }
            console.log("Update password successfully!!!");
            return res.json({
              "message": "Your password has been updated successfully",
              statusCode: 200
            });
          });
      });
    });
  },
  updateCurrentPassword: function(req, res, next) {
    console.log("Enter into updateCurrentPassword");
    var userMailId = req.body.userMailId;
    var currentPassword = req.body.currentPassword;
    var newPassword = req.body.newPassword;
    var confirmNewPassword = req.body.confirmNewPassword;
    if (!userMailId || !currentPassword || !newPassword || !confirmNewPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    if (currentPassword == newPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Current password cannot be same as newPassword",
        statusCode: 401
      });
    }
    if (newPassword != confirmNewPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Newpassword and confirm newPassword  not matched",
        statusCode: 401
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
      User.comparePassword(currentPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct currentPassword",
            statusCode: 401
          });
        } else {
          bcrypt.hash(confirmNewPassword, 10, function(err, hash) {
            if (err) res.json({
              "message": "Errot to bcrypt password",
              statusCode: 401
            });
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedPassword: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update password!",
                    statusCode: 401
                  });
                }
                console.log("Your password updated successfully!!!");
                return res.json({
                  "message": "Your password has been updated successfully",
                  statusCode: 200
                });
              });
          });
        }
      });

    });
  },
  updateCurrentSpendingPassword: function(req, res, next) {
    console.log("Enter into updateCurrenttransactionPassword");
    var userMailId = req.body.userMailId;
    var currentSpendingPassword = req.body.currentSpendingPassword;
    var newSpendingPassword = req.body.newSpendingPassword;
    var confirmNewSpendingPassword = req.body.confirmNewPassword;
    if (!userMailId || !currentSpendingPassword || !newSpendingPassword || !confirmNewSpendingPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    if (currentSpendingPassword == newSpendingPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Current transaction password cannot be same as new transaction password",
        statusCode: 401
      });
    }
    if (newSpendingPassword != confirmNewSpendingPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "New transaction password and confirm new transaction password are not match",
        statusCode: 401
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
      User.compareSpendingpassword(currentSpendingPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct currenttransactionPassword",
            statusCode: 401
          });
        } else {
          bcrypt.hash(confirmNewSpendingPassword, 10, function(err, hash) {
            if (err) res.json({
              "message": "Errot to bcrypt password",
              statusCode: 401
            });
            var newEncryptedPass = hash;
            User.update({
                email: userMailId
              }, {
                encryptedSpendingpassword: newEncryptedPass
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update password!",
                    statusCode: 401
                  });
                }
                console.log("Your password updated successfully!!!");
                return res.json({
                  "message": "Your transaction password has been  updated successfully",
                  statusCode: 200
                });
              });
          });
        }
      });

    });
  },
  sentOtpToUpdateSpendingPassword: function(req, res, next) {
    console.log("Enter into sentOtpToUpdatetransactionPassword");
    var userMailId = req.body.userMailId;
    var currentPassword = req.body.currentPassword;
    if (!userMailId || !currentPassword) {
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
      User.comparePassword(currentPassword, user, function(err, valid) {
        if (err) {
          console.log("Error to compare password");
          return res.json({
            "message": "Error to compare password",
            statusCode: 401
          });
        }
        if (!valid) {
          return res.json({
            "message": "Please enter correct Password",
            statusCode: 401
          });
        } else {

          var newCreatedPassword = Math.floor(100000 + Math.random() * 900000);
          console.log("newCreatedPassword :: " + newCreatedPassword);
          var mailOptions = {
            from: sails.config.common.supportEmailId,
            to: userMailId,
            subject: 'Please reset your transaction password',
            text: 'We heard that you lost your BccPay transaction password. Sorry about that! ' +
              '\n But don’t worry! You can use this otp reset your password ' + newCreatedPassword
          };
          transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log(newCreatedPassword + 'Email sent: ' + info.response);
              //res.json(200,"Message Send Succesfully");
              console.log("createing encryptedPassword ....");
              bcrypt.hash(newCreatedPassword.toString(), 10, function(err, hash) {
                if (err) return next(err);
                var newEncryptedPass = hash;
                User.update({
                    email: userMailId
                  }, {
                    encryptedForgotSpendingPasswordOTP: newEncryptedPass
                  })
                  .exec(function(err, updatedUser) {
                    if (err) {
                      return res.serverError(err);
                    }
                    console.log("OTP forgot update successfully!!!");
                    return res.json({
                      "message": "Otp sent on user Email ",
                      "userMailId": userMailId,
                      statusCode: 200
                    });
                  });
              });
            }
          });
        }
      });

    });
  },
  verifyOtpToEmailForgotSpendingPassord: function(req, res, next) {
    console.log("Enter into verifyOtpToEmailForgottransactionPassord ");
    var userMailId = req.body.userMailId;
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
      User.compareEmailVerificationOTPForSpendingPassword(otp, user, function(err, valid) {
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
          res.json(200, {
            "message": "OTP for transaction password is verified successfully",
            "userMailId": userMailId,
            statusCode: 200
          });
        }
      });
    });
  },
  updateForgotSpendingPassordAfterVerify: function(req, res, next) {
    console.log("Enter into updateForgottransactionPassordAfterVerify");
    var userMailId = req.body.userMailId;
    var newSpendingPassword = req.body.newSpendingPassword;
    var confirmSpendingPassword = req.body.confirmSpendingPassword;
    if (!userMailId || !newSpendingPassword || !confirmSpendingPassword) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    if (newSpendingPassword != confirmSpendingPassword) {
      console.log("NewPassword and Confirm NewPassword not match");
      return res.json({
        "message": "New transaction Password and Confirm Newtransaction Password not matched",
        statusCode: 401
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
      bcrypt.hash(newSpendingPassword, 10, function(err, hash) {
        if (err) res.json({
          "message": "Error to bcrypt password",
          statusCode: 401
        });
        var newEncryptedPass = hash;
        User.update({
            email: userMailId
          }, {
            encryptedSpendingpassword: newEncryptedPass
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update password!",
                statusCode: 401
              });
            }
            console.log("Update password successfully!!!");
            return res.json({
              "message": "Your transaction password has been updated successfully",
              statusCode: 200
            });
          });
      });
    });
  },
  updateUserVerifyEmail: function(req, res, next) {
    console.log("Enter into updateUserVerifyEmail");
    var userMailId = req.body.userMailId;
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
      User.compareEmailVerificationOTP(otp, user, function(err, valid) {
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
          User.update({
              email: userMailId
            }, {
              verifyEmail: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update password!",
                  statusCode: 401
                });
              }
              console.log("Update current transactionPassword successfully!!!");

              User.findOne({
                email: userMailId
              }).exec(function(err, userDetailsReturn) {
                if (err) {
                  return res.json({
                    "message": "Error to find user",
                    statusCode: 401
                  });
                }
                if (!userDetailsReturn) {
                  return res.json({
                    "message": "Invalid email!",
                    statusCode: 401
                  });
                }
                return res.json(200, {
                  user: userDetailsReturn,
                  statusCode: 200
                });
              });
            });
        }
      });
    });
  },
  getAllDetailsOfUser: function(req, res, next) {
    console.log("Enter into getAllDetailsOfUser");
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
            "message": "Invalid email!",
            statusCode: 401
          });
        } else {
          return res.json({
            user: user,
            statusCode: 200
          });
        }

      });
  },
  enableTFA: function(req, res, next) {
    console.log("Enter into enableTFA");
    var userMailId = req.body.userMailId;

    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
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
      User.update({
          email: userMailId
        }, {
          tfastatus: true
        })
        .exec(function(err, updatedUser) {
          if (err) {
            return res.json({
              "message": "Error to update password!",
              statusCode: 401
            });
          }
          console.log("TFA and googlesecreatekey updated successfully!!!");
          User.findOne({
              email: userMailId
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
                  "message": "Invalid email!",
                  statusCode: 401
                });
              } else {
                return res.json({
                  user: user,
                  statusCode: 200
                });
              }
            });
        });
    });
  },
  disableTFA: function(req, res, next) {
    console.log("Enter into disableTFA");
    var userMailId = req.body.userMailId;
    if (!userMailId) {
      console.log("Can't be empty!!! by user.....");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
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
      User.update({
          email: userMailId
        }, {
          tfastatus: false
        })
        .exec(function(err, updatedUser) {
          if (err) {
            return res.json({
              "message": "Error to update password!",
              statusCode: 401
            });
          }
          console.log("TFA disabled successfully!!!");
          User.findOne({
              email: userMailId
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
                  "message": "Invalid email!",
                  statusCode: 401
                });
              } else {
                return res.json({
                  user: user,
                  statusCode: 200
                });
              }
            });
        });
    });
  },

  sentOtpToResetSpendingPassword: function(req, res, next) {
  console.log("Enter into sentOtpToResetSpendingPassword");
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
  }).exec(function(err, user) {
    if (err) {
      return res.json({
        "message": "Error to find user",
        statusCode: 401
      });
    }
    if (!user) {
      return res.json({
        "message": "This email not exist!",
        statusCode: 401
      });
    }

    var newCreatedSpendingPassword = Math.floor(100000 + Math.random() * 900000);
    console.log("newCreatedSpendingPassword :: " + newCreatedSpendingPassword);
    var mailOptions = {
      from: sails.config.common.supportEmailId,
      to: userMailId,
      subject: 'Please reset your Spending Password',
      html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
            <title>Set up a new password for [Product Name]</title>


          </head>
          <body style="-webkit-text-size-adjust: none; box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; height: 100%; line-height: 1.4; margin: 0; width: 100% !important;" bgcolor="#F2F4F6"><style type="text/css">
        body {
        width: 100% !important; height: 100%; margin: 0; line-height: 1.4; background-color: #F2F4F6; color: #74787E; -webkit-text-size-adjust: none;
        }
        @media only screen and (max-width: 600px) {
          .email-body_inner {
            width: 100% !important;
          }
          .email-footer {
            width: 100% !important;
          }
        }
        @media only screen and (max-width: 500px) {
          .button {
            width: 100% !important;
          }
        }
        </style>
            <span class="preheader" style="box-sizing: border-box; display: none !important; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; mso-hide: all; opacity: 0; overflow: hidden; visibility: hidden;">Use this link to reset your password. The link is only valid for 24 hours.</span>
            <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%;" bgcolor="#F2F4F6">
              <tr>
                <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">
                  <table class="email-content" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%;">


                    <tr>
                      <td class="email-body" width="100%" cellpadding="0" cellspacing="0" style="-premailer-cellpadding: 0; -premailer-cellspacing: 0; border-bottom-color: #EDEFF2; border-bottom-style: solid; border-bottom-width: 1px; border-top-color: #EDEFF2; border-top-style: solid; border-top-width: 1px; box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0; padding: 0; width: 100%; word-break: break-word;" bgcolor="#FFFFFF">
                        <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 0 auto; padding: 0; width: 570px;" bgcolor="#FFFFFF">

                          <tr>
                            <td class="content-cell" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; padding: 35px; word-break: break-word;">
                              <h1 style="box-sizing: border-box; color: #2F3133; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 19px; font-weight: bold; margin-top: 0;" align="left">Hi,</h1>
                              <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;" align="left">You recently requested to forgot your password for your Visionex account. Use the OTP below to reset it. <strong style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;"></strong></p>
                              <table class="body-action" align="center" width="100%" cellpadding="0" cellspacing="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; margin: 30px auto; padding: 0; text-align: center; width: 100%;">
                                <tr>
                                  <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">

                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
                                      <tr>
                                        <td align="center" style="box-sizing: border-box; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; word-break: break-word;">
                                           <h5 style="box-sizing: border-box; color: #2F3133; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 15px; font-weight: bold; margin-top: 0;" align="left">${newCreatedSpendingPassword}</h5>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                              <p style="box-sizing: border-box; color: #74787E; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5em; margin-top: 0;" align="left">Thanks,
                              <br />The Visionex Team</p>

                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>`
    };
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log(newCreatedSpendingPassword + 'Email sent: ' + info.response);
        //res.json(200,"Message Send Succesfully");
        console.log("createing encryptedPassword ....");
        bcrypt.hash(newCreatedSpendingPassword.toString(), 10, function(err, hash) {
          if (err) return next(err);
          var newEncryptedPass = hash;
          User.update({
              email: userMailId
            }, {
              encryptedResetSpendingpassword: newEncryptedPass
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.serverError(err);
              }
              console.log("OTP forgot update successfully!!!");
              return res.json({
                "message": "Otp sent to  user Email ",
                "userMailId": userMailId,
                statusCode: 200
              });
            });
        });
      }
    });
  });
},
verifyOtpToEmailResetSpendingPassord: function(req, res, next) {

  console.log("Enter into verifyOtpToEmailResetSpendingPassord");
  var userMailId = req.body.userMailId;
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
    User.compareResetSpendingpassword(otp, user, function(err, valid) {
      if (err) {
        console.log("Error to compare otp");
        return res.json({
          "message": "Error to compare otp",
          statusCode: 401
        });
      }
      if (!valid) {
        return res.json({
          "message": "Please enter correct otp!",
          statusCode: 401
        });
      } else {
        console.log("OTP is verified successfully");
        res.json(200, {
          "message": "OTP  verified successfully",
          "userMailId": userMailId,
          statusCode: 200
        });
      }
    });
  });
},
updateResetSpendingPassword: function(req, res, next) {
  console.log("Enter into updateResetSpendingPassword");
  var userMailId = req.body.userMailId;
  var newSpendingPassword = req.body.newSpendingPassword;
  var confirmNewSpendingPassword = req.body.confirmNewPassword;
  if (!userMailId || !confirmNewSpendingPassword || !newSpendingPassword) {
    console.log("Can't be empty!!! by user.....");
    return res.json({
      "message": "Can't be empty!!!",
      statusCode: 401
    });
  }
  if (newSpendingPassword != confirmNewSpendingPassword) {
    console.log("Can't be empty!!! by user.....");
    return res.json({
      "message": "New transaction password and confirm new transaction password are not match",
      statusCode: 401
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

        bcrypt.hash(confirmNewSpendingPassword, 10, function(err, hash) {
          if (err) res.json({
            "message": "Errot to bcrypt password",
            statusCode: 401
          });
          var newEncryptedPass = hash;
          User.update({
              email: userMailId
            }, {
              encryptedResetSpendingpassword: newEncryptedPass
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update password!",
                  statusCode: 401
                });
              }
              console.log("Your password updated successfully!!!");
              return res.json({
                "message": "Your transaction password has been  updated successfully",
                statusCode: 200
              });
            });
        });

  });
}
};
