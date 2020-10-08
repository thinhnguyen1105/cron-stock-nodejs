const axios = require('axios');
const moment = require('moment');

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
    // const formatDate = typeof (stock.TD) === 'string' ? moment(stock.TD).format("YYYY-MM-DD") : ''
    // const convertedDate = formatDate && stock.FT ? `${formatDate} ${stock.FT}.000` : ''
    return {
      time: stock.FT,
      priceMatch: Number(stock.FMP) / 1000,
      qttyMatch: stock.FV,
      lenh: stock.LC ? stock.LC : ''
    }
  })
}

const cronData = async () => {
  const data = await getDataFromAPI()
  const convertedData = await analystData(data)
  console.log('convertedData', convertedData)
}

cronData()