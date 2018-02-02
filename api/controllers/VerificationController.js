/**
 * VerificationController
 *
 * @description :: Server-side logic for managing verifications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

//External Dependencies.........taxProofImageName
var filesholderpath = sails.config.common.imgegeContainer;
var statusCodeOne = 1;
module.exports = {
  uploadTaxProofImageImage: function(req, res) {
    console.log("Enter into uploadTaxProofImageImage :: " + filesholderpath);
    var userId = req.param('userId');
    var taxProofImageName = req.file('taxProofImageName');

    if (!userId || !taxProofImageName) {
      console.log("Invalid Paranter ");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
        id: userId
      })
      .exec(function(err, userInfoInDB) {
        if (err) {
          console.log("Error to find user");
          return res.json({
            "message": "Error to find user",
            statusCode: 400
          });
        }
        if (!userInfoInDB) {
          console.log("Invalid userId!");
          return res.json({
            "message": "Invalid userId!",
            statusCode: 400
          });
        } else {
          console.log("userAll Details :: " + JSON.stringify(userInfoInDB));
          console.log("taxProofImageName ::: " + taxProofImageName);
          var uploadFileFolderPath = filesholderpath + userInfoInDB.id + "/";
          taxProofImageName.upload({
            dirname: uploadFileFolderPath
          }, function onUploadComplete(err, uploadedfiles) {
            if (err) {
              return res.json({
                'message': 'Error to upload file',
                statusCode: 400
              });
            }
            if (uploadedfiles.length == 0) {
              return res.json({
                'message': 'Please upload taxProofImageName',
                statusCode: 400
              });
            } else {

              console.log('Total files'+uploadedfiles.length);
              var fileNameSaveInDB = '';
              for(var i=0;i<uploadedfiles.length;i++){
                fileNameSaveInDB = fileNameSaveInDB.concat(','+(uploadedfiles[i].fd));
              }
              // var fileUploadedDetails = uploadedfiles[0];
              // console.log("fileUploadedDetails :: " + JSON.stringify(fileUploadedDetails.fd));
              // var fileNameSaveInDB = fileUploadedDetails.fd;
              // var fileTypeSaveInDB = fileUploadedDetails.type;
              // fileNameSaveInDB = fileNameSaveInDB.replace(uploadFileFolderPath, "");
              console.log("fileNameSaveInDB ::: " + fileNameSaveInDB);
              User.update({
                  id: userId
                }, {
                  taxProofImageName: fileNameSaveInDB
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    return res.json({
                      "message": "Error to update passoword!",
                      statusCode: 401
                    });
                  }
                  console.log("Your TaxProof uploaded successfully!");
                  return res.json({
                    "message": "Your TaxProof uploaded successfully",
                    statusCode: 200
                  });
                });
            }
          });
        }
      });
  },
  uploadAddressProofImage: function(req, res) {
    console.log("Enter into uploadAddressProofImage :: " + filesholderpath);
    var userId = req.param('userId');
    var addressProofImage = req.file('addressProofImage');

    if (!userId || !addressProofImage) {
      console.log("Invalid Paranter ");
      return res.json({
        "message": "Invalid Parameter",
        statusCode: 400
      });
    }
    User.findOne({
        id: userId
      })
      .exec(function(err, userInfoInDB) {
        if (err) {
          console.log("Error to find user");
          return res.json({
            "message": "Error to find user",
            statusCode: 400
          });
        }
        if (!userInfoInDB) {
          console.log("Invalid userId!");
          return res.json({
            "message": "Invalid userId!",
            statusCode: 400
          });
        } else {
          console.log("userAll Details :: " + JSON.stringify(userInfoInDB));
          console.log("addressProofImage ::: " + addressProofImage);
          var uploadFileFolderPath = filesholderpath + userInfoInDB.id + "/";
          addressProofImage.upload({
            dirname: uploadFileFolderPath
          }, function onUploadComplete(err, uploadedfiles) {
            if (err) {
              return res.json({
                'message': 'Error to upload file',
                statusCode: 400
              });
            }
            if (uploadedfiles.length == 0) {
              return res.json({
                'message': 'Please upload addressProof',
                statusCode: 400
              });
            } else {

              var fileNameSaveInDB = '';
              for(var i=0;i<uploadedfiles.length;i++){
                fileNameSaveInDB = fileNameSaveInDB.concat((uploadedfiles[i].fd)+",");
              }
              // var fileUploadedDetails = uploadedfiles[0];
              // console.log("fileUploadedDetails :: " + JSON.stringify(fileUploadedDetails.fd));
              // var fileNameSaveInDB = fileUploadedDetails.fd;
              // var fileTypeSaveInDB = fileUploadedDetails.type;
              // fileNameSaveInDB = fileNameSaveInDB.replace(uploadFileFolderPath, "");
              // console.log("fileNameSaveInDB ::: " + fileNameSaveInDB);
              User.update({
                  id: userId
                }, {
                  addressProofImageName: fileNameSaveInDB
                })
                .exec(function(err, updatedUser) {
                  if (err) {
                    return res.json({
                      "message": "Error to update passoword!",
                      statusCode: 401
                    });
                  }
                  console.log("Update passoword successfully!");
                  return res.json({
                    "message": "Your addressProof uploaded successfully",
                    statusCode: 200
                  });
                });
            }
          });
        }
      });

  },
  addVerificationDetails: function(req, res) {
    console.log("Enter into addVerificationDetails :: " + JSON.stringify(req.body));
    var userId = req.body.userId;
    var firstName = req.body.firstName;
    var middleName = req.body.middleName;
    var lastName = req.body.lastName;
    var DOB = req.body.DOB;
    var addLine1 = req.body.addLine1;
    var addLine2 = req.body.addLine2;
    var city = req.body.city;
    var state = req.body.state;
    var country = req.body.country;
    var pincode = req.body.pincode;
    var mobileNumber = req.body.mobileNumber;
    var bankAccountHolderName = req.body.bankAccountHolderName;
    var bankAccountNumber = req.body.bankAccountNumber;
    var bankName = req.body.bankName;
    var IFSCCode = req.body.IFSCCode;
    var taxProofNumber = req.body.taxProofNumber;
    var addressProofType = req.body.addressProofType;
    var addressProofNumber = req.body.addressProofNumber;
    var userMailId = req.body.userMailId;

    // if (!userId ||
    //   !firstName ||
    //   !middleName ||
    //   !lastName ||
    //   !addLine1 ||
    //   !addLine2 ||
    //   !city ||
    //   !state ||
    //   !country ||
    //   !pincode ||
    //   !mobileNumber ||
    //   !bankAccountHolderName ||
    //   !bankAccountNumber ||
    //   !bankName ||
    //   !IFSCCode ||
    //   !taxProofNumber ||
    //   !addressProofType ||
    //   !addressProofNumber) {
    //   console.log("User Entered invalid parameter ");
    //   return res.json({
    //     "message": "Can't be empty!!!",
    //     statusCode: 400
    //   });
    // }
    User.findOne({
      id: userId
    }).exec(function(err, user) {
      if (err) {
        return res.serverError(err);
      }
      if (!user) {
        return res.json({
          "message": "User not found!!!",
          statusCode: 400
        });
      }
      var saveVerificationData = {
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        addLine1: addLine1,
        addLine2: addLine2,
        city: city,
        state: state,
        DOB : DOB,
        verificationDate : new Date(),
        country: country,
        pincode: pincode,
        mobileNumber: mobileNumber,
        bankAccountHolderName: bankAccountHolderName,
        bankAccountNumber: bankAccountNumber,
        bankName: bankName,
        IFSCCode: IFSCCode,
        taxProofNumber: taxProofNumber,
        addressProofType: addressProofType,
        addressProofNumber: addressProofNumber,
        verificationowner: userId,
      };
      Verification.create(saveVerificationData).exec(function(err, finn) {
        if (err) {
          return res.json({
            "message": "Error Verification Details",
            statusCode: 400
          });
        }
        User.update({
            id: userId
          }, {
            verificationStatus: statusCodeOne,
            isKYC: true
          })
          .exec(function(err, updatedUser) {
            if (err) {
              return res.json({
                "message": "Error to update passoword!",
                statusCode: 401
              });
            }
            console.log("Update verificationStatus successfully!");
            //Mail send for kyc verifications
            var mailOptions = {
              from: sails.config.common.supportEmailId,
              to: userMailId,
              subject: 'Vision KYC Verification. ',
              html: ` <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Congratulations!!! Email</title>
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
         KYC Verification!!!<br>

                  </td>
                </tr>
              </table>

              <table cellspacing="0" cellpadding="0" class="force-full-width">
                <tr>

                  <td width="75%" class="">
                    <table cellspacing="0" cellpadding="0" class="w320 w100p"><br><br><br>
                      <tr>
                        <td class="mobile-center activate-now" style="font-size:17px; text-align:center; padding: 0 75px; color:#6f6f6f;" >

                         Dear ${userMailId},
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
                <table cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="text-align:left; font-size:15px;" class="mobile-center body-padding w320">
                  <br>
          Your KYC verification done successfully, All the information provided by you is stored
                      in our database. Please ignore this message, if you didn't submit your KYC verification and report
                      on support@visionex.io<br><br><br>

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
          4. Ensure you maintain only one account on wallet to enjoy our awesome services.<br>
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
                  <br><b>Regards,</b><br>
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
                console.log(newCreatedSpendingPassword + 'Email sent: ' + info.response);
                return res.json({
                  "message": 'Your application successfully submitted for review!!!',
                  statusCode: 200
                });
              }
            });
          });
      });
    });
  },
  updateKYCformStatusByUserId: function(req, res) {
  console.log("Enter into updateKYCformStatusByUserId :: " + JSON.stringify(req.body));
  var userId = req.body.userId;
  var kycStatus = req.body.status;

  if (!userId || !kycStatus) {
    return res.json({
      "message": "Can't be empty!!!",
      statusCode: 400
    });
  }
  User.findOne({
      id: userId
    })
    .exec(function(err, user) {
      if (err) {
        return res.serverError(err);
      }
      if (!user) {
        return res.json({
          "message": "User not found!!!",
          statusCode: 400
        });
      }
      if(user){

        if(sails.config.common.KYCsuccess ==kycStatus || sails.config.common.KYCrejected ==kycStatus){

          User.update( {id : userId}, { verificationStatus : kycStatus}).exec(function(err, data){
            if(err) res.send({statusCode : 400 , message : 'Server Error'});
            if(data)  {
               res.send({statusCode : 200 , message : 'KYC form status has been chnaged.'});
            }
          })
        }
        else{
          res.send({statusCode : 400 , message : 'KYC form either accept it or reject it'});
        }

      }

    });
},
  getVerificationDetails: function(req, res) {
    console.log("Enter into addVerificationDetails :: " + JSON.stringify(req.body));
    var userId = req.body.userId;
    if (!userId) {
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 400
      });
    }
    User.findOne({
        id: userId
      }).populateAll()
      .exec(function(err, user) {
        if (err) {
          return res.serverError(err);
        }
        if (!user) {
          return res.json({
            "message": "User not found!!!",
            statusCode: 400
          });
        }
        return res.json({
          user: user,
          statusCode: 200
        });

      });
  },
};
