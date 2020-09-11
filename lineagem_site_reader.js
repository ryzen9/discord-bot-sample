const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

  const NEWS_TYPE = {
    news: 0,
    event: 1,
    maintenance: 2,
    trouble: 3,
    patch: 4,
    other: 5, 
  }

class LineageMSiteReader {

  newsName(type) {
    const name = Object.keys(NEWS_TYPE)[Object.values(NEWS_TYPE).indexOf(type)]
    return type !== NEWS_TYPE.news ? `news_${name}` : 'news';
  }

  newsUrl(name) {
    const BASE_URL = "https://lineagem-jp.com/";
    return `${BASE_URL}${name}`
  }

  filePath(path) {
    const FILEPATH = "/tmp/";
    return `${FILEPATH}${path}`
  }

  constructor(newsType) {
    this.type = Object.keys(NEWS_TYPE)[Object.values(NEWS_TYPE).indexOf(newsType)]
    this.name = this.newsName(newsType);
    this.url = this.newsUrl(this.name);
    // console.log(this.type)
    // console.log(this.name)
    // console.log(this.url)
  }

  async getNewsContent(url) {
    const body = await axios.get(url);
    return body.data;
  } 

  async parseNewContent(contentBody) {
    const $ = cheerio.load(contentBody);
    const pairs = $('.newsListTable tbody tr').map((i, el) => {
      return {
        date: $(el).find('.table__cellDate').text(),
        new: $(el).find('.table__cellTag span').text(),
        text: $(el).find('.table__cellTitle a').text(),
        url: $(el).find('.table__cellTitle a').attr('href'),
      }
    });
    return pairs.toArray();
  }

  async readOldContent(contentName) {
    let oldContent = "";
    try {
      oldContent = await fs.readFileSync(this.filePath(contentName), 'utf-8');
    } catch (error) {
      oldContent = "";
    }
    return oldContent;
  }

  async writeOldContent(contentName, content) {
    // console.log(contentName)
    await fs.writeFileSync(this.filePath(contentName), content, 'utf-8');
  } 

  diffNewsJson(oldContent, newContent) {
    const result = newContent.filter(newEl => {
        if (newEl.new !== 'NEW') {
          return false;
        }
        return (oldContent.find(oldEl => newEl.url === oldEl.url) === undefined);
    }); 
    return result;
  }

  async getUpdateNewsInfo() {
    const contentBody = await this.getNewsContent(this.url);
    const newContent = await this.parseNewContent(contentBody);
    const newContentString = JSON.stringify(newContent, null, '\t');
    const oldContentString = await this.readOldContent(this.name);
    if (oldContentString === "") {
      this.writeOldContent(this.name, newContentString);
      return [];
    }
    const diff = this.diffNewsJson(JSON.parse(oldContentString), newContent);
    if (diff.length > -1) {
      fs.writeFileSync(this.name, newContentString, 'utf-8');
    }
    return diff;
  }
}

module.exports = {NEWS_TYPE, LineageMSiteReader};