const axios = require('axios');
const dateFormat = require('dateformat');
const moment = require('moment');
let currentLastestTime = 0

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
    var momentDate = moment(stock.tdate, 'DD.MM.YYYY');
    var time = dateFormat(new Date(momentDate), "yyyy-mm-dd " + stock.time);
    var price = stock.priceMatch;
    var volume = parseInt(stock.qttyMatch);
    var lenh = stock.lenh;
    var insert_values_str = "'" + time + "'" + "," + price + "," + volume + "," + symdayid + "," + lenh;
    var request = new sql.Request();
    request.query("insert into DetailDaily ( dealtime, price, volume, symbolid, lenh )  values (" + insert_values_str + ")", function (err, results) {
        if (err) console.log(err)
    });
}

var loopStock = function (symbolid, symbol, resultStocks) {
    while (resultStocks && resultStocks.length > 0) {
        var resultStock = resultStocks.shift();
        //        var time = dateFormat(new Date(), "yyyy-mm-dd " + resultStock.time);
        var momentDate = moment(resultStock.tdate, 'DD.MM.YYYY');
        var time = dateFormat(new Date(momentDate), "yyyy-mm-dd " + resultStock.time);

        var request = new sql.Request();
        var stringSQL = "select * from DetailDaily where (dealtime = '" + time + "' AND  symbolid = " + symbolid + " AND  lenh = " + resultStock.lenh + " AND price = " + resultStock.priceMatch + ") ";
        request.query(stringSQL,
            function (err, results) {
                var count = results && results.recordset && results.recordset.length ? results.recordset : [];
                if (count.length === 0) {
                    insertStock(symbolid, symbol, resultStock);
                    loopStock(symbolid, symbol, resultStocks);
                }
            });
        break;
    }
}

function combineSameData(listStocks) {
    let data = {}
    let arrData = []
    listStocks.forEach(stock => {
        let key = `${stock.FT}-${stock.TD}-${stock.FMP}-${stock.LC}`
        if (data[key]) {
            data[key] = {
                ...data[key],
                FV: Number(data[key].FV) + Number(stock.FV)
            }
        } else {
            data[key] = stock
        }
    });
    Object.keys(data).forEach(item => {
        arrData.push(data[item])
    })
    return arrData
}

var fecthData = async function (symbolid, symbol, loopIndex) {
    const data = await getDataFromAPI(symbol)
    const lastestTime = await getLastestTime(data)
    if (currentLastestTime) {
        if (lastestTime > currentLastestTime) {
            currentLastestTime = lastestTime
            const newData = filterNewData(data, lastestTime)
            const combineData = await combineSameData(newData)
            const convertedData = await analystData(combineData)
            loopStock(symbolid, symbol, convertedData);
        } else {
            console.log('lastest data no update')
        }
    } else {
        // query lastest time from database
        var request = new sql.Request();
        request.query(`SELECT TOP (1) [symbolid],[dealtime] FROM [ck].[dbo].[DetailDaily_1] order by dealtime desc`, function (err, result) {
            const lastestTimeFromDB = result && result.recordset && result.recordset.dealtime ? Number(new Date(result.recordset.dealtime).valueOf()) : 0
            currentLastestTime = lastestTimeFromDB
        });
    }
}

//Connect DB
var conn = sql.connect(config, function (err) {
    if (err) console.log(err);
    else {
        console.log('Conected');

        //Tao gia tran, san, TC
        var request = new sql.Request();
        setInterval(function () {
            //Update price volum
            request.query("select id, symbol, active from Symbols where (active = 1)", function (err, results) {
                if (err) console.log(err)
                var symbols = results && results.recordset && results.recordset.length ? results.recordset : [];

                symbols.forEach(function (symbol, index) {
                    fecthData(symbol.id, symbol.symbol, index);
                });
                console.log('\x1b[32m%s\x1b[32m', "Update all completed: " + dateFormat(new Date(), "dd-mm-yyyy h:MM:ss"));
            });
        }, 5000);
    }

});

async function getDataFromAPI(symbol) {
    try {
        const res = await axios.get('https://online.bvsc.com.vn/datafeed/translogsnaps/' + symbol.toUpperCase())
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
                lenh: stock.LC && stock.LC === 'S' ? 0 : 1,
                tdate: stock.TD
            }
        })
    } return []
}

function getLastestTime(data) {
    const listTime = data.map(stock => {
        const momentDate = moment(stock.TD, 'DD.MM.YYYY');
        const time = dateFormat(new Date(momentDate), "yyyy-mm-dd " + stock.FT);
        return Number(new Date(time).valueOf())
    })
    listTime.sort((a, b) => b - a)
    return listTime[0]
}

function filterNewData(data, lastestTime) {
    return data.filter(stock => {
        const momentDate = moment(stock.TD, 'DD.MM.YYYY');
        const time = dateFormat(new Date(momentDate), "yyyy-mm-dd " + stock.FT);
        const numberTime = Number(new Date(time).valueOf())
        return numberTime > lastestTime
    })
}
