const fs = require('fs')
const sha1 = require('sha1')
const axios = require('axios')

const { jsonToXml } = require('../utils/xmlTool')

const config = require('../config')

const { token, base_url, appid, secret } = config.wechat

// 文件写入的方式保存access_token
function writeAccessToken(data) {
    return new Promise((resolve) => {
        fs.writeFile('wx_access_token', data, (err) => {
            resolve(!err)
        })
    })
}

// access_token配置
async function accessTokenConfig() {
    // 请求access_token
    const url = `${base_url}cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
    try {
        var { data: { access_token, expires_in } } = await axios.get(url)
    } catch(err) {
        console.log('access_token接口请求失败', err)
    }
    
    const isWriteDown = await writeAccessToken(access_token)
    if (isWriteDown) {
        console.log('access_token更新成功')
    } else {
        console.log('access_token写入失败')
        return
    }

    setTimeout(accessTokenConfig, 5000)

    return access_token
}

// 自定义菜单
async function menuConfig(token) {
    const menuList = config.wechat.menu
    const url = `${base_url}cgi-bin/menu/create?access_token=${token}`

    return axios.post(url, menuList)
}

// 初始化函数
module.exports.init = async function() {
    let access_token = await accessTokenConfig()
    
    let menuRes = await menuConfig(access_token)
    let menuCode = menuRes.data.errcode

    if (menuCode === 0) {
        console.log('自定义菜单成功')
    } else {
        console.log('自定义菜单失败')
    }
}

// 判断是否来自微信公众号
// 来自微信公众号的请求 token验证和公众号消息 都会附带signature, timestamp, nonce三个参数
function isFromWechat({ signature, timestamp, nonce }) {
    return signature && timestamp && nonce
}

// 判断token合法性
function isTokenLegal(token, { timestamp, nonce, signature }) {
    // 将token、timestamp、nonce三个参数进行字典序排序
    let authArr = [ token, timestamp, nonce ].sort()

    // 将三个参数字符串拼接成一个字符串进行sha1加密
    let authSha = sha1(authArr.join(''))

    // 获得加密后的字符串可与signature对比
    return authSha === signature
}

// token验证 处理公众号接受消息
module.exports.main = async function(ctx, next) {
    if (isFromWechat(ctx.query)) {
        if (ctx.method === 'GET') { // Token验证来自微信服务器

            let legal = isTokenLegal(token, ctx.query)

            if (legal) {
                ctx.body = ctx.query.echostr
            } 

        } else { // 处理接收公众号消息的请求
            const reqBody = ctx.request.body
            const msg = reqBody && reqBody.xml

            const result = jsonToXml({
                xml: {
                    ToUserName: msg.FromUserName,
                    FromUserName: msg.ToUserName,
                    CreateTime: Date.now(),
                    MsgType: [ 'news' ],
                    ArticleCount: '1',
                    Articles: {
                        item: {
                            Title:  'Title',
                            Description: 'Description',
                            PicUrl: 'http://cdn.huodongxing.com/file/20150706/11B42C30A65FE22BFBE390B6503E3122BA/30642119764553295.jpeg',
                            Url: 'http://www.baidu.com'
                        }
                    }
                }
            })
            
            ctx.body = result
        }
    } else {
        await next()
    }
}