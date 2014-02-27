var serlcd = require('serlcd');
var request = require('request');
var lcd = new serlcd("/dev/ttyAMA0");
var is_printing = false;
var print_start;

main();

function main() {
  // request the current printer jobs
  //  http://localhost:9000/printer/job/printrbotSimple?a=list
  
  request( { url:'http://localhost/printer/job/printrbotSimple?a=list', json:true }, function(err, res, job) {
    if( err ) { console.log('error1', err); finish(); return }
    
    // request the current printer status
    //  http://localhost:9000/printer/response/printrbotSimple
    
    request( { url:'http://localhost/printer/response/printrbotSimple', json:true }, function(err, res, printer) {
      if( err ) { console.log('error2', err); finish(); return }

      // console.log( job );
      // console.log( printer );

      var currentJob = 'Idle';
      var percent = false;
      for( var x in job.data ) {
        if( job.data[x].state === 'running' ) {
          currentJob = job.data[x].name;
          percent = job.data[x].done;
        }
      }
      
      if( !is_printing && percent !== false ) { // transition from idle to print
        is_printing = true;
        print_start = ( Date.now() / 1000 ) + 20; // give a 20 second pad for warmup ( otherwise the remaining time goes apeshit )
      }
      if( is_printing && percent === false ) { // transition from print to idle
        is_printing = false;
        print_start = 0;
      }
      
      if( printer.data ) {
        var x = Math.round(printer.data.state.x * 100) / 100;
        var y = Math.round(printer.data.state.y * 100) / 100;
        var z = Math.round(printer.data.state.z * 100) / 100;

        var fan_status = printer.data.state.fanOn ? 'on' : 'off';
        var extruder_temp = Math.round(printer.data.state.extruder[0].tempRead * 10)/10;
      } else {
        var x = 0, y = 0, z = 0, fan_status = 'on', extruder_temp = 0;
      }

      var elapsed_time = ( ( Date.now() / 1000 ) - print_start );
      var remaining_time = ( elapsed_time / percent ) * ( 100 - percent );

      if( elapsed_time < 0 ) remaining_time = 0;

      lcd.clearScreen();
      lcd.write(center(currentJob,20));
      lcd.write(center(( !is_printing ? '' : ( Math.round( percent * 100 ) / 100 ) + '%  ' + remaining_time.toHHMMSS() ),20));
      lcd.write(center('fan:' + fan_status + '   temp:' + extruder_temp,20));
      lcd.write('x' + rpad(x,5) + ' y' + rpad(y,5) + ' z' + rpad(z,5));

      finish();
    });
  });
}

function rpad(str,len) {
  str += '';
  str = str + Array(len + 1 - str.length).join(' ');
  return str.substr(0,len);
}

function center(str,len) {
  str += '';
  str = str.substr(0,len);
  var _str = Array( Math.floor( ( len - str.length ) / 2 ) + 1 ).join(' ') + str;
  return _str + Array( len - _str.length + 1 ).join(' ');
}

Number.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+':'+minutes+':'+seconds;
    return time;
}

function finish() {
  setTimeout( main, 1000 );
}
