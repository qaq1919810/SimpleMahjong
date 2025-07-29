const WebSocket = require("ws")
const fs = require("node:fs")
// 导入开始游戏函数
const { playGame } = require("./game")
const { sendSocketObj } = require("./game")

// 存储牌
const cards = JSON.parse(fs.readFileSync("../Config/cards.json", "utf-8"))
// 存储配置文件
const PORT = JSON.parse(fs.readFileSync("../Config/config.json", "utf-8")).server.PORT

// 存储用户id
const userIDMap = new Map()
// 反向存储 socket -> userId
const userIDMapReverse = new Map()

// noinspection JSUnresolvedReference
const ws = new WebSocket.Server({ port: PORT }, () => {
    console.log(`服务已启用,端口为${PORT}`)
})

let sendUsersTimer = null
let gameStarted = false

// noinspection JSUnresolvedReference
ws.on("connection", socket => {
    console.log("有用户连接")

    // 只调用一次，重复连接不会重复启动定时器
    sendUsersAndPlayGame(socket)

    // 连接
    socket.on("message", message => {
        const msg = JSON.parse(message)
        switch (msg.type) {
            case "register":
                userIDMap.set(msg.id, socket)
                userIDMapReverse.set(socket, msg.id)
                getUserIDAll()
                // 传输对象到game.js
                sendSocketObj(socket, userIDMap,userIDMapReverse)
                break
        }
    })

    // 断开
    socket.on("close", () => {
        console.log("有用户断开")

        setTimeout(() => {
            const userIdToRemove = userIDMapReverse.get(socket)
            if (userIdToRemove) {
                // 确认当前映射依然是这个断开的 socket（用户10秒内没重连）
                if (userIDMap.get(userIdToRemove) === socket) {
                    userIDMap.delete(userIdToRemove)
                    userIDMapReverse.delete(socket)
                    console.log(`用户 ${userIdToRemove} 超时未重连，已从列表中移除`)
                }
            }
        }, 10000)
    })
})

/*========================================================================================================================*/

// 发送当前所有人数和开始游戏
function sendUsersAndPlayGame() {
    if (sendUsersTimer) return // 已经启动，跳过

    sendUsersTimer = setInterval(() => {
        const msg = JSON.stringify({
            type: "userState",
            content: `当前人数[${userIDMap.size}]人`
        })
        for (const socket of userIDMap.values()) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(msg)
            }
        }

        // 开始游戏
        if (userIDMap.size === 4 && !gameStarted) {
            gameStarted = true
            clearInterval(sendUsersTimer)
            sendUsersTimer = null

            setTimeout(() => {
                console.log("开始游戏")
                playGame(cards, userIDMap)
            }, 3000)
        }
    }, 100)
}

// 打印所有用户的状态
function getUserIDAll() {
    console.log("------------------------------------------------------------------------------")
    for (const [key, socket] of userIDMap.entries()) {
        const status = switchy(socket.readyState)
        console.log(`用户: ${key}\n状态: ${status}\n`)
    }
    console.log("------------------------------------------------------------------------------")

    // 状态解析
    function switchy(a) {
        switch (a) {
            case 0:
                return "正在连接中"
            case 1:
                return "已连接并可以通信"
            case 2:
                return "连接正在关闭中"
            case 3:
                return "连接已关闭或连接失败"
            default:
                return "未知状态"
        }
    }
}

// 测试用用户连接状态用
// setInterval(() => {
//     getUserIDAll()
// }, 1000)
