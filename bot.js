const tmi = require('tmi.js');
const express = require('express');
const app = express();
app.engine('html', require('ejs').renderFile);
const credentials = require('./credentials.json');
const config = require('./config.json')


const {useTwitch,useYoutube,botName,admins,gmEnabled,bottomEnabled,magicGirlEnabled,httpPort} = config
let mahjongStart = false
let mahjongQueue = []
let gmed = []
let bottoms = []
let magicGirls = []


// http request queue
app.get('/mah/queue', (req, res) => {
  return res.json(mahjongQueue)
})

app.get('/mah/overlay', function(req, res){
  return res.render(__dirname+'/overlay.html',{port:httpPort});
});

app.listen(httpPort, () => {
  console.log(`HTTP server listening on port ${httpPort}`)
})




// tmi client

if (useTwitch){

const client = new tmi.Client({
  options: { debug: true },
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: credentials,
  channels: ['kioma_avalon'], // 想加入的聊天室
});

client.connect();
client.on('message', (channel, tags, message, self) => {
    // console.log(channel,tags,message,self)
  if (self) return;


 // messages
 if (gmEnabled && message.toLowerCase().includes('早早') | message.toLowerCase().includes('早晨') ) {
  console.log(gmed)
  if (!gmed.includes(tags['display-name'])){
    client.say(channel, `(${botName}) 早早呀 @${tags['display-name']} kiomaaHappy `);
    gmed.push(tags['display-name'])
  }
} else if (gmEnabled && message.toLowerCase().includes('good morning')) {
  if (!gmed.includes(tags['display-name'])){
    client.say(channel, `(${botName}) Good Morning @${tags['display-name']} kiomaaHappy `);
    gmed.push(tags['display-name'])
  }
} else if (gmEnabled && message.toLowerCase().includes('おはよ')) {
  if (!gmed.includes(tags['display-name'])){
    client.say(channel, `(${botName}) おはよう @${tags['display-name']} kiomaaHappy `);
    gmed.push(tags['display-name'])
  }
}


 if (bottomEnabled && message.toLowerCase().includes('總受') && !admins.includes(tags.username)) {
  if (!bottoms.includes(tags['display-name'])){
      client.say(channel, `(${botName}) @${tags['display-name']} 你才總受，你全家都總受 kiomaaAngry`);
      bottoms.push(tags['display-name'])
  }
  }

  if (magicGirlEnabled && message.toLowerCase().includes('魔法少女') && !admins.includes(tags.username)) {
    if (!magicGirls.includes(tags['display-name'])){
      client.say(channel, `(${botName}) @${tags['display-name']} 你才魔法少女，你全家都魔法少女 kiomaaAngry`);
      magicGirls.push(tags['display-name'])
    }
  }
  

  // mod only
  if (message.toLowerCase() == '!chat.gmon' && admins.includes(tags.username)){
    gmEnabled = true
    client.say(channel, `(${botName}) GM enabled`);
  }

  if (message.toLowerCase()  == '!chat.gmoff' && admins.includes(tags.username)){
    gmEnabled = false
    client.say(channel, `(${botName}) GM disabled`);
  }

  if (message.toLowerCase()  == '!chat.bton' && admins.includes(tags.username)){
    bottomEnabled = true
    client.say(channel, `(${botName}) BT enabled`);
  }

  if (message.toLowerCase()  == '!chat.btoff' && admins.includes(tags.username)){
    bottomEnabled = false
    client.say(channel, `(${botName}) BT disabled`);
  }

  if (message.toLowerCase()  == '!chat.mgon' && admins.includes(tags.username)){
    magicGirlEnabled = true
    client.say(channel, `(${botName}) MG enabled`);
  }

  if (message.toLowerCase()  == '!chat.mgoff' && admins.includes(tags.username)){
    magicGirlEnabled = false
    client.say(channel, `(${botName}) MG disabled`);
  }

  
  // Mahjong
  // queue +1
  if (mahjongStart && message.toLowerCase().includes('+1')) {
    if (!mahjongQueue.includes(tags['display-name'])){
        mahjongQueue = [...mahjongQueue, tags['display-name']]
        client.say(channel, `(${botName}) 歡迎 ${tags['display-name']} 加入！目前已排： ${mahjongQueue.join(" ")}`);
    }else{
        client.say(channel,  `(${botName}) ${tags['display-name']} 已排`)
    }
  }


  // mod only 
  // start queue
  if (message.toLowerCase()  == '!mah.start' && admins.includes(tags.username)){
    mahjongQueue = [];
    mahjongStart = true
    client.say(channel, `(${botName}) 已啟動排隊，請留言「+1」進入友人場！ Queue Enabled. Please type "+1" at chat to queue!`);
  }

  // end queue
  if (message.toLowerCase()  == '!mah.end' && admins.includes(tags.username)){
    mahjongStart = false
    client.say(channel, `(${botName}) 已關閉排隊`);
  }

  // check queue status
  if (message.toLowerCase() == '!mah.queue' && admins.includes(tags.username)){
    client.say(channel, `(${botName}) Queue ${mahjongStart?"enabled":"disabled"}, Number of players: ${mahjongQueue.length} / Players: ${mahjongQueue.join(", ")}`);
  }

  // 3ma
  if (message.toLowerCase() == '!mah.3ma' && admins.includes(tags.username)){
    if (mahjongQueue.length < 2){
        client.say(channel, `(${botName}) 不夠人玩啊，目前有 ${mahjongQueue.join(" ")}`);
    }else{
        let p1 = mahjongQueue.shift()
        let p2 = mahjongQueue.shift()
        client.say(channel, `(${botName}) ${p1}和${p2}，請進入友人場`);
    }
  }

  // 4ma
  if (message.toLowerCase() == '!mah.4ma' && admins.includes(tags.username)){
    if (mahjongQueue.length < 3){
        client.say(channel, `(${botName}) 不夠人玩啊，目前有 ${mahjongQueue.join(" ")}`);
    }else{
        let p1 = mahjongQueue.shift()
        let p2 = mahjongQueue.shift()
        let p3 = mahjongQueue.shift()
        client.say(channel, `(${botName}) ${p1}、${p2}和${p3}，請進入友人場`);
    }
  }

  // 5ma
  if (message.toLowerCase() == '!mah.5ma' && admins.includes(tags.username)){
      client.say(channel, `(${botName}) 對唔住喎日麻冇五麻呢樣嘢，最多我咪俾個5ma你囉 <3 `);
  }

  // clear queue
  if (message.toLowerCase() == '!mah.clear' && admins.includes(tags.username)){
    mahjongQueue = [];
    client.say(channel, `(${botName}) 已清除排隊`);
  }

  // add players to queue
  if (message.toLowerCase().includes('!mah.add ') && admins.includes(tags.username)){
    let addNames = message.split(" ")
    addNames.shift()
    mahjongQueue = [...mahjongQueue, ...addNames]
    client.say(channel, `(${botName}) 歡迎 ${addNames.join("、")}加入！ 目前已排： ${mahjongQueue.join(" ")}`);
  }

  // add players to front of queue
  if (message.toLowerCase().includes('!mah.addfront ') && admins.includes(tags.username)){
    let addNames = message.split(" ")
    addNames.shift()
    mahjongQueue = [...addNames, ...mahjongQueue]
    client.say(channel, `(${botName}) 歡迎 ${addNames.join("、")}加入！ 目前已排： ${mahjongQueue.join(" ")}`);
  }

   // remove player by name
  if (message.toLowerCase().includes('!mah.remove ') && admins.includes(tags.username)){
    let removeNames = message.split(" ")
    removeNames.shift()

    removeNames.forEach(removeName => {
      let index = mahjongQueue.indexOf(removeName);
      if (index !== -1) {
          mahjongQueue.splice(index, 1);
      }
    });
    client.say(channel, `(${botName}) 已移除參加者，目前已排： ${mahjongQueue.join(" ")}`);
  }

  // remove nth player
  if (message.toLowerCase().includes('!mah.removeidx ') && admins.includes(tags.username)){
    let removeIndexes = message.split(" ")
    removeIndexes.shift()
    removeIndexes.forEach(removeIndex => {
      let index = Number.parseInt(removeIndex)
      if (!Number.isNaN(index)) {
          mahjongQueue.splice(index, 1);
      }
    });
    client.say(channel, `(${botName}) 已移除參加者，目前已排： ${mahjongQueue.join(" ")}`);
  }
});
}

