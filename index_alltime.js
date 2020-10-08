const axios = require('axios');
const dateFormat = require('dateformat');
const moment = require('moment');

const sql = require('mssql');
var config = {
    server: "VNHAN-L129",
    user: "CKuser",
    password: "%TGB6yhn7ujm",
    database: "ck",
    connectionTimeout: 300000,
    requestTimeout: 300000,
    pool: {
        idleTimeoutMillis: 300000,
        max: 100
    }
}


var insertStock = function (symdayid, symbol, stock) {
    var time = dateFormat(new Date(), "yyyy-mm-dd " + stock.time);
    var price = stock.priceMatch;
    var volume = parseInt(stock.qttyMatch);
    var lenh = stock.lenh;
    var insert_values_str = "'" + time + "'" + "," + price + "," + volume + "," + symdayid + "," + lenh;
    var request = new sql.Request();
    request.query("insert into DetailDaily_1 ( dealtime, price, volume, symbolid, lenh )  values (" + insert_values_str + ")", function (err, results) {
        if (err) console.log(err)
    });
}

var loopStock = function (symdayid, symbol, resultStocks) {
    while (resultStocks && resultStocks.length > 0) {
        var resultStock = resultStocks.shift();
        console.log('resultStock', resultStock)
        var time = dateFormat(new Date(), "yyyy-mm-dd " + resultStock.time);
        var request = new sql.Request();
        request.query("select * from Detaildaily_1 where (dealtime = '" + time + "' AND  symbolid = " + symdayid + ") ",
            function (err, results) {
                var count = results && results.recordset && results.recordset.length ? results.recordset : [];
                if (count.length == 0) {
                    insertStock(symdayid, symbol, resultStock);
                    loopStock(symdayid, symbol, resultStocks);
                } else {
                    console.log('time error', time)
                    //console.log('\x1b[33m%s\x1b[33m',symbol + ": Not new record");
                }
            });
        break;
    }
}

var fecthData = async function (symdayid, symbol, loopIndex) {
    const data = await getDataFromAPI()
    const convertedData = await analystData(data)
    loopStock(symdayid, symbol, convertedData);
}

//Connect DB
var conn = sql.connect(config, function (err) {
    if (err) console.log(err);
    else {
        console.log('Conected');
        // Đặt giờ chạy ở đây
        var today = new Date();
        var TimeA = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 1);
        var TimeB = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 31, 1);
        var TimeC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0, 0);
        var TimeD = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 3, 3);

        //Tao gia tran, san, TC
        var request = new sql.Request();
        // setInterval(function () {
        //today = new Date();
        //if(today < TimeA)
        //{
        //    // chua den gio chay
        //    console.log('Rinh-Vo-Chen-Luon');
        //}
        //else if(today > TimeB &&  today < TimeC )
        //{
        //    // nghi trua
        //    console.log('Nghi trua');
        //}
        //else if(today > TimeD)
        //{
        //    // Het gio
        //    console.log('Het gio');
        //}
        //else
        //{
        //Update price volum
        request.query("select id, symbol, active from Symbols where (id = 1)", function (err, results) {
            if (err) console.log(err)
            var symbols = results && results.recordset && results.recordset.length ? results.recordset : [];

            symbols.forEach(function (symbol, index) {
                fecthData(symbol.id, symbol.symbol, index);
            });
            console.log('\x1b[32m%s\x1b[32m', "Update all completed: " + dateFormat(new Date(), "dd-mm-yyyy h:MM:ss"));
        });
        //}
        // }, 5000);
    }

});


////////////
async function getDataFromAPI() {
    try {
        const res = await axios.get('https://online.bvsc.com.vn/datafeed/translogsnaps/BID')
        return res.data.d
    } catch (error) {
        console.log(error)
    }
}

function analystData(dataStocks) {
    console.log('count', dataStocks.length)
    if (dataStocks && dataStocks.length) {
        return dataStocks.map(stock => {
            // const formatDate = typeof (stock.TD) === 'string' ? moment(stock.TD).format("YYYY-MM-DD") : ''
            // const convertedDate = formatDate && stock.FT ? `${formatDate}T${stock.FT}.000Z` : ''
            return {
                time: stock.FT,
                priceMatch: Number(stock.FMP) / 1000,
                qttyMatch: stock.FV,
                lenh: stock.LC && stock.LC === 'S' ? 0 : 1
            }
        })
    } return []
}
