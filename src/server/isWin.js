// 判断是否和牌
function isWin(cards, tileOrder) {
    let nums = cards.map(c => tileOrder.get(c)).sort((a, b) => a - b)
    // 先判断全对子情况
    if (checkAllPairs(nums)) return true

    // 递归判断
    return tryHu(nums)
}

// 检查是否全对子(全部是对子，没有顺子和刻子)
function checkAllPairs(nums) {
    if (nums.length % 2 !== 0) return false
    for (let i = 0; i < nums.length; i += 2) {
        if (nums[i] !== nums[i + 1]) return false
    }
    return true
}

// 递归函数尝试拆牌组成胡牌
function tryHu(nums) {
    if (nums.length === 0) return true  // 全部拆完即胡牌

    // 找对子做将牌
    for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i] === nums[i + 1]) {
            // 找到将牌，去掉这两张牌
            const rest = nums.slice(0, i).concat(nums.slice(i + 2))
            if (tryMelds(rest)) {
                return true
            }
        }
    }
    return false  // 找不到有效将牌拆完胡牌失败
}

// 递归判断剩余牌是否能全部拆为顺子或刻子
function tryMelds(nums) {
    if (nums.length === 0) return true

    const first = nums[0]

    // 1. 判断四张牌（杠），拆成刻子+剩余一张 或 拆成两个对子
    if (nums.length >= 4 && nums[1] === first && nums[2] === first && nums[3] === first) {
        // 尝试刻子（三张）+剩余一张
        let rest1 = nums.slice(4)
        if (tryMelds(rest1.concat([first]))) return true

        // 尝试拆成两个对子
        let rest2 = nums.slice(4)
        if (tryMelds(rest2.concat([first, first]))) return true
    }

    // 2. 判断刻子（三张一样）
    if (nums.length >= 3 && nums[1] === first && nums[2] === first) {
        const rest = nums.slice(3)
        if (tryMelds(rest)) return true
    }

    // 3. 判断顺子（三张连续）
    if (first < 400) { // 万筒条有顺子
        const secondIndex = nums.indexOf(first + 1)
        const thirdIndex = nums.indexOf(first + 2)
        if (secondIndex !== -1 && thirdIndex !== -1) {
            const rest = nums.filter((v, idx) => idx !== 0 && idx !== secondIndex && idx !== thirdIndex)
            if (tryMelds(rest)) return true
        }
    }

    return false
}


module.exports = {
    isWin
}
