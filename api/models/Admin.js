
/**
 * Admin.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

var bcrypt = require('bcrypt');
module.exports={
 schema:true,
 attributes:{
   email: {
     type: 'email',
     email: true,
     required: true,
     unique: true
   },
   encryptedPassword: {
     type: 'string'
   },
   plainPassword: {
     type: 'string'
   },
   status: {
     type:'integer'
   },
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
 comparePassword: function(password, admin, cb = () => {}) {
   bcrypt.compare(password, admin.encryptedPassword, function(err, match) {
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
