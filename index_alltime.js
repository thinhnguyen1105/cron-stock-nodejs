const axios = require('axios');
const dateFormat = require('dateformat');
const moment = require('moment');
const sql = require('mssql');
let currentLastestTime = {}
const config = {
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

// start and connect DB
sql.connect(config, function (err) {
    if (err) console.log(err);
    else {
        console.log('1.Conected');
        var request = new sql.Request();
        request.query("select id, symbol, active from Symbols where (active = 1)", function (err, results) {
            if (err) console.log(err)
            var symbols = results && results.recordset && results.recordset.length ? results.recordset : [];
            console.log('2. query get symbols success, count:', symbols.length)
            // Set time to run
            var today = new Date();
            var TimeA = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 1);
            var TimeB = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 31, 1);
            var TimeC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0, 0);
            var TimeD = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 3, 3);
            // loop symbols and save to database
            setInterval(function () {
                // today = new Date();
                // if (today < TimeA)
                //     console.log('Rinh-Vo-Chen-Luon');
                // else if (today > TimeB && today < TimeC)
                //     console.log('Nghi trua');
                // else if (today > TimeD)
                //     console.log('Het gio');
                // else {
                symbols.forEach(function (symbol, index) {
                    setTimeout(() => {
                        fetchData(symbol.id, symbol.symbol);
                    }, 10000 * index);
                });
                console.log('\x1b[32m%s\x1b[32m', "Update all symbols completed: " + dateFormat(new Date(), "dd-mm-yyyy h:MM:ss"));
                // }
            }, 10000);
        });

    }

});

let fetchData = async function (symbolid, symbol) {
    const data = await getDataFromAPI(symbol)
    console.log('3. get data from API success, count:', data.length)
    if (data && data.length) {
        const lastestTime = await getLastestTimeFromAPI(data)
        console.log('4. lastestTimeFromAPI', lastestTime)
        if (currentLastestTime[symbolid]) {
            if (lastestTime > currentLastestTime[symbolid]) {
                const newData = filterNewData(data, currentLastestTime[symbolid])
                const combineData = await combineSameData(newData)
                const convertedData = await analystData(combineData)
                console.log('5. count converted data:', convertedData.length)
                loopStock(symbolid, convertedData);
                currentLastestTime[symbolid] = lastestTime
            }
            else { console.log('dont have new time') }
        } else {
            // query lastest time from database
            var request = new sql.Request();
            request.query(`SELECT TOP (1) symbolid,dealtime FROM DetailDaily where symbolid=${symbolid} order by dealtime desc`, async function (err, result) {
                const lastestTimeFromDB = result && result.recordset && result.recordset.length ? result.recordset[0].dealtime : undefined
                console.log('getLastestTimeFromDB')
                if (lastestTimeFromDB) {
                    let lastestTimeFromDBTypeDate = new Date(lastestTimeFromDB)
                    const vnTime = lastestTimeFromDBTypeDate.setHours(lastestTimeFromDBTypeDate.getHours() - 7);
                    currentLastestTime[symbolid] = vnTime
                    console.log('setCurrentLastestTimeFromDB', currentLastestTime[symbolid])
                } else {
                    console.log('database empty, update all new data !')
                    const combineData = await combineSameData(data)
                    const convertedData = await analystData(combineData)
                    loopStock(symbolid, convertedData);
                }
            });
        }
    }
}

async function getDataFromAPI(symbol) {
    try {
        const res = await axios.get('https://online.bvsc.com.vn/datafeed/translogsnaps/' + symbol.toUpperCase())
        return res.data.d
    } catch (error) {
        console.log('Cant get data from API')
        return []
    }
}

function getLastestTimeFromAPI(data) {
    if (!data) {
        return 0
    } else {
        const listTime = data.map(stock => {
            const momentDate = moment(stock.TD, 'DD.MM.YYYY');
            const time = dateFormat(new Date(momentDate), "yyyy-mm-dd " + stock.FT);
            return Number(new Date(time).valueOf())
        })
        listTime.sort((a, b) => b - a)
        return listTime[0]
    }
}



var insertStock = function (symdayid, stock) {
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

var loopStock = function (symbolid, resultStocks) {
    while (resultStocks && resultStocks.length > 0) {
        var resultStock = resultStocks.shift();
        var momentDate = moment(resultStock.tdate, 'DD.MM.YYYY');
        var time = dateFormat(new Date(momentDate), "yyyy-mm-dd " + resultStock.time);

        var request = new sql.Request();
        var stringSQL = "select * from DetailDaily where (dealtime = '" + time + "' AND  symbolid = " + symbolid + " AND  lenh = " + resultStock.lenh + " AND price = " + resultStock.priceMatch + ") ";
        request.query(stringSQL,
            function (err, results) {
                var count = results && results.recordset && results.recordset.length ? results.recordset : [];
                if (count.length === 0) {
                    console.log('validate to insert!')
                    insertStock(symbolid, resultStock);
                    loopStock(symbolid, resultStocks);
                }
            });
        break;
    }
}

function combineSameData(listStocks) {
    if (!listStocks) return []
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

function analystData(dataStocks) {
    return dataStocks.map(stock => {
        return {
            time: stock.FT,
            priceMatch: Number(stock.FMP) / 1000,
            qttyMatch: stock.FV,
            lenh: stock.LC && stock.LC === 'S' ? 0 : 1,
            tdate: stock.TD
        }
    })
}

function filterNewData(data, lastestTime) {
    if (!data) return []
    return data.filter(stock => {
        const momentDate = moment(stock.TD, 'DD.MM.YYYY');
        const time = dateFormat(new Date(momentDate), "yyyy-mm-dd " + stock.FT);
        const numberTime = Number(new Date(time).valueOf())
        return numberTime > lastestTime
    })
}