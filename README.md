# 友人場排隊Bot - Mahjong Queue Bot
## By Kioma Avalon

## Install
1. Install Node.js (v20.16.0) from https://nodejs.org/
2. Open cmd in MahjongQueue folder, enter "npm install"
3. Change credentials_example.json to credentials.json and enter your twitch credentials (Get OAuth token here: https://twitchapps.com/tmi/)

## Run
Click "start.bat" to run server
Alternatively, enter "node bot.js" in cmd

## Config
``
{
"httpPort":3001,
"useTwitch":true,
"useYoutube":true,
"botName":"(Bot name)",
"admins":["twitch admin usernames"],
"twitchChannels":["twitch channel username for bot to chat"],
"youtubeAdmins":["youtube admin channel ids"],
"youtubeChannelId":"youtube channel for fetch chat",
"useTwitchForYoutubeMessage": (boolean, whether send message to twitch after fetching youtube messages),
}
``

## Mahjong Commands
- !mah.start                Enable Mahjong queue, queue viewers when +1 is included in chat messages
- !mah.end                  Disable Mahjong queue
- !mah.add (names)          Add names to queue, separated by space
- !mah.addfront (names)     Add names to front of queue, separated by space
- !mah.remove (names)       Remove names from queue, separated by space
- !mah.removeidx (integers) Remove nth names from queue, starting from 0
- !mah.clear                Remove all names from queue
- !mah.3ma                  Play 3-player mahjong game, remove 2 players from queue
- !mah.4ma                  Play 4-player mahjong game, remove 3 players from queue
- !mah.5ma                  5ma
- !mah.queue                Check queue status
- !mah.clearmessage         Clear HTML message box


## Auto reply
Automatically reply chat messages on Twitch 
Youtube chat messages could only be replied on Twitch, you may redirect messages to Youtube if you are using Restream.io

## Auto reply settings
```
 {
    "defaultOn":(boolean), // whether enable auto reply for this type of message when start
    "ignoreAdmin":(boolean), // whether ignore auto reply when admin posted message with certain word 
    "oneTime":(boolean), // whether auto reply should once respond once per person
    "type":"(sometype)", // type name of message
    "message":"some words", // message which will trigger auto reply
    "reply":"早早呀 {name} kiomaaHappy", // reply message, add {name} to replace to viewer, add {count} for message count 
    "skip":(boolean), // skip message if true, used in cases when "ab" should be skipped but "a" should be responded, make sure to put "ab" on top of "a" to skip
    "sound": "path of sound", // path of sound to play when triggered, put all sound in /sound folder
    "soundCooldown": (number) // number of seconds of cooldown time of triggering sound, no cooldown time if zero or not available
},
```

## Auto reply commands
- !chat.enable (types)      Enable auto reply for types of messages, separated by spaces
- !chat.disable (types)     Disable auto reply for types of messages, separated by spaces
- !chat.reset (types)       Reset message count and viewer list for messages (e.g. clear name list and reset count to 0 for given message types)