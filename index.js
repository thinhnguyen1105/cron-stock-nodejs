//const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const dateFormat = require('dateformat');

//var app = express();
//   Server=localhost\SQLEXPRESS;Initial Catalog=ck;User ID=CKuser;pwd=%TGB6yhn7ujm;

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
    //console.log(stock);
    var time = dateFormat(new Date(), "yyyy-mm-dd " + stock.time);
    var price = stock.priceMatch;
    var volume = parseInt(stock.qttyMatch);
    var totalvolume = 0; //parseInt(stock.qttyMatch);
    //var symdayid = id;
    var insert_values_str = "'" + time + "'" + "," + price + "," + volume + "," + symdayid;
    var request = new sql.Request();
    request.query("insert into DetailDaily ( dealtime, price, volume, symbolid )  values (" + insert_values_str + ")", function (err, results) {
        if (err) console.log(err)
        //console.log("insert new record:"+symbol);
    });
}

var TEST_insertStock = function (symdayid, symbol, stock) {
    var keystart = 'tblData';
    var keyend = '</table>';
    //buffer.indexOf(value, start, encoding);
    //console.log(buf.indexOf('e'));
    //var res = str.substr(1, 4);
    console.log('3');
    //var strdata =stock.indexOf(keystart);
    //var strdata1 = stock.substr(1, 20);
    console.log(stock);
    //console.log(strdata1);

}


var loopStock = function (symdayid, symbol, resultStocks) {
    while (resultStocks && resultStocks.length > 0) {
        //console.log(resultStocks);


        var resultStock = resultStocks.shift();
        var time = dateFormat(new Date(), "yyyy-mm-dd " + resultStock.time);
        var request = new sql.Request();

        request.query("select * from Detaildaily where (dealtime = '" + time + "' AND  symbolid = " + symdayid + ") ",
            function (err, results) {
                var count = results.recordset;
                console.log('count: ' + count);
                if (count.length == 0) {

                    console.log('1');
                    //TEST_insertStock(symdayid, symbol,resultStock );
                    console.log('2');

                    //insertStock(symdayid, symbol,resultStock );
                    loopStock(symdayid, symbol, resultStocks);
                } else {
                    //console.log('\x1b[33m%s\x1b[33m',symbol + ": Not new record");
                }
            });
        break;
    }
}


var fecthData = async function (symdayid, symbol, loopIndex) {
    // var time   = dateFormat(new Date(), "yyyy-mm-dd ");
    // console.log('startfethdata');
    // //axios.get('https://s.cafef.vn/Lich-su-giao-dich-' + symbol + '-6.chn?date=' + time)
    // axios.get('https://s.cafef.vn/Lich-su-giao-dich-vsc-6.chn?date=06/10/2020')
    // .then(function (response) {
    //     var resultStocks = response.data;
    //     //console.log('dadsadsa>'+resultStocks);
    //     if( resultStocks.length == 0 ){
    //         //console.log('\x1b[31m%s\x1b[31m',symbol+': EMPTY');
    //         return ;
    //     }
    //     //console.log(resultStocks);
    //     loopStock(symdayid, symbol,resultStocks);


    // })
    // .catch(function (error) {
    //     console.log('\x1b[31m%s\x1b[31m', "NOT Connect "+ symbol);
    // });
    // //break;

    const html = await getDataFromWebsite()
    const tableData = getDataFromTableStock(html)
    const rawDataFromHTML = getRawDataFromHTML(tableData)
    loopStock(symdayid, symbol, rawDataFromHTML);
}

//Connect DB
var conn = sql.connect(config, function (err) {
    if (err) console.log(err);
    else {
        console.log('Conected');


        //Tao gia tran, san, TC
        var request = new sql.Request();
        setInterval(function () {

            {
                //Update price volum
                request.query("select id, symbol, active from Symbols where (id = 105)", function (err, results) {
                    if (err) console.log(err)
                    var symbols = results.recordset;

                    symbols.forEach(function (symbol, index) {
                        fecthData(symbol.id, symbol.symbol, index);
                    });
                    console.log('\x1b[32m%s\x1b[32m', "Update all completed: " + dateFormat(new Date(), "dd-mm-yyyy h:MM:ss"));
                });
            }
        }, 5000);
    }

});



// FETCH AND ANALYZE DATA

function getDataFromTableStock(html) {
    const startStringTable = `<div id="price-list">`
    const endStringTable = `<table cellpadding="2" cellspacing="0" width="97%" id="price-list-footer" class="pricetable" style="display:none">`
    const indexOfStart = String(html).indexOf(startStringTable)
    const indexOfEnd = String(html).indexOf(endStringTable)
    return String(html).substring(indexOfStart, indexOfEnd)
}

async function getDataFromWebsite() {
    try {
        const res = await axios.get('https://s.cafef.vn/Lich-su-giao-dich-vsc-6.chn?date=06/10/2020')
        return res.data
    } catch (error) {
        console.log('error')
    }
}

function getRawDataFromHTML(htmlTable) {
    const $ = cheerio.load(htmlTable);
    const listTime = $('.Item_DateItem').toArray().map((x) => { return $(x).text() });
    const price = $('.Item_Price10').toArray().map((x) => { return $(x).text() });
    const subPrice = $('.Item_Price10 span').toArray().map((x) => { return $(x).text() });
    let listPrice = []
    let listVolume = []
    price.forEach((item, index) => {
        if (index % 4 === 0) {
            listPrice.push(item)
        } else if (index % 4 === 1) {
            listVolume.push(item)
        }
    });
    let combineData = []
    listTime.forEach((time, index) => {
        combineData[index] = {
            time: time,
            priceMatch: listPrice[index].replace(' ' + subPrice[index], ''),
            qttyMatch: listVolume[index]
        }
    })
    return combineData
}