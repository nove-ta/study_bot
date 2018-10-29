'use strict';
const async = require('neo-async');
const https = require('https');
const request = require("request");

// アクセストークン
const ChannelAccessToken = 'b8xEirAbBcMb9r5INR20TEOfdajqVRrz1rLFpV4KJvXBzIvWkVRjTLjRKinbw+cgO7nCifXtVJqP7HdzCVRpljwRZVthnV/tNyJchulGyJLd3B9ASK2uc/GZ4vbSNgWvpAz6s4/Os5zTRutBlrjKxgdB04t89/1O/w1cDnyilFU='; //チャンネル設定
　
exports.handler = (event, context, callback) => {

    let task = [];
    let id = null;
    let org_message = '';
    let res_message = '';
    let is_send = true;
    
    task.push((next) => {
        // console.log('EVENT:', event);
        const messageData = event.events && event.events[0];
        // console.log(messageData);

        // ID取得
        id = messageData.source.userId;
        if(messageData.source.groupId != null && messageData.source.groupId.length > 0){ //グループからのメッセージ
            id = messageData.source.groupId;
        }
        console.log('userid=' + id);
    
        // メッセージ取得
        org_message = messageData.message.text;
        next(null);
    });
    task.push((next) => {
        const cmds = org_message.replace("　", ' ').split(' ',2);
        // console.log(cmds);

        switch(cmds[0]){
        case 'ハロー':
            {
                res_message = 'こんにちわ';
                next(null);
            }
            break;
        case 'やまびこ':
            {
                res_message = org_message.replace('やまびこ', '');
                res_message = res_message.trim();
                next(null);
            }
            break;
        case '今日の天気':
            getWeather((err, res) => {
                res_message = res;
                next(err);
            });
            break;
        default:
            { 
                is_send = false;
                next(null);
            }
            break;
        }
    });
    task.push((next) => {
        if(!is_send){
            return next(null);
        }

        var postData = JSON.stringify(
        {
            "messages": [{
                "type": "text",
                "text": res_message
            }],
            "to": id
        });
    
        sendResponseMessage(postData);
        console.log("SEND:" + postData);

        next(null);
    });
    async.waterfall(task, (err) => {
        callback(null, 'Success!');
    });
};

// メッセージ送信
const sendResponseMessage = (postData) => {
    
    //リクエストヘッダ
    var options = {
        hostname: 'api.line.me',
        path: '/v2/bot/message/push',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': 'Bearer ' + ChannelAccessToken
            },
        method: 'POST',
    };

    //APIリクエスト
    var req = https.request(options,  function(res){
        res.setEncoding('utf8');
        res.on('data', function (body) {
            console.log(body);
            context.succeed('handler complete');
        });
    }).on('error', function(e) {
        context.done('error', e);
        console.log(e);
    });

    req.on('error', function(e) {
        var message = "通知に失敗しました. LINEから次のエラーが返りました: " + e.message;
        console.error(message);
        context.fail(message);
    });

    req.write(postData);
    req.on('data', function (body) {
        console.log(body);
    });
    req.end();
};

// 天気の取得
const getWeather = (cb) => {

    // 東京の天気取得
    const URL = "http://weather.livedoor.com/forecast/webservice/json/v1";
    let ret = '';
    
    request.get({
        url: URL,
        qs: {
            city: "130010",
        }
    }, (error, response, body) => {
        //console.log(body);
        if(!error){
            const j_body = JSON.parse(body);
            const telop = j_body.forecasts[0].telop;  // 天気
            const desc  = j_body.description.text; // 詳細

            ret  = '今日の天気は' + telop + "\n";
            ret += desc;
        }
        cb(error, ret);
    });
};