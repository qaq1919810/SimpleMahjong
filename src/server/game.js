const ws = require("ws")

// 导入判断是否和牌函数
const {isWin} = require("./isWin")

let readyCards = []
// 当前庄家用户ID
let bankerUser
// 用户持有的牌，Map<userId, card[]>
let userNowCards = new Map()
// 准备出牌用户
let readyRemoveCardUser

let inGame = true

// ========================================
// 🀄 麻将牌排序权重表
// ========================================
const tileOrder = new Map()
sortingWeight()


function playGame(cards, userIDMap) {
    // 告诉用户是否在游戏内
    setInterval(() => {
        const msg = JSON.stringify({ type: "inGame", inGame: inGame })
        for (const [, socket] of userIDMap.entries()) {
            if (socket.readyState === ws.OPEN) {
                socket.send(msg)
            }
        }
    }, 50)

    // 给所有人广播剩余牌数及各自手牌
    setInterval(() => {
        const msg = JSON.stringify({ type: "nowCardValue", content: readyCards.length })
        for (const [userId, socket] of userIDMap.entries()) {
            if (socket.readyState === ws.OPEN) {
                socket.send(msg)
                const handCards = userNowCards.get(userId) || []
                const handMsg = JSON.stringify({ type: "myCard", content: handCards })
                socket.send(handMsg)
                // 判断是否和牌
                if(isWin(handCards,tileOrder)){
                    console.log(`${userId}和牌,游戏结束`)
                }else {
                    console.log("无人和牌")
                }
            }
        }
    }, 500)

    // 洗牌
    readyCards = shuffle([...cards])
    // 决定庄家
    banker(userIDMap)
    // 给每个玩家发13张牌
    for (const [userId, socket] of userIDMap) {
        cardAdd(userId, socket, 13)
    }
    // 庄家准备出牌
    readyRemoveCardUser = bankerUser
    // 通知庄家先出牌（第一次调用）
    playCardInOrder(userIDMap)
}

/*=====================================================================================================================*/

/**
 * 监听客户端消息
 */
function sendSocketObj(socket, userIDMap, userIDMapReverse) {
    socket.on('message', message => {
        const msg = JSON.parse(message)
        switch (msg.type) {
            case "playCard":
                // 验证是否轮到该玩家出牌
                const thisUserId = userIDMapReverse.get(socket)
                if (thisUserId !== readyRemoveCardUser) {
                    console.warn(`用户 ${thisUserId} 非法出牌，当前轮到 ${readyRemoveCardUser}`)
                    return // 非法出牌直接忽略
                }
                // 移除该牌
                const removed = cardRemove(thisUserId, msg.content)
                if (!removed) {
                    console.warn(`用户 ${thisUserId} 出牌失败，牌 ${msg.content} 不存在`)
                    return
                }

                // 给下一位玩家发牌（1张）
                const userIds = Array.from(userIDMap.keys())
                const currentIndex = userIds.indexOf(readyRemoveCardUser)
                const nextIndex = (currentIndex + 1) % userIds.length
                readyRemoveCardUser = userIds[nextIndex]
                const nextUserSocket = userIDMap.get(readyRemoveCardUser)
                cardAdd(readyRemoveCardUser, nextUserSocket, 1)

                // 通知下一位出牌
                playCardInOrder(userIDMap)
                break
        }
    })
}


/**
 * 给用户发牌
 */
function cardAdd(userId, socket, num = 1) {
    const cards = readyCards.splice(0, num)
    const existing = userNowCards.get(userId) || []
    const newHand = [...existing, ...cards]
    const sortedHand = sortCards(newHand)
    userNowCards.set(userId, sortedHand)
    console.log(`发给用户 ${userId} 的牌`, cards)
    console.log(`用户 ${userId}，剩余牌：`, userNowCards.get(userId))
    console.log('剩余牌数:', readyCards.length)
}

/**
 * 从用户手牌移除指定牌
 */
function cardRemove(userId, card) {
    const hand = userNowCards.get(userId)
    if (!hand) return false
    const index = hand.indexOf(card)
    if (index === -1) return false
    hand.splice(index, 1)
    userNowCards.set(userId, hand)
    console.log(`用户 ${userId} 打出牌 ${card}，剩余牌：`, hand)
    return true
}

/**
 * 通知当前玩家出牌
 */
function playCardInOrder(userIdMap) {
    const nowSocket = userIdMap.get(readyRemoveCardUser)
    if (nowSocket && nowSocket.readyState === ws.OPEN) {
        nowSocket.send(JSON.stringify({
            type: 'readyPlay',
            content: 'playCard'
        }))
        console.log(`通知用户 ${readyRemoveCardUser} 出牌`)
    } else {
        console.warn(`用户 ${readyRemoveCardUser} 不在线或连接不可用`)
    }
}

/**
 * 定庄家函数，广播庄家ID，并给庄家发一张额外牌
 */
function banker(users) {
    const userIds = Array.from(users.keys())
    const rolls = userIds.map(() => Math.floor(Math.random() * 12) + 1)
    let maxPoint = -Infinity
    let bankerIndex = -1
    for (let i = 0; i < rolls.length; i++) {
        if (rolls[i] > maxPoint) {
            maxPoint = rolls[i]
            bankerIndex = i
        }
    }
    bankerUser = userIds[bankerIndex]
    const bankerMsg = JSON.stringify({ type: "banker", content: bankerUser })
    for (const socket of users.values()) {
        if (socket.readyState === ws.OPEN) {
            socket.send(bankerMsg)
        }
    }
    console.log(`确定庄家为 ${bankerUser}，点数为 ${maxPoint}`)
    const bankerSocket = users.get(bankerUser)
    cardAdd(bankerUser, bankerSocket, 1)
}

/**
 * 洗牌算法
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
}

function sortingWeight() {
    // 万牌：一万 ~ 九万（100~108）
    "一二三四五六七八九".split('').forEach((ch, i) => {
        tileOrder.set(`${ch}万`, i + 100)
    })
// 筒牌：一筒 ~ 九筒（200~208）
    "一二三四五六七八九".split('').forEach((ch, i) => {
        tileOrder.set(`${ch}筒`, i + 200)
    })
// 条牌：一条 ~ 九条（300~308）
    "一二三四五六七八九".split('').forEach((ch, i) => {
        tileOrder.set(`${ch}条`, i + 300)
    })
// 风牌：东南西北风（400~403）
    "东南西北".split('').forEach((ch, i) => {
        tileOrder.set(`${ch}风`, i + 400)
    })
// 三元牌（红中、发财、白板）
    tileOrder.set("红中", 501)
    tileOrder.set("发财", 502)
    tileOrder.set("白板", 503)
// 花牌
    "春夏秋冬梅兰菊竹".split('').forEach((ch, i) => {
        tileOrder.set(ch, i + 600)
    })
}

/**
 * 排序函数：根据 tileOrder 中的权重进行排序
 */
function sortCards(cards) {
    return cards.slice().sort((a, b) => {
        return (tileOrder.get(a) || 9999) - (tileOrder.get(b) || 9999)
    })
}

module.exports = {
    playGame,
    sendSocketObj
}
