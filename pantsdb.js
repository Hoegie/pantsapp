/*version 1*/
var express    = require('express');
var mysql      = require('mysql');
var bodyParser = require('body-parser');
var apnagent = require('apnagent');
var apn = require('apn');
var gcm = require('node-gcm');
var join = require('path').join;
var http = require('http');
var path = require('path');
var connection = mysql.createConnection({
  //host     : '109.135.3.222',
  host     : '192.168.69.190',
  user     : 'mobileapp',
  password : 'exji-0lj+cNQiX$nsG',
  database : 'pants'
});

var connection2 = mysql.createConnection({
  //host     : '109.135.3.222',
  host     : '192.168.69.190',
  user     : 'mobileapp',
  password : 'exji-0lj+cNQiX$nsG',
  database : 'users'
});


var app = express();

  app.set('port', process.env.PORT || 3000);
  console.log(app.get('port'));
  app.use(bodyParser.urlencoded({ extended: false}));
  app.use(bodyParser.json());


// Set up apn with the APNs Auth Key


  var apnProvider = new apn.Provider({  
      token: {
          key: '/home/sven/mobileapp/certs/apns.p8', // Path to the key p8 file
          keyId: 'AW53VE2WG7', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
          teamId: '857J4HYVDU', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
      },
      production: false // Set to true if sending a notification to a production iOS app
  });  

  var notification = new apn.Notification();

  notification.topic = 'be.degronckel.PantsAlarm';
  notification.expiry = Math.floor(Date.now() / 1000) + 3600;
//notification.badge = 3;
  notification.sound = 'ping.aiff';
  notification.alert = 'New PANTS alarm(s) received !!';

//old IOS apn system
var agent = new apnagent.Agent();

  // configure agent + common settings
  agent 
    .set('pfx file', join(__dirname, 'certs/pfx.p12'))
    .enable('sandbox')
    .set('expires', '1d')
    .set('reconnect delay', '1s')
    .set('cache ttl', '30m');

  // see error mitigation section
  agent.on('message:error', function (err, msg) {
    // ...
  });

  // connect needed to start message processing
  
  agent.connect(function (err) {
    if (err) {
      console.log(err.message)
    } else {
    console.log('development apn agent running');
  };
  });


connection.connect(function(err){
if(!err) {
    console.log("Database is connected ... nn");    
} else {
    console.log("Error connecting database ... nn");    
}
});

/*GCM setup*/

var alarmMessage = new gcm.Message();
alarmMessage.addNotification({
  title: 'PANTS alarm',
  body: 'New PANTS alarm(s) received',
  icon: 'ic_add_alert_white_48dp',
  sound: 'true'
});

var sender = new gcm.Sender('AIzaSyC3fy84BdZ50502zAjYdmPaLX0uaIc4ufg');



/*old IOS push system*/
app.get("/mysql/oldpush",function(req,res){

connection.query('SELECT token FROM apntokens WHERE send = 1 AND device_type = 1', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    res.end(JSON.stringify(rows));
    console.log(rows)
  }else{
    console.log('Error while performing Query.');
  }
  rows.forEach(function(row, i) {
    agent.createMessage()
    .device(row.token)
    .alert("New PANTS alarm(s) received")
    .sound('bingbong.aiff')
    .send();
  });
  });

});

/*Android push system*/
app.get("/mysql/oldandroidpush",function(req,res){
  sender.sendNoRetry(alarmMessage, { topic: '/topics/pants_alarms' }, function(err, response) {
    if(err) console.error(err);
    else {
      console.log(JSON.stringify(response));
      res.end(JSON.stringify(response));
    }
  });
});

/*new Android push system*/

app.get("/mysql/androidpush",function(req,res){
  
  connection.query('SELECT token FROM apntokens WHERE send = 1 AND device_type = 2', function(err, rows, fields) {
  /*connection.end();*/
      if (!err){
        res.end(JSON.stringify(rows));
        console.log(rows)
      }else{
        console.log('Error while performing Query.');
      }
      rows.forEach(function(row, i) {
        sender.sendNoRetry(alarmMessage, { to : row.token }, function(err, response) {
        if(err) console.error(err);
        else {
          console.log(JSON.stringify(response));
        }
      });
    });
  });
});



/*new IOS push system*/
app.get("/mysql/iospush",function(req,res){

  connection.query('SELECT token FROM apntokens WHERE send = 1 AND device_type = 1', function(err, rows, fields) {
/*connection.end();*/
    if (!err){
     res.end(JSON.stringify(rows));
      console.log(rows)
    }else{
      console.log('Error while performing Query.');
    }
      rows.forEach(function(row, i) {
        apnProvider.send(notification, row.token).then(function(result) {  
          // Check the result for any failed devices
          console.log(result);
          console.log(result.failed);
          if (result.failed.length > 0){
              console.log("result failed gehit !")
              var apnProvider = new apn.Provider({  
                                token: {
                                key: 'certs/apns.p8', // Path to the key p8 file
                                keyId: 'AW53VE2WG7', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
                                teamId: '857J4HYVDU', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
                                },
                                production: false // Set to true if sending a notification to a production iOS app
                              });  

              var notification = new apn.Notification();

              notification.topic = 'be.degronckel.PantsAlarm';
              notification.expiry = Math.floor(Date.now() / 1000) + 3600;
              notification.sound = 'ping.aiff';
              notification.alert = 'New PANTS alarm(s) received !!';

              apnProvider.send(notification, row.token).then(function(result) {  
                  // Check the result for any failed devices
                  console.log(result);

                    }); 
          }     

        });
      });
  });
});

app.get("/mysql/testiospush",function(req,res){
 var token = '314ffa146e799db27afb8c56fc085dbfb995608d5d17853e08d93d9e6a8992b5';
 res.end(JSON.stringify(token));
 apnProvider.send(notification, token).then(function(result) {  
          
          console.log("result :");
          console.log(result);
          console.log("result failed :");
          console.log(result.failed);
          if (result.failed.length <= 0){
              console.log("result not failed gehit !!");
          }
          if (result.failed.length > 0){
              console.log("result failed gehit !")
              var apnProvider = new apn.Provider({  
                                token: {
                                key: 'certs/apns.p8', // Path to the key p8 file
                                keyId: 'AW53VE2WG7', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
                                teamId: '857J4HYVDU', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
                                },
                                production: false // Set to true if sending a notification to a production iOS app
                              });  

              var notification = new apn.Notification();

              notification.topic = 'be.degronckel.PantsAlarm';
              notification.expiry = Math.floor(Date.now() / 1000) + 3600;
              notification.sound = 'ping.aiff';
              notification.alert = 'New PANTS alarm(s) received !!';

              apnProvider.send(notification, token).then(function(result) {  
                  // Check the result for any failed devices
                  console.log(result);

                    }); 
          }     
  });
});


app.get("/mysql/serveriospush/:token",function(req,res){
 var token = req.params.token;
 res.end(JSON.stringify(token));
 apnProvider.send(notification, token).then(function(result) {  
          
          console.log("result :");
          console.log(result);
          console.log("result failed :");
          console.log(result.failed);
          if (result.failed.length > 0){
              console.log("result failed gehit !")
              var apnProvider = new apn.Provider({  
                                token: {
                                key: 'certs/apns.p8', // Path to the key p8 file
                                keyId: 'AW53VE2WG7', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
                                teamId: '857J4HYVDU', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
                                },
                                production: false // Set to true if sending a notification to a production iOS app
                              });  

              var notification = new apn.Notification();

              notification.topic = 'be.degronckel.PantsAlarm';
              notification.expiry = Math.floor(Date.now() / 1000) + 3600;
              notification.sound = 'ping.aiff';
              notification.alert = 'New PANTS alarm(s) received !!';

              apnProvider.send(notification, token).then(function(result) {  
                  // Check the result for any failed devices
                  console.log(result);

                    }); 
          }     
  });
});


app.get("/mysql/serverandroidpush/:token",function(req,res){
  var token = req.params.token;
  console.log(token);
  sender.sendNoRetry(alarmMessage, { to : token }, function(err, response) {
    if(err) console.error(err);
    else {
      console.log(JSON.stringify(response));
      res.end(JSON.stringify(response));
    }
  });
});


/*APNTOKENS*/

app.get("/apn/info/:accountid/:deviceid",function(req,res){
  var data = {
        accountID: req.params.accountid,
        deviceID: req.params.deviceid
    };
connection.query('SELECT COUNT(*) as controle from apntokens WHERE accountID = ? AND device = ?', [data.accountID, data.deviceID], function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/apn/logincheck/:accountid/:deviceid",function(req,res){
  var data = {
        accountID: req.params.accountid,
        deviceID: req.params.deviceid
    };
connection.query('SELECT COUNT(*) as controle, allowed from apntokens WHERE accountID = ? AND deviceID = ?', [data.accountID, data.deviceID], function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/apn/sendcheck/:token",function(req,res){
  var data = {
        token: req.params.token
    };
    console.log(data);
connection.query('SELECT send from apntokens WHERE token = ?', data.token, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.post("/apn/new2",function(req,res){
  var post = {
        accountID: req.body.accountID,
        device: req.body.device,
        token: req.body.token,
        send: req.body.send
    };
    console.log(post);
connection.query('INSERT INTO apntokens SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result.insertId));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.post("/apn/apple/new",function(req,res){
  var post = {
        accountID: req.body.accountID,
        device: req.body.device,
        token: req.body.token,
        send: req.body.send,
        deviceID: req.body.deviceID,
        allowed: '0',
        device_type: '1'
    };
    console.log(post);
connection.query('INSERT INTO apntokens SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.post("/apn/android/new",function(req,res){
  var post = {
        accountID: req.body.accountID,
        device: req.body.device,
        token: req.body.token,
        send: req.body.send,
        deviceID: req.body.deviceID,
        allowed: '0',
        device_type: '2'
    };
    console.log(post);
connection.query('INSERT INTO apntokens SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/apn/:accountid/:deviceid",function(req,res){
  var put = {
        device: req.body.device,
        token: req.body.token
    };
    console.log(put);
connection.query('UPDATE apntokens SET ? WHERE accountID = ? and deviceID = ?',[put, req.params.accountid, req.params.deviceid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result.changedRows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/apn/send/token/:token",function(req,res){
  var put = {
        send: req.body.send
    };
    console.log(put);
connection.query('UPDATE apntokens SET ? WHERE token = ?',[put, req.params.token], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result.changedRows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

/*Version control API*/

app.get("/pants/version",function(req,res){
res.end(JSON.stringify("version 1"));
console.log("version 1");
});


/*ALARMS*/

app.get("/alarms/general",function(req,res){
connection.query('SELECT *, CONVERT(DATE_FORMAT(timestamp,"%d-%m-%Y"), CHAR(50)) as alarmdate, CONVERT(DATE_FORMAT(timestamp,"%H:%i"), CHAR(50)) as alarmtime  from alarm_logging ORDER BY timestamp DESC', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/alarms/startdate/general/:startdate",function(req,res){
var data = {
  startdate: req.params.startdate
};
console.log(data);
connection.query('SELECT *, CONVERT(ping_successrate, CHAR(50)) as ping_successrate2, CONVERT(percent_with_ping_OK, CHAR(50)) as percent_with_ping_OK2, CONVERT(DATE_FORMAT(timestamp,"%d-%m-%Y"), CHAR(50)) as alarmdate, CONVERT(DATE_FORMAT(timestamp,"%H:%i"), CHAR(50)) as alarmtime from alarm_logging WHERE timestamp >= STR_TO_DATE(?, "%d-%m-%Y") ORDER BY timestamp DESC', data.startdate, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


/*USERS*/

app.get("/users/userinfo/:username",function(req,res){
  var data = {
        username: req.params.username
    };
connection2.query('SELECT user_id from users WHERE username = ?', data.username, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


/*PDP STATS*/

app.get("/test/successrate/week/:solution",function(req,res){
  var data = {
        solution: req.params.solution
    };
connection.query('SELECT DATE(timestamp) AS ForDate, ((SELECT COUNT(connection_state) from logging where APN IN (SELECT APN FROM APN_list WHERE APN_type = ?) AND ping_result != "" AND connection_state = "running" AND DATE(timestamp) = ForDate) / COUNT(connection_state)) * 100 as Success_rate FROM logging WHERE APN IN (SELECT APN FROM APN_list WHERE APN_type = ?) AND ping_result != "" GROUP BY DATE(timestamp) ORDER BY ForDate', [data.solution, data.solution], function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/test/dates",function(req,res){
connection.query('SELECT DISTINCT CONVERT(DATE_FORMAT(timestamp,"%d-%m-%Y"), CHAR(50)) as timestamp from logging', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/stats/month/:year/:month/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        year: req.params.year,
        month: req.params.month,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, APN_type, success_rate, APN_count FROM pants.logging_PDP_success_rate_daily WHERE YEAR(timestamp) = ? AND MONTH(timestamp) = ? AND APN_type like ? ORDER BY timestamp', [data.year, data.month, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/stats/week/:year/:week/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        year: req.params.year,
        week: req.params.week,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, APN_type, success_rate, APN_count FROM pants.logging_PDP_success_rate_daily WHERE YEAR(timestamp) = ? AND WEEK(timestamp, 3) = ? AND APN_type like ? ORDER BY timestamp', [data.year, data.week, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/stats/last2weeks/:year/:week/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        year: req.params.year,
        week: req.params.week,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, APN_type, success_rate, APN_count FROM pants.logging_PDP_success_rate_daily WHERE YEAR(timestamp) = ? AND (WEEK(timestamp, 3) = ? OR WEEK(timestamp, 3) = ? - 1) AND APN_type like ? ORDER BY timestamp', [data.year, data.week, data.week, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/stats/day/:date/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        date: req.params.date,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, CONVERT(DATE_FORMAT(timestamp,"%H:%i"), CHAR(50)) as hour, APN_type, CONVERT(success_rate, CHAR) AS success_rate, APN_count FROM pants.logging_PDP_success_rate_hourly WHERE DATE_FORMAT(timestamp, "%d-%m-%Y") LIKE ? AND APN_type like ? ORDER BY hour', [data.date, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/stats/last2days/:date/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        date: req.params.date,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, CONVERT(DATE_FORMAT(timestamp,"%H:%i"), CHAR(50)) as hour, APN_type, success_rate, APN_count FROM pants.logging_PDP_success_rate_hourly WHERE (DATE_FORMAT(timestamp, "%Y-%m-%d") =  STR_TO_DATE(?, "%d-%m-%Y") OR DATE_FORMAT(timestamp, "%Y-%m-%d") = DATE_ADD(STR_TO_DATE(?, "%d-%m-%Y"), INTERVAL -1 DAY)) AND APN_type like ? ORDER BY timestamp, hour', [data.date, data.date, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/stats/years",function(req,res){
connection.query('SELECT DISTINCT CONVERT(YEAR(timestamp), CHAR(50)) as year from pants.logging_PDP_success_rate_daily', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/stats/solutions",function(req,res){
connection.query('SELECT DISTINCT APN_type from pants.APN_list', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


/*PING STATS*/

app.get("/pings/day/:date/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        date: req.params.date,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, CONVERT(DATE_FORMAT(timestamp,"%H:%i"), CHAR(50)) as hour, APN_type, CONVERT(success_rate, CHAR) AS success_rate, APN_count FROM pants.logging_ping_success_rate_hourly WHERE DATE_FORMAT(timestamp, "%d-%m-%Y") LIKE ? AND APN_type like ? ORDER BY hour', [data.date, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/pings/last2days/:date/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        date: req.params.date,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, CONVERT(DATE_FORMAT(timestamp,"%H:%i"), CHAR(50)) as hour, APN_type, success_rate, APN_count FROM pants.logging_ping_success_rate_hourly WHERE (DATE_FORMAT(timestamp, "%Y-%m-%d") =  STR_TO_DATE(?, "%d-%m-%Y") OR DATE_FORMAT(timestamp, "%Y-%m-%d") = DATE_ADD(STR_TO_DATE(?, "%d-%m-%Y"), INTERVAL -1 DAY)) AND APN_type like ? ORDER BY timestamp, hour', [data.date, data.date, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/pings/week/:year/:week/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        year: req.params.year,
        week: req.params.week,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, APN_type, success_rate, APN_count FROM pants.logging_ping_success_rate_daily WHERE YEAR(timestamp) = ? AND WEEK(timestamp, 3) = ? AND APN_type like ? ORDER BY timestamp', [data.year, data.week, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/pings/last2weeks/:year/:week/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        year: req.params.year,
        week: req.params.week,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, APN_type, success_rate, APN_count FROM pants.logging_ping_success_rate_daily WHERE YEAR(timestamp) = ? AND (WEEK(timestamp, 3) = ? OR WEEK(timestamp, 3) = ? - 1) AND APN_type like ? ORDER BY timestamp', [data.year, data.week, data.week, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/pings/month/:year/:month/:solution",function(req,res){
  if (req.params.solution == "All") {
    var solutionstring = "%";
  } else {
     var solutionstring = req.params.solution;
   }
  var data = {
        year: req.params.year,
        month: req.params.month,
        solution: solutionstring
    };
    console.log(data);
connection.query('SELECT CONVERT(DATE_FORMAT(timestamp,"%d-%b"), CHAR(50)) as timestampstring, APN_type, success_rate, APN_count FROM pants.logging_ping_success_rate_daily WHERE YEAR(timestamp) = ? AND MONTH(timestamp) = ? AND APN_type like ? ORDER BY timestamp', [data.year, data.month, data.solution], function(err, rows, fields) {
  /*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});