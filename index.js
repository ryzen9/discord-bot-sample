require('dotenv').config();
const cron = require('node-cron');
const Discord = require('discord.js');
const client = new Discord.Client();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class LineageMSiteReader {
  static NEWS_TYPE = {
    news: 1,
    event: 2,
    maintenance: 3,
    trouble: 4,
    patch: 5,
    other: 6, 
  }

  newsName(type) {
    const name = Object.keys(LineageMSiteReader.NEWS_TYPE)[Object.values(LineageMSiteReader.NEWS_TYPE).indexOf(type)]
    return type !== LineageMSiteReader.NEWS_TYPE.news ? `news_${name}` : 'news';
  }

  newsUrl(name) {
    const BASE_URL = "https://lineagem-jp.com/";
    return `${BASE_URL}${name}`
  }

  constructor(newsType) {
    this.type = Object.keys(LineageMSiteReader.NEWS_TYPE)[Object.values(LineageMSiteReader.NEWS_TYPE).indexOf(newsType)]
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
      oldContent = await fs.readFileSync(contentName, 'utf-8');
    } catch (error) {
      oldContent = "";
    }
    return oldContent;
  }

  async writeOldContent(contentName, content) {
    console.log(contentName)
    await fs.writeFileSync(contentName, content, 'utf-8');
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
    if (diff.length > 0) {
      fs.writeFileSync(this.name, newContentString, 'utf-8');
    }
    return diff;
  }
}

function list() {
  let content;
  try {
    content = fs.readFileSync('news_maintenance', 'utf-8')
  } catch (error) {
    content = "newsなし";
  }
  return content;
}

// const reader = new LineageMSiteReader(LineageMSiteReader.NEWS_TYPE.news);
const reader = new LineageMSiteReader(LineageMSiteReader.NEWS_TYPE.maintenance);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    cron.schedule('0 0 * * * *', () => {
        console.log("news取得!");
        client.channels.fetch("739866379401953354").then(channel => {
          reader.getUpdateNewsInfo().then((result) => {
            if (result.length !== 0) {
              channel.send(JSON.stringify(result));
            }
          });
        });
    });
});

function pp(list) {
}

client.on('message', msg => {
    if (msg.content === 'news') {
        msg.reply(list())
    } else if (msg.content === 'get_news') {
      reader.getUpdateNewsInfo().then((result) => {
        // console.log(result);
        // console.log("---");
        // console.log(msg);
        console.log(result)
        if (result.length !== 0) {
          msg.reply(JSON.stringify(result));
        } else {
          msg.reply("newsなし");
        }
      });
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);

