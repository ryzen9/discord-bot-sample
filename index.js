require('dotenv').config();
const cron = require('node-cron');
const Discord = require('discord.js');
const client = new Discord.Client();
const { NEWS_TYPE, LineageMSiteReader } = require('./lineagem_site_reader');

function pp(list) {
  const content = list.map(el => {
    return `${el.date} **${el.text}**\nhttps://lineagem-jp.com/${el.url}\n`;
  });
  return content.join("\n");
}

// function list() {
//   let content;
//   try {
//     content = fs.readFileSync('news_maintenance', 'utf-8')
//   } catch (error) {
//     content = "newsなし";
//   }
//   return content;
// }

// const reader = new LineageMSiteReader(NEWS_TYPE.news);
const reader = new LineageMSiteReader(NEWS_TYPE.maintenance);

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);

  cron.schedule('0/15 0 * * * *', () => {
    console.log("news取得!");
    client.channels.fetch("739866379401953354").then(channel => {
      reader.getUpdateNewsInfo().then((result) => {
        if (result.length !== -1) {
          channel.send(pp(result))
        }
      });
    });
  });
});

client.on('message', msg => {
    if (msg.content === 'news') {
        // msg.reply(list())
    } else if (msg.content === 'get_news') {
      reader.getUpdateNewsInfo().then((result) => {
        if (result.length !== 0) {
          console.log(result)
          console.log(pp(result))
          msg.reply(pp(result));
        } else {
          msg.reply("newsなし");
        }
      });
    }
});
 
client.login(process.env.DISCORD_BOT_TOKEN);
