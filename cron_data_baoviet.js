const axios = require('axios');
const dateFormat = require('dateformat');

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

const cronData = async () => {
  const data = await getDataFromAPI()
  console.log('data raw', data.length)
  const combinedData = await combineSameData(data)
  console.log('combinedData', combinedData.length)
  // const convertedData = await analystData(combinedData)

  // console.log('combineData', combinedData)
}

cronData()