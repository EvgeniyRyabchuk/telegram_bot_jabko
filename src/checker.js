
const url = 'https://jabko.ua/zaporizhzhia/rus/';

const axios = require('axios')
const jsdom = require("jsdom");
const {Category, Good} = require("../database/models");

const fs = require("fs");
const { JSDOM } = jsdom;


const getAllCategories = async () => {
    try {
        let dom = await getJsDomByUrl(url);
        let result = [];
        let list = dom.window.document.querySelectorAll(".second-nav > .item");
        for(let item of list) {
            const li = item.querySelector(".item--link-l1");
            result.push({
                name: li.textContent.replace('\n', '').trim(),
                url: li.getAttribute('href')
            });
        }
        return result;
    }
    catch (err) {
        console.error(err);
    }
}

const saveHtmlDoc = (html) => {
    var fs = require('fs');
    fs.appendFile('123.html', html.toString("utf-8"), function (err) {
        if (err) throw err;
        console.log('Saved!');
    })
}
const getJsDomByUrl = async (url) => {
    const response = await axios.get(`${url}`, {
        responseType: 'document',
        headers: {
            // cacheControl: 'no-cache',
            // pragma: 'no-cache',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
        }
    });
    const html = response.data;

    // const response = await fetch(`${url}`, {
    //     cache: 'no-cache',
    //     headers: {
    //         'Content-Type': "text/html",
    //         'Cache-Control': 'no-cache',
    //         'Pragma': 'no-cache',
    //         // 'Content-Type': 'application/x-www-form-urlencoded',
    //     },
    // })
    // const html = await response.text();



    return new JSDOM(`${html}`);
}

const saveCategoriesIfNotExist = async () => {
    const categoryList = await getAllCategories();
    console.log(categoryList);
    for (let category of categoryList) {
        const existCategory = await Category.findOne({
            where: { name: category.name }
        });
        //TODO: fix problem when new category just renamed
        if(!existCategory)
            await Category.create({name: category.name, url: category.url});
    }
    return Category.findAll();
}

const fromTextToMoney = (text) => {
   return parseFloat(text
        .replace('грн', '')
        .replace(' ', ''))
    .toFixed(2);
}

// get all the goods by category
const getAllGoodsByCategory = async (category) => {
    console.log(' ================================= start scan =================================');
    let document = (await getJsDomByUrl(`${category.url}`)).window.document;
    const totalPage = document.querySelector(".pagination > .pag-item:nth-last-child(2)").textContent;
    const perPage = 24;
    let currentPage = 1;
    // const limit = totalPage * perPage;
    // const limit = 10;
    // let urlWithLimit = `${category.url}?limit=${limit}`;

    const response = await axios.get('https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5');
    const currencyBuy = response.data[1].buy;

    while (currentPage <= totalPage) {

        document = (await getJsDomByUrl(`${category.url}?page=${currentPage}`)).window.document;

        const containers = document.querySelectorAll(".prod-item");

        // console.log(containers.length, `totalPage = ${totalPage}`, `limit = ${limit}`);
        console.log(containers.length, `totalPage = ${totalPage}`);

        for (let container of containers) {
            const name = container.querySelector('.slide-title > span').textContent;
            const url = container.querySelector('.product_link').getAttribute('href');
            const price_uah = fromTextToMoney(container.querySelector('.price-cur > .uah > span').textContent);
            const price_usd = (price_uah / currencyBuy).toFixed(2)
            console.log(name, url, price_uah, price_usd);
            await Good.create({ name, url, price_uah, price_usd, dollar: currencyBuy, categoryId: category.id});
        }

        currentPage++;
        console.log(`current page = ${currentPage}`);
    }

    // const limit2 = 3;
    // document = (await getJsDomByUrl(`https://rock-star.com.ua/keyboards/digital-piano/?limit=${limit2}`)).window.document;
    // const containers1 = document.querySelectorAll(".product-thumb");
    // console.log(containers1.length, `limit = ${limit2}`);

    console.log(' ================================= scan is end =================================');
}

module.exports = {
    saveCategoriesIfNotExist,
    getAllGoodsByCategory
}