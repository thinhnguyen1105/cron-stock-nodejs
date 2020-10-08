const axios = require('axios');
const dateFormat = require('dateformat');

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

var updateStock = function (resultStock, existedRecord) {
    var existedVolume = Number(existedRecord.volume);
    var bonusVolume = Number(resultStock.qttyMatch);
    var newVolume = bonusVolume + existedVolume;
    var request = new sql.Request();
    request.query(`update DetailDaily_1 set volume = ${newVolume} where id = ${existedRecord.id}`, function (err, results) {
        if (err) console.log(err)
    });
}

var loopStock = function (symbolid, symbol, resultStocks) {
    while (resultStocks && resultStocks.length > 0) {
        var resultStock = resultStocks.shift();
        var time = dateFormat(new Date(), "yyyy-mm-dd " + resultStock.time);
        var request = new sql.Request();
        var stringSQL = "select * from Detaildaily_1 where (dealtime = '" + time + "' AND  symbolid = " + symbolid + " AND  lenh = " + resultStock.lenh + ") ";
        request.query(stringSQL,
            function (err, results) {
                var count = results && results.recordset && results.recordset.length ? results.recordset : [];
                if (count.length === 0) {
                    insertStock(symbolid, symbol, resultStock);
                    loopStock(symbolid, symbol, resultStocks);
                } else {
                    const existedRecord = results.recordset[0]
                    updateStock(resultStock, existedRecord);
                    loopStock(symbolid, symbol, resultStocks);
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
        setInterval(function () {
            today = new Date();
            if (today < TimeA) {
                // chua den gio chay
                console.log('Rinh-Vo-Chen-Luon');
            }
            else if (today > TimeB && today < TimeC) {
                // nghi trua
                console.log('Nghi trua');
            }
            else if (today > TimeD) {
                // Het gio
                console.log('Het gio');
            }
            else {
                //Update price volum
                request.query("select id, symbol, active from Symbols where (id = 1)", function (err, results) {
                    if (err) console.log(err)
                    var symbols = results && results.recordset && results.recordset.length ? results.recordset : [];

                    symbols.forEach(function (symbol, index) {
                        fecthData(symbol.id, symbol.symbol, index);
                    });
                    console.log('\x1b[32m%s\x1b[32m', "Update all completed: " + dateFormat(new Date(), "dd-mm-yyyy h:MM:ss"));
                });
            }
        }, 5000);
    }

});


//
async function getDataFromAPI() {
    try {
        const res = await axios.get('https://online.bvsc.com.vn/datafeed/translogsnaps/BID')
        return res.data.d
    } catch (error) {
        console.log(error)
    }
}

function analystData(dataStocks) {
    if (dataStocks && dataStocks.length) {
        return dataStocks.map(stock => {
            return {
                time: stock.FT,
                priceMatch: Number(stock.FMP) / 1000,
                qttyMatch: stock.FV,
                lenh: stock.LC && stock.LC === 'S' ? 0 : 1
            }
        })
    } return []
}