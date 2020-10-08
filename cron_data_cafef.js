const axios = require('axios');
const cheerio = require('cheerio');

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

const cronData = async () => {
  const html = await getDataFromWebsite()
  const tableData = getDataFromTableStock(html)
  const rawDataFromHTML = getRawDataFromHTML(tableData)
  console.log('rawDataFromHTML', rawDataFromHTML)
}

cronData()