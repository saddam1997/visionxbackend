/**
 * AdminController
 *
 * @description :: Server-side logic for managing admins
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  getAllUsers: function(req, res, next) {
    console.log("Enter into getAllDetailsOfUser");

    User.find()
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
            users: user,
            statusCode: 200
          });
        }
      });
  },
  disableUser: function(req, res, next) {
    console.log("Enter into disableUser " + req.body.userMailId);
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
        console.log(JSON.stringify(user));
        console.log(user.email);
        if (user.isUserDisable) {
          return res.json({
            "message": "User already disabled!",
            statusCode: 401
          });
        } else {
          User.update({
              email: userMailId
            }, {
              isUserDisable: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update isUserDisable!",
                  statusCode: 401
                });
              }
              return res.json({
                "message": "User disabled successfully!",
                statusCode: 200
              });
            });

        }
      });
  },
  enableUser: function(req, res, next) {
    console.log("Enter into enableUser");
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
          console.log(JSON.stringify(user.isUserDisable));
          if (!user.isUserDisable) {
            return res.json({
              "message": "User already enabled!",
              statusCode: 401
            });
          } else {
            User.update({
                email: userMailId
              }, {
                isUserDisable: false
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update enabled User!",
                    statusCode: 401
                  });
                }
                return res.json({
                  "message": "User enabled successfully!",
                  statusCode: 200
                });
              });
          }
        }
      });
  },
  freezUser: function(req, res, next) {
    console.log("Enter into freezUser " + req.body.userMailId);
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
        console.log(JSON.stringify(user));
        if (user.isUserFreezed) {
          return res.json({
            "message": "User already Freezed!",
            statusCode: 401
          });
        } else {
          User.update({
              email: userMailId
            }, {
              isUserFreezed: true
            })
            .exec(function(err, updatedUser) {
              if (err) {
                return res.json({
                  "message": "Error to update isUserDisable!",
                  statusCode: 401
                });
              }
              return res.json({
                "message": "User disabled successfully!",
                statusCode: 200
              });
            });

        }
      });
  },
  unfreezUser: function(req, res, next) {
    console.log("Enter into unfreezUser");
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
          console.log(JSON.stringify(user.isUserDisable));
          if (!user.isUserFreezed) {
            return res.json({
              "message": "User already enabled!",
              statusCode: 401
            });
          } else {
            User.update({
                email: userMailId
              }, {
                isUserFreezed: false
              })
              .exec(function(err, updatedUser) {
                if (err) {
                  return res.json({
                    "message": "Error to update enabled User!",
                    statusCode: 401
                  });
                }
                return res.json({
                  "message": "User enabled successfully!",
                  statusCode: 200
                });
              });
          }
        }
      });
  },
  adminLogin: function(req, res) {
    console.log('enter username and password ');
    var useremail = req.param('email');
    var password = req.param('password');
    if (!useremail || !password) {
      console.log("email and password required");
      return res.json({
        "message": "Can't be empty!!!",
        statusCode: 401
      });
    }
    Admin.findOne({
      email: useremail,
      status: 1
    }).exec(function(err, admin) {
      if (err) {
        return res.json({
          "message": "Error to find user",
          statusCode: 401
        });
      }
      if (!admin) {
        return res.json({
          "message": "Invalid email!",
          statusCode: 401
        });
      }
      console.log("Compare passs");
      Admin.comparePassword(password, admin, function(err, valid) {
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
          console.log("User is valid return user details !!!");

          console.log("Return user detailsss");
          res.json({
            admin: admin,
            statusCode: 200,
            token: jwToken.issue({
              id: admin.id
            })
          });
        }
      })
    })
  },







  getCurrenciesDetails: function(req, res, next) {
    console.log("Enter into getCurrenciesDetails");
    const queryToSumAllCurrency = 'SELECT ' +
      'SUM(BTCbalance) as BTCbalance,' +
      'SUM(FreezedBTCbalance) as FreezedBTCbalance  ,' +
      'SUM(BCHbalance) as BCHbalance  ,' +
      'SUM(FreezedBCHbalance) asFreezedBCHbalance,' +
      'SUM(LTCbalance) as LTCbalance,' +
      'SUM(FreezedLTCbalance) asFreezedLTCbalance,' +
      'SUM(VCNbalance) as VCNbalance  ,' +
      'SUM(FreezedVCNbalance) as FreezedVCNbalance ' +
      ' FROM user';
    User.query(queryToSumAllCurrency, function(err, rawResult) {
      if (err) {
        return res.json({
          "message": "Eror to find users!",
          statusCode: 400
        });
      }
      return res.json({
        user: rawResult,
        statusCode: 200
      });

    });
  },
};