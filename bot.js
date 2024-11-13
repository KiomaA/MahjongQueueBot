import tmi from 'tmi.js';
import express from 'express';
import ejs from 'ejs'
const app = express();
app.engine('html', ejs.renderFile);
import credentials from './credentials.json' assert { type: "json" };
import config from './config.json' assert { type: "json" };
import {LiveChat} from 'youtube-chat'
import crypto from 'crypto'
import autoreply from './autoreply.json' assert { type: "json" };
import {playAudioFile} from 'audic'
import path from 'path';

const __dirname = path.resolve();

const {useTwitch,useYoutube,youtubeChannelId,useTwitchForYoutubeMessage,botName,admins,youtubeAdmins,httpPort,twitchChannels, skipTwitchChannels, skipYoutubeChannels} = config
let mahjongStart = false
let mahjongQueue = []

let gmEnabled = config.gmEnabled;
let bottomEnabled = config.bottomEnabled;
let magicGirlEnabled =  config.magicGirlEnabled;

let message = ""
let messageId = ""
let twitchChannel = twitchChannels[0]

// tmi client
const client = new tmi.Client({
  options: { debug: true },
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: credentials,
  channels: twitchChannels, // 想加入的聊天室
});

const connectTwitch = async() =>{
    await client.connect();
}



// youtube livechat
const liveChat = new LiveChat({channelId: youtubeChannelId});
let fetchTime = new Date()

const replyEnable = []
const replyList = {}
const replyCount = {}
const soundTime = {}

// add default enabled replies
for (const reply of autoreply) {
  if (reply.defaultOn){
    if(!replyEnable.includes(reply.type)) replyEnable.push(reply.type);
  }
}

console.log("Enabled chat replies: ",replyEnable)

const connectYoutube = async ()=>{
  try {
    const ok = await liveChat.start()
    console.log("youtube connected")
  } catch (error) {
    console.log("fetch youtube error")
    console.log(error)
  }
}

const disconnectYoutube = async ()=>{
  try {
    const ok = await liveChat.stop()
    console.log("youtube disconnected")
  } catch (error) {
    console.log("disconnect youtube error")
    console.log(error)
  }
}


// http request queue
app.get('/mah/queue', (req, res) => {
  return res.json({queue:mahjongQueue, message:message, messageId:messageId})
})

app.get('/mah/overlay', function(req, res){
  return res.render(__dirname+'/overlay.html',{port:httpPort});
});

app.listen(httpPort, () => {
  console.log(`HTTP server listening on port ${httpPort}`)
  console.log(`GET queue JSON: http://localhost:3001/mah/queue`)
  console.log(`HTML/OBS overlay: http://localhost:3001/mah/overlay`)
})


// send message
function sendMessage(mes,useTwitch,twitchClient,twitchChannel){
  message = mes;
  messageId = crypto.randomUUID();
  
  if (useTwitch){
    twitchClient.say(twitchChannel, `(${botName}) `+message);
  }
}

//if (useTwitch){
client.on('message', (channel, tags, message, self) => {
  console.log(channel,tags,message,self)
  if (self) return;
   // messages

   // skip channels
   if (skipTwitchChannels.includes(tags.username)) return;

  // auto reply
  for (const reply of autoreply) {
    // parse message
    if (message.toLowerCase().includes(reply.message)){
      // ignore admin if ignore admin flag is on
      if (reply.ignoreAdmin && admins.includes(tags.username)) break;

      // check if message should be skipped
      if (!replyEnable.includes(reply.type)) break;
      if (reply.skip) break;

      if (reply.oneTime){
        // check if person has already sent same message if one time flag is on
        if (!replyList[reply.type])  replyList[reply.type] = [];
        if (replyList[reply.type].includes(tags['display-name'])) break;
        replyList[reply.type].push(tags['display-name'])
      }

      // parse message
      let replyMessage = reply.reply;
      replyMessage = replyMessage.replaceAll("{name}", tags['display-name']);
      if (replyMessage.includes("{count}")){
        if (!replyCount[reply.type]) replyCount[reply.type] = 0;
        replyCount[reply.type]++;
        replyMessage = replyMessage.replaceAll("{count}", replyCount[reply.type]);
      }
      
      client.say(channel, `(${botName}) ${replyMessage}`);

      // play audio
      if (reply.sound){
        // check cooldown time
        let playsound = true;
        if (reply.soundCooldown){
          if (!soundTime[reply.type]){
            soundTime[reply.type] = new Date().getTime() / 1000;
          }else{
            let nowSeconds = new Date().getTime() / 1000;
            if (nowSeconds - soundTime[reply.type] < reply.soundCooldown) {
              playsound = false;
              soundTime[reply.type] = nowSeconds;
              console.log(`play sound in cooldown: ${reply.soundCooldown -(nowSeconds - soundTime[reply.type])} s remaining`)
            }
          }
        }        
        if (playsound){
          playAudioFile('./sound/'+reply.sound);
        }
      }
      break;
    }
  }

 
  // mod only
  if (admins.includes(tags.username)){
    console.log("admin")
    if (message.toLowerCase().includes("!chat.enable ")){
      // enable message type
      console.log("enable")
      let types = message.split(" ")
      types.shift();
      for (const typ of types) {
        if (!replyEnable.includes(typ)) replyEnable.push(typ);
      }
      client.say(channel, `(${botName}) Enabled ${types.join(" ")}, currently enabled: ${replyEnable.join(" ")}`);
    }

    if (message.toLowerCase().includes("!chat.disable ")){
      // enable message type
      let types = message.split(" ")
      types.shift();
      for (const typ of types) {
        let index = replyEnable.indexOf(typ);
        if (index !== -1) {
          replyEnable.splice(index, 1);
        }
      }  
      client.say(channel, `(${botName}) Disabled ${types.join(" ")}, currently enabled: ${replyEnable.join(" ")}`);    
    }

    if (message.toLowerCase().includes("!chat.reset ")){
      // reset name list and count
      let types = message.split(" ")
      types.shift();
      for (const typ of types) {
        replyCount[typ] = 0;
        replyList[typ] = [];
      }   
      client.say(channel, `(${botName}) Reset ${types.join(" ")}`);   
    }

  }


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

  // connect to youtube
  if (message.toLowerCase()  == '!yt.connect' && admins.includes(tags.username)){
    client.say(channel, `(${botName}) Connecting to Youtube livechat...`);
    connectYoutube();
  }

  // connect to youtube
  if (message.toLowerCase()  == '!yt.disconnect' && admins.includes(tags.username)){
    client.say(channel, `(${botName}) Disconnecting Youtube livechat...`);
    disconnectYoutube();
  }

  
  // Mahjong
  // queue +1
  if (mahjongStart && message.match(/[+|＋][1|１]/)) {
    if (!mahjongQueue.includes(tags['display-name'])){
        mahjongQueue = [...mahjongQueue, tags['display-name']]
        client.say(channel, `(${botName}) 歡迎 ${tags['display-name']} 加入！目前已排： ${mahjongQueue.join(" ")}`);
        sendMessage(`歡迎 ${tags['display-name']} 加入！`, false);
    }else{
        client.say(channel,  `(${botName}) ${tags['display-name']} 已排`)
    }
  }

  // mod only 
  // start queue
  if (message.toLowerCase()  == '!mah.start' && admins.includes(tags.username)){
    mahjongQueue = [];
    mahjongStart = true
    sendMessage(`已啟動排隊，請留言「+1」進入友人場！ Queue Enabled. Please type "+1" at chat to queue!`,true,client,channel);
    // client.say(channel, `(${botName}) 已啟動排隊，請留言「+1」進入友人場！ Queue Enabled. Please type "+1" at chat to queue!`)}
  }

  // end queue
  if (message.toLowerCase()  == '!mah.end' && admins.includes(tags.username)){
    mahjongStart = false
    sendMessage(`已關閉排隊 Queue Disabled`, true, client, channel)
    // client.say(channel, `(${botName}) 已關閉排隊`);
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
        sendMessage(`${p1}和${p2}，請進入友人場`, true, client, channel)
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
        // client.say(channel, `(${botName}) ${p1}、${p2}和${p3}，請進入友人場`);
        sendMessage(`${p1}、${p2}和${p3}，請進入友人場`, true, client, channel)
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
    sendMessage(`歡迎 ${addNames.join("、")}加入！`, false);
    client.say(channel, `(${botName}) 歡迎 ${addNames.join("、")}加入！ 目前已排： ${mahjongQueue.join(" ")}`);
  }

  // add players to front of queue
  if (message.toLowerCase().includes('!mah.addfront ') && admins.includes(tags.username)){
    let addNames = message.split(" ")
    addNames.shift()
    mahjongQueue = [...addNames, ...mahjongQueue]
    sendMessage(`歡迎 ${addNames.join("、")}加入！`, false);
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

  // clear message
  if (message.toLowerCase().includes('!mah.clearmessage') && admins.includes(tags.username)){
    message = ""
    messageId = crypto.randomUUID()
  }
  });
//}

liveChat.on("chat", (chatItem) => {
    // process new messages only
    if (chatItem.timestamp >= fetchTime){   
      console.log(chatItem.message)
      if (chatItem.message[0]){
        if (chatItem.message[0].text){
          let message = chatItem.message[0].text
        } else{
          let message = "";
        }      
      }else {
        let message = "";
      }
      let username = chatItem.author.name
      let channelId = chatItem.author.channelId

      // skip channels
      if (skipYoutubeChannels.includes(channelId)) return;

      // auto reply
      for (const reply of autoreply) {
        // parse message
        if (message.toLowerCase().includes(reply.message)){
          // ignore admin if ignore admin flag is on
          if (reply.ignoreAdmin && admins.includes(tags.username)) break;
        
          // check if message should be skipped
          if (!replyEnable.includes(reply.type)) break;
          if (reply.skip) break;
        
          if (reply.oneTime){
            // check if person has already sent same message if one time flag is on
            if (!replyList[reply.type])  replyList[reply.type] = [];
            if (replyList[reply.type].includes(username)) break;
            replyList[reply.type].push(username)
          }
        
          // parse message
          let replyMessage = reply.reply;
          replyMessage = replyMessage.replaceAll("{name}", username);
          if (replyMessage.includes("{count}")){
            if (!replyCount[reply.type]) replyCount[reply.type] = 0;
            replyCount[reply.type]++;
            replyMessage = replyMessage.replaceAll("{count}", replyCount[reply.type]);
          }

          if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) ${replyMessage} (fron YT)`);
        
          // play audio
          if (reply.sound){
            // check cooldown time
            let playsound = true;
            if (reply.soundCooldown){
              if (!soundTime[reply.type]){
                soundTime[reply.type] = new Date().getTime() / 1000;
              }else{
                let nowSeconds = new Date().getTime() / 1000;
                if (nowSeconds - soundTime[reply.type] < reply.soundCooldown) {
                  playsound = false;
                  soundTime[reply.type] = nowSeconds;
                  console.log(`play sound in cooldown: ${reply.soundCooldown -(nowSeconds - soundTime[reply.type])} s remaining`)
                }
              }
            }        
            if (playsound){
              playAudioFile('./sound/'+reply.sound);
            }
          }


          break;
        }
      }

      // queue +1
      if (mahjongStart && message.match(/[+|＋][1|１]/)) {
        if (!mahjongQueue.includes(username)){
            mahjongQueue = [...mahjongQueue, username]
            sendMessage(`歡迎 ${username} 加入！`,true,client,twitchChannel);
        }
      }

    // admin command
      if (message.toLowerCase()  == '!mah.start' && youtubeAdmins.includes(channelId)){
        mahjongQueue = [];
        mahjongStart = true
        sendMessage(`已啟動排隊，請留言「+1」進入友人場！ Queue Enabled. Please type "+1" at chat to queue!`,true,client,twitchChannel);
      }

    // end queue
    if (message.toLowerCase()  == '!mah.end' && youtubeAdmins.includes(channelId)){
      mahjongStart = false
      sendMessage(`已關閉排隊 Queue Disabled`, true, client, twitchChannel);
    }

    // 3ma
  if (message.toLowerCase() == '!mah.3ma' && youtubeAdmins.includes(channelId)){
    if (mahjongQueue.length < 2){
      if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) 不夠人玩啊，目前有 ${mahjongQueue.join(" ")}`);
    }else{
        let p1 = mahjongQueue.shift()
        let p2 = mahjongQueue.shift()
        sendMessage(`${p1}和${p2}，請進入友人場`, true, client, twitchChannel);
    }
  }

  // 4ma
  if (message.toLowerCase() == '!mah.4ma' && youtubeAdmins.includes(channelId)){
    if (mahjongQueue.length < 3){
      if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) 不夠人玩啊，目前有 ${mahjongQueue.join(" ")}`);
    }else{
        let p1 = mahjongQueue.shift()
        let p2 = mahjongQueue.shift()
        let p3 = mahjongQueue.shift()
        // client.say(channel, `(${botName}) ${p1}、${p2}和${p3}，請進入友人場`);
        sendMessage(`${p1}、${p2}和${p3}，請進入友人場`, useTwitchForYoutubeMessage, client, twitchChannel);
    }
  }

  // 5ma
  if (message.toLowerCase() == '!mah.5ma' && youtubeAdmins.includes(channelId)){
    if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) 對唔住喎日麻冇五麻呢樣嘢，最多我咪俾個5ma你囉 <3 `);
  }

  // clear queue
  if (message.toLowerCase() == '!mah.clear' && youtubeAdmins.includes(channelId)){
    mahjongQueue = [];
    if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) 已清除排隊`);
  }

  // add players to queue
  if (message.toLowerCase().includes('!mah.add ') && youtubeAdmins.includes(channelId)){
    let addNames = message.split(" ")
    addNames.shift()
    mahjongQueue = [...mahjongQueue, ...addNames]
    sendMessage(`歡迎 ${addNames.join("、")}加入！`, false);
    if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) 歡迎 ${addNames.join("、")}加入！ 目前已排： ${mahjongQueue.join(" ")}`);
  }

  // add players to front of queue
  if (message.toLowerCase().includes('!mah.addfront ') && youtubeAdmins.includes(channelId)){
    let addNames = message.split(" ")
    addNames.shift()
    mahjongQueue = [...addNames, ...mahjongQueue]
    sendMessage(`歡迎 ${addNames.join("、")}加入！`, false);
    if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) 歡迎 ${addNames.join("、")}加入！ 目前已排： ${mahjongQueue.join(" ")}`);
  }

   // remove player by name
  if (message.toLowerCase().includes('!mah.remove ') && youtubeAdmins.includes(channelId)){
    let removeNames = message.split(" ")
    removeNames.shift()

    removeNames.forEach(removeName => {
      let index = mahjongQueue.indexOf(removeName);
      if (index !== -1) {
          mahjongQueue.splice(index, 1);
      }
    });
    if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) 已移除參加者，目前已排： ${mahjongQueue.join(" ")}`);
  }

  // remove nth player
  if (message.toLowerCase().includes('!mah.removeidx ') && youtubeAdmins.includes(channelId)){
    let removeIndexes = message.split(" ")
    removeIndexes.shift()
    removeIndexes.forEach(removeIndex => {
      let index = Number.parseInt(removeIndex)
      if (!Number.isNaN(index)) {
          mahjongQueue.splice(index, 1);
      }
    });
    if (useTwitchForYoutubeMessage) client.say(twitchChannel, `(${botName}) 已移除參加者，目前已排： ${mahjongQueue.join(" ")}`);
  }
  
  // clear message
  if (message.toLowerCase().includes('!mah.clearmessage') && youtubeAdmins.includes(channelId)){
    message = ""
    messageId = crypto.randomUUID()
  }
}
});

liveChat.on('error',async(err)=>{
  console.log("[ERROR] YT Livestream error")
  console.log(err);
  if (useTwitchForYoutubeMessage)  client.say(twitchChannel, `(${botName}) YT Livestream error`);
})


const connectAll = async ()=>{
  if (useTwitch) await connectTwitch();
  if (useYoutube) await connectYoutube();
}

connectAll();




