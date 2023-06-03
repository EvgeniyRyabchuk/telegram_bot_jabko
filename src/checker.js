
const url = 'https://jabko.ua/zaporizhzhia/rus/';
const { GoodsPageType } = require('./utills');
const axios = require('axios')
const jsdom = require("jsdom");
const {Category, Good, History} = require("../database/models");
const path = require('path');
const fs = require("fs");
const { JSDOM } = jsdom;


const getAllCategories = async () => {
    // const limit2 = 3;
    // let document1 = (await getJsDomByUrl(`https://rock-star.com.ua/keyboards/digital-piano/?limit=${limit2}`)).window.document;
    // const containers1 = document1.querySelectorAll(".product-thumb");
    // console.log(containers1.length, `limit = ${limit2}`);
    //
    //
    // return;

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

const getJsDomByUrl = async (url, isSave = false) => {
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

    if(isSave)
        saveHtmlDoc(html);


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
        .replace(' ', '')
        .replace('$', ''))
    .toFixed(2);
}

const parseGood = async (container,
                         PageType = GoodsPageType.LIST,
                         currencyBuy = null,
                         categoryId = null,
                         GoodUrl = null
) => {
    const name = container.querySelector(PageType.NameSelector).textContent.replace(/\s\s+/g, ' ');
    const url = container.querySelector(PageType.UrlSelector).getAttribute('href');
    const price_uah = fromTextToMoney(container.querySelector(PageType.PriceUah).textContent);

    let price_usd = 0;
    if(PageType == GoodsPageType.LIST)
        price_usd = (price_uah / currencyBuy).toFixed(2);
    else if(PageType == GoodsPageType.SHOW)
        price_usd = fromTextToMoney(container.querySelector(PageType.PriceUsd).textContent);

    const [good, created] = await Good.findOrCreate({
        where: { name },
        defaults: {
            name, url: PageType == GoodsPageType.LIST ? url : GoodUrl, price_uah, price_usd, dollar: currencyBuy, categoryId: categoryId
        }
    });
    return {good, newPrice: {uah: price_uah, usd: price_usd}};
}


const commitPriceChange = async (good, newPrice, changedGoods, minPercent = 0) => {
    if(good.price_uah != newPrice.uah) {
        const absoluteDiff = Math.round(newPrice.uah - good.price_uah);
        const char = absoluteDiff > 0 ? "+" : '-';
        const percentDiff = Math.round((newPrice.uah * 100) / good.price_uah);


        if(percentDiff >= minPercent || minPercent === 0) {
            changedGoods.push({
                good,
                oldPriceUah: good.price_uah,
                newPriceUah: newPrice.uah,
                diff: { absoluteDiff, percentDiff, char }
            });

            await Good.update({ price_uah: newPrice.uah, price_usd: newPrice.uah }, {
                where: { id: good.id }
            });

            await History.create({
                new_price_uah: newPrice.uah,
                old_price_uah: good.price_uah,
                new_price_usd: newPrice.usd,
                old_price_usd: good.price_usd,
                good_id: good
            })
        }
        return {
            absoluteDiff,
            percentDiff
        }
    }
}

const getGoods = async (totalPage, currentPage, category, currencyBuy, changedGoods) => {
    const document = (await getJsDomByUrl(`${category.url}?page=${currentPage}`, false)).window.document;
    const containers = document.querySelectorAll(".prod-item");

    // console.log(containers.length, `totalPage = ${totalPage}`, `limit = ${limit}`);
    console.log(containers.length, `totalPage = ${totalPage}`);

    for (let container of containers) {
        const {good, newPrice} = await parseGood(container, GoodsPageType.LIST, currencyBuy, category.id);
        commitPriceChange(changedGoods)
    }
    return changedGoods;
}

// get all the goods by category
//TODO: make only one requst for get pagination btn
const getAllGoodsByCategory = async (category) => {
    console.log(' ================================= start scan =================================');

    let document = (await getJsDomByUrl(`${category.url}`)).window.document;
    const paginateBtn = document.querySelector(".pagination > .pag-item:nth-last-child(2)");
    let totalPage = 0;
    if(paginateBtn)
        totalPage = paginateBtn.textContent;

    const perPage = 24;
    let currentPage = 1;
    // const limit = totalPage * perPage;
    // const limit = 10;
    // let urlWithLimit = `${category.url}?limit=${limit}`;

    const response = await axios.get('https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5');
    const currencyBuy = response.data[1].buy;

    let changedGoods = [];

    if(totalPage == 0) {
        changedGoods = await getGoods(
            totalPage,
            currentPage,
            category,
            currencyBuy,
            changedGoods
        );
    } else {
        while (currentPage <= totalPage) {
            // try {
            //     //TODO: get root folder path
            //     const path1 = `C:/Users/jekar/Desktop/telegram_bot_jabko/123.html`;
            //     document = fs.readFileSync(path1, {encoding: 'utf-8'});
            //     document = new JSDOM(`${document}`).window.document;
            // } catch (ex) {
            //     console.error(ex)
            // }
            changedGoods = await getGoods(
                totalPage,
                currentPage,
                category,
                currencyBuy,
                changedGoods
            );
            currentPage++;
            console.log(`current page = ${currentPage}`);
        }
    }
    // const limit2 = 3;
    // document = (await getJsDomByUrl(`https://rock-star.com.ua/keyboards/digital-piano/?limit=${limit2}`)).window.document;
    // const containers1 = document.querySelectorAll(".product-thumb");
    // console.log(containers1.length, `limit = ${limit2}`);
    console.log(' ================================= scan is end =================================');
    return changedGoods;
}

module.exports = {
    saveCategoriesIfNotExist,
    getAllGoodsByCategory,
    parseGood,
    getJsDomByUrl,
    commitPriceChange
}