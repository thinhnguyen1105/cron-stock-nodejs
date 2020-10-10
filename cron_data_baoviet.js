const axios = require('axios');
const dateFormat = require('dateformat');
const moment = require('moment')
let currentLastestTime = 0

async function getDataFromAPI() {
  try {
    const res = await axios.get('https://online.bvsc.com.vn/datafeed/translogsnaps/BID')
    return res.data.d
  } catch (error) {
    console.log(error)
  }
}

function analystData(dataStocks) {
  console.log(dataStocks.length)
  return dataStocks.map(stock => {
    var time = dateFormat(new Date(), "yyyy-mm-dd " + stock.FT);
    return {
      time,
      priceMatch: Number(stock.FMP) / 1000,
      qttyMatch: Number(stock.FV),
      lenh: stock.LC && stock.LC === 'S' ? 0 : 1
    }
  })
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

const cronData = async () => {
  const data = await getDataFromAPI()
  const lastestTime = await getLastestTime(data)
  if (currentLastestTime) {
    if (lastestTime > currentLastestTime) {
      currentLastestTime = lastestTime
      const newData = filterNewData(data, lastestTime)
      // const combinedData = await combineSameData(data)
      // const convertedData = await analystData(combinedData)

      // console.log('combineData', combinedData)
    } else {
      console.log('lastest data no update')
    }
  } else {
    currentLastestTime = lastestTime
  }
}

cronData()